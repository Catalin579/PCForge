# CLAUDE.md

Guidance for AI assistants and contributors working on PCForge. Read this before changing code. Setup, environment variables and deployment are in [README.md](./README.md).

## What PCForge is

A region-aware PC builder: users pick a market (country + currency), browse a component catalog with regional retailer offers, assemble a build with live compatibility checks and totals, and save/share builds. Admins manage the catalog, retailers, offers and compatibility rules.

**MVP scope:** regional selection, catalog, PC builder, compatibility validation, total pricing, saved/shared builds, admin product management.
**Out of scope until the core is done:** payments, scraping, affiliate payouts, advanced recommendations.

## Architecture

```
Browser ──► Next.js App Router (Vercel)
              ├─ Server Components ── read via Supabase server client (user's session, RLS applies)
              ├─ Server Actions / Route Handlers ── validate with Zod ──► service modules ──► Supabase
              ├─ Client Components ── TanStack Query for server state, Zustand for the in-progress build
              └─ middleware.ts ── refreshes the Supabase auth cookie
Supabase ── Postgres (RLS on every table) · Auth (email + OAuth) · Storage (product images, later)
```

Principles:

1. **The database is the source of truth for anything regional or priced.** Never hardcode prices, currencies, tax rates, retailers or region lists in components.
2. **Business logic lives in `src/lib/<domain>/` service modules**, as plain TypeScript with no React or Next imports where possible, so it is unit-testable. Pages and actions are thin.
3. **Validate on the server.** Every Server Action and Route Handler parses its input with Zod. Totals, compatibility results and prices shown after saving are recomputed on the server, never trusted from the client.
4. **RLS is the security boundary**, not UI checks. Use the user-scoped client (`src/lib/supabase/server.ts#createClient`) by default. Use `createAdminClient()` (service role, bypasses RLS) only in trusted server code after an explicit permission check.
5. **Specs are typed JSONB.** `products.specs` is validated by `src/lib/catalog/specs.ts`. If you add or rename a spec key, update the schema, the seed data and the compatibility engine together.

## Folder structure

```
src/
  app/                      Next.js routes (App Router). Route groups by area as they appear:
                            (public) catalog/builder pages, (account), admin/
  components/
    ui/                     shadcn/ui primitives (generated; edit sparingly)
    *.tsx                   app-level components (header, providers, theme toggle)
  lib/
    env.ts                  validated environment variables
    utils.ts                cn() helper
    catalog/specs.ts        Zod spec schemas per category (source of truth for specs JSON)
    supabase/               browser, server and middleware clients; generated database.types.ts
    compatibility/          rule engine: rule-definitions.ts (codes + defaults), rules.ts
                            (implementations), engine.ts (evaluateBuild), power.ts,
                            performance.ts, from-row.ts (DB row → typed component)
    pricing/                money.ts (integer minor units), exchange.ts, tax.ts,
                            offers.ts (quote + rank offers), build-pricing.ts (priceBuild)
    builds/                 evaluate.ts: loads a build's data from Supabase and runs
                            compatibility + pricing server-side; schema.ts (Zod input)
  middleware.ts
supabase/
  config.toml               local Supabase config
  migrations/               SQL migrations (timestamped, append-only)
  seed/data/*.ts            typed seed data (edit these)
  seed.sql                  GENERATED from seed/data by scripts/generate-seed.ts (do not edit)
  tests/                    SQL tests (*.test.sql) and the Supabase stub for plain Postgres
scripts/
  generate-seed.ts          builds seed.sql; `--apply` loads it into $DATABASE_URL
  verify-migrations.sh      applies migrations + seed + SQL tests to a throwaway DB
e2e/                        Playwright tests
```

## Conventions

- **TypeScript strict.** No `any`; prefer `unknown` + Zod parsing at boundaries. Use `import { type X }` for type-only imports (lint enforces it).
- **Naming:** files `kebab-case.ts(x)`; React components `PascalCase`; DB tables and columns `snake_case`; spec keys `camelCase` with the unit in the name (`lengthMm`, `tdpW`, `capacityGb`).
- **Money:** store as `numeric(12,2)` plus a currency code. In TypeScript, do arithmetic in minor units (integers) inside the pricing service and format with `Intl.NumberFormat` using the region locale. Never use floats for totals shown to users.
- **Migrations:** never edit a migration that has been merged; add a new one. Enable RLS and add policies in the same migration as any new table. Regenerate types with `pnpm db:types`.
- **Seed data:** edit `supabase/seed/data/*.ts`, then `pnpm db:seed:generate`. Keep it deterministic (use `stableUuid`/`hash01`, no `Math.random()` or `Date.now()`).
- **UI:** shadcn/ui + Tailwind. Every data view needs loading (Skeleton), empty and error states. Must work at 360 px wide, by keyboard, and in dark mode. Icons from `lucide-react` with `aria-hidden` when decorative.
- **Server vs client:** default to Server Components; add `"use client"` only for interactivity. Import `server-only` in modules that touch secrets.
- **Tests:** unit tests sit next to the code (`*.test.ts`). The compatibility engine must have a test for every rule, both passing and failing. Core flows get Playwright tests in `e2e/`. RLS changes get a case in `supabase/tests/rls.test.sql`.
- **Before pushing:** `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm db:verify` if SQL changed.
- **Git:** small commits with imperative subject lines; push frequently.

## Compatibility rules

Rule codes and defaults live in `src/lib/compatibility/rule-definitions.ts`; the `compatibility_rules` table is seeded from it, and `rules.ts` implements each code (a test fails if the two drift). At runtime, database rows override the defaults: whether a rule is active, its severity (`error` makes the build "incompatible", `warning` and `info` don't) and tunable params (e.g. `psu.headroom.headroomRatio`, `gpu_case.length.tightClearanceMm`).

A finding may carry its own severity when one rule covers cases of different weight (an adapter-able 12V-2x6 gap is a warning, missing 8-pin cables an error). If an admin changes a rule's severity, that choice applies to every finding of the rule.

Build status: `empty` → `incompatible` (any error) → `incomplete` (missing core parts, a cooler for a CPU without one, or a GPU for a CPU without integrated graphics) → `warnings` → `compatible`.

Adding a rule: add it to rule-definitions.ts, implement it in rules.ts, add passing and failing tests in engine.test.ts, then `pnpm db:seed:generate`.

## Pricing

All money is `{ amount: integer minor units, currency }`. Parse database `numeric` values with `toMinor`/`money` (string-safe), never `parseFloat` arithmetic. `quoteOffer` makes a price tax-inclusive (VAT from the dated `tax_rules`, category-specific rules first), converts it with the latest exchange rate valid at the pricing moment (direct, inverse or cross rate) and adds standalone shipping. `rankQuotes` orders offers: buyable now, then lowest price + shipping, then fastest delivery, then retail before marketplace. `priceBuild` uses the user's selected offer when still valid, charges shipping once per shipment (per retailer, or per marketplace listing) with free-shipping thresholds, and reports VAT included, unavailable and unpriced items. Always pass `at` explicitly so results are reproducible.

## Roadmap

1. **Foundation** (done): scaffold, schema + RLS, seed data for RO and DE, README, CLAUDE.md, CI.
2. **Core services** (done): compatibility engine (all rules above, with errors, warnings and suggestions; power draw and PSU recommendation; bottleneck and performance tier) and pricing service (currency conversion, VAT, best offer per region, shipping). Thorough unit tests.
3. **Public app:** region detection with manual override; catalog with search and filters; product pages with offers and price history; interactive builder with live compatibility and totals; Supabase Auth (email + OAuth); saved builds, duplicate, compare and share links; Playwright tests for the main flows.
4. **Admin and launch:** admin CRUD for products, variants, retailers, offers, regions, tax rules and compatibility rules; CSV/JSON bulk import; submissions review; basic analytics; deployment to Vercel + Supabase.

Later: price/stock refresh jobs (Upstash QStash), alerts and notifications, budget/value optimisers, more regions and languages, Meilisearch/Algolia if Postgres search is outgrown, affiliate links, Stripe for premium features.
