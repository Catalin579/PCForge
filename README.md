# PCForge

PCForge helps people research, build, compare and buy complete PC setups using the components, retailers, prices and taxes of **their own region**. Pick a market and currency, add parts category by category, and the app checks compatibility and totals the build from real regional offers.

> **Status:** steps 1 and 2 of the MVP are done: project scaffold, database schema with Row Level Security, seed data for Romania and Germany, the compatibility engine and the regional pricing service. Public pages, accounts and the admin panel come next. See [CLAUDE.md](./CLAUDE.md#roadmap).

## Tech stack

| Area                  | Choice                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Framework             | Next.js 15 (App Router, React Server Components), TypeScript         |
| UI                    | Tailwind CSS 4, shadcn/ui, Lucide icons, `next-themes` for dark mode |
| Data fetching / state | TanStack Query (server state), Zustand (builder state only)          |
| Forms / validation    | React Hook Form + Zod                                                |
| Database / auth       | Supabase (PostgreSQL, Row Level Security, Auth with email and OAuth) |
| Tests                 | Vitest (unit), Playwright (end to end), SQL tests for RLS            |
| Hosting               | Vercel (app) + Supabase (database, auth, storage)                    |

## Prerequisites

- **Node.js 20.11+** (22 LTS recommended)
- **pnpm 10** (`corepack enable pnpm`)
- **Docker Desktop**, for the local Supabase stack (`supabase start`)
- Optional: `psql` and `bash`, to run `pnpm db:verify` without Docker

## Getting started

```bash
pnpm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local

pnpm db:start                   # starts Supabase in Docker, prints URL and keys
```

Copy the `API URL`, `anon key` and `service_role key` printed by `pnpm db:start` into `.env.local`, then:

```bash
pnpm db:reset                   # applies migrations and loads supabase/seed.sql
pnpm dev                        # http://localhost:3000
```

Supabase Studio runs at <http://127.0.0.1:54323> for browsing the data.

### Making yourself an admin

Sign up in the app (once auth pages land in step 3), then in Studio's SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Environment variables

| Variable                        | Required              | Where            | Description                                                                                |
| ------------------------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | yes                   | browser + server | Supabase API URL                                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes                   | browser + server | Public anon key; RLS protects data                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | yes (server features) | server only      | Bypasses RLS. Never expose to the browser                                                  |
| `DATABASE_URL`                  | for `pnpm db:seed`    | scripts          | Direct Postgres connection string                                                          |
| `NEXT_PUBLIC_SITE_URL`          | no                    | browser + server | Public base URL, used for share links and OAuth redirects. Default `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_REGION`    | no                    | browser + server | Fallback region code when detection fails. Default `RO`                                    |

Variables are validated at startup by `src/lib/env.ts`.

## Scripts

| Command                                      | What it does                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start`               | Next.js dev server, production build, production server                                                                    |
| `pnpm lint`, `pnpm typecheck`, `pnpm format` | ESLint, `tsc --noEmit`, Prettier                                                                                           |
| `pnpm test`                                  | Vitest unit tests                                                                                                          |
| `pnpm test:e2e`                              | Playwright tests (builds must exist: run `pnpm build` first)                                                               |
| `pnpm db:start` / `db:stop`                  | Start or stop local Supabase                                                                                               |
| `pnpm db:reset`                              | Recreate the local database from migrations + seed                                                                         |
| `pnpm db:types`                              | Regenerate `src/lib/supabase/database.types.ts` from the local database                                                    |
| `pnpm db:seed:generate`                      | Rebuild `supabase/seed.sql` from `supabase/seed/data/*.ts`                                                                 |
| `pnpm db:seed`                               | Rebuild the seed and apply it to `$DATABASE_URL` (idempotent)                                                              |
| `pnpm db:verify`                             | Apply migrations, seed and SQL tests to a throwaway database on any Postgres 15+ (`VERIFY_DATABASE_URL` or `DATABASE_URL`) |

## Database schema

Migrations live in `supabase/migrations`. Region- and price-specific data is always stored in the database, never in code.

```
currencies ─┬─ exchange_rates            regions ─┬─ region_currencies
            │                                     ├─ tax_rules (VAT, dated, optional per category)
            │                                     └─ retailer_regions ── retailers
categories ─┼─ products ── product_variants ── offers ── price_history
brands ─────┘      ├─ benchmarks                 (variant × retailer × region)
                   ├─ reviews
                   └─ favorites
compatibility_rules (rule codes implemented in code; admins tune severity/params)

profiles (1:1 auth.users, role user|admin, region/currency/use-case/budget preferences)
  ├─ builds ── build_items (variant, quantity, optional chosen offer)
  │    ├─ build_comments
  │    └─ build_ratings
  ├─ alerts (price drop / back in stock)
  └─ submissions (new product / correction / report, reviewed by admins)
search_events (analytics)
```

Key points:

- **Products, variants, offers.** A product is a model; a variant is a purchasable SKU (colour, capacity); an offer is one retailer selling one variant in one region, with price, currency, stock status, listing type (retail or marketplace), delivery estimate and link. Every price or stock change is recorded in `price_history` by a trigger.
- **Specs** are JSONB validated by the Zod schema for each category in `src/lib/catalog/specs.ts`.
- **Search** uses a weighted `tsvector` on products (name, brand, model, category, description) plus a trigram index for fuzzy matching.
- **Views:** `variant_region_prices` (cheapest in-stock price and offer counts per variant and region) and `product_rating_summaries`.
- **Integrity triggers:** profiles are created for new users; only admins can change roles; a build item's category is derived from its product; a chosen offer must match the item's variant and the build's region.

### Row Level Security

| Data                       | Read                                                                | Write                             |
| -------------------------- | ------------------------------------------------------------------- | --------------------------------- |
| Catalog and reference data | Everyone (published products, active regions, retailers and offers) | Admins                            |
| Profiles                   | Everyone (public profile fields only, no emails)                    | Owner (role changes: admins only) |
| Builds and items           | Owner; anyone for `public` or `unlisted` builds                     | Owner                             |
| Comments and ratings       | Same as the build                                                   | Signed-in users, on public builds |
| Reviews                    | Everyone (hidden ones: author and admins)                           | Author; admins moderate           |
| Favourites, alerts         | Owner                                                               | Owner                             |
| Submissions                | Submitter and admins                                                | Submitter creates; admins review  |
| Search events              | Admins                                                              | Server only                       |

The SQL tests in `supabase/tests/rls.test.sql` exercise these policies.

## Seed data

`supabase/seed.sql` is generated from typed data in `supabase/seed/data`:

- 2 markets: **Romania** (RON, 21 % VAT) and **Germany** (EUR, 19 % VAT), with an EUR→RON and EUR→USD rate
- 8 retailers (eMAG, PC Garage, Altex, evoMAG; Mindfactory, Alternate, Caseking, Amazon.de)
- 86 products across 13 categories with full specs, some with variants
- Offers per region with stock status, delivery estimates and 90 days of price history

Specs follow manufacturer data. Prices, stock and history are realistic but **illustrative**: they are derived deterministically from a reference price, not scraped. Retailer links are search links on the retailer's site.

To change the catalog, edit `supabase/seed/data/*.ts` and run `pnpm db:seed:generate`. CI fails if `seed.sql` is out of date.

## Testing

- `pnpm test`: unit tests for the compatibility engine (every rule, passing and failing), power and performance estimates, money, exchange rates, VAT, offer ranking and build pricing, plus spec schemas and the seed generator
- `pnpm db:verify`: migrations, seed and RLS tests against a throwaway database
- `pnpm build && pnpm test:e2e`: Playwright on desktop Chrome and a mobile viewport. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to use an already-installed Chromium.

CI (`.github/workflows/ci.yml`) runs all of these on every pull request.

## Deployment

1. **Supabase:** create a project at <https://supabase.com>. Link and push the schema:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push
   ```
   Load the seed with `DATABASE_URL=<connection string> pnpm db:seed` (or paste `supabase/seed.sql` into the SQL editor).
2. **Auth:** in Supabase → Authentication → URL configuration, set the site URL to your production URL and add `https://<your-domain>/auth/callback` as a redirect URL. Enable the OAuth providers you want (e.g. Google, GitHub) with their client IDs and secrets.
3. **Vercel:** import the GitHub repository, keep the default Next.js settings, and add the environment variables from the table above (production values). Deploy.
4. Promote your account to admin with the SQL above.

## License

Apache 2.0. See [LICENSE](./LICENSE).
