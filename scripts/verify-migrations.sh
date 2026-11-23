#!/usr/bin/env bash
# Apply every migration (and the seed, when present) to a throwaway PostgreSQL
# database, then run the SQL tests in supabase/tests/*.test.sql.
#
# Usage: DATABASE_URL=postgresql://user:pass@host:5432/postgres pnpm db:verify
# The database named in DATABASE_URL is used only to create and drop a
# temporary database next to it; nothing else is touched.
set -euo pipefail

: "${VERIFY_DATABASE_URL:=${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}}"
DB="pcforge_verify_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="$VERIFY_DATABASE_URL"
TARGET_URL="${VERIFY_DATABASE_URL%/*}/$DB"

cleanup() { psql "$ADMIN_URL" -qc "drop database if exists $DB with (force)" >/dev/null 2>&1 || true; }
trap cleanup EXIT

psql "$ADMIN_URL" -qc "create database $DB"
run() { psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f "$1"; }

echo "→ Supabase stub"
run "$ROOT/supabase/tests/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  run "$f"
done
if [[ -f "$ROOT/supabase/seed.sql" ]]; then
  echo "→ seed.sql"
  run "$ROOT/supabase/seed.sql"
fi
for f in "$ROOT"/supabase/tests/*.test.sql; do
  [[ -e "$f" ]] || continue
  echo "→ $(basename "$f")"
  run "$f"
done
echo "✓ migrations verified"
