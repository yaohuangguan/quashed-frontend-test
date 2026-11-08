# digitallly – internet provider comparison

**Live:** https://digitallly-avd.pages.dev

A full-stack build of the **Front-End Developer Test Assignment** Figma design:
compare three internet providers, buy a plan through the fly-out
(connecting → purchase form → payment → confirmation) and leave feedback.

| Part | Technology | Hosted on |
| --- | --- | --- |
| Web app (`web/`) | React 19, Vite, TypeScript, plain CSS with the design's tokens | Cloudflare Pages |
| API (`supabase/functions/api`) | Supabase Edge Function (Deno), zod, postgres.js | Supabase |
| Database (`supabase/migrations`) | Postgres | Supabase |

Payment is a **demo**: no money moves. The card number and CVV are checked in
the browser and never sent; the API receives only the last four digits.

How it is built, and why: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- Node 22.13 or later
- For the API tests and the local API: PostgreSQL 16 binaries (`initdb`,
  `pg_ctl`). Set `PG_BIN` if they are not in `/usr/lib/postgresql/16/bin`, or
  set `TEST_DATABASE_URL` to a disposable database.

## Commands

```bash
npm install
```

```bash
npm run dev            # web app on http://localhost:5173, using the deployed API
```

```bash
node scripts/local-api.ts   # the same API code on http://localhost:54321/api with a throwaway Postgres
```

To point the web app at the local API:

```bash
VITE_API_URL=http://localhost:54321/api VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_development_key npm run dev
```

```bash
npm run typecheck      # TypeScript for the API, shared code and web app
npm test               # API integration tests (real Postgres) + web unit tests
npm run test:e2e       # Playwright: builds the web app and runs it against the local API
```

## Deploying

Database and API (Supabase CLI, linked to the project in `supabase/config.toml`):

```bash
supabase db push
```

```bash
supabase functions deploy api --no-verify-jwt
```

Web app (Cloudflare Pages, project `digitallly`):

```bash
npm run deploy:web
```

## Project layout

```text
web/                      React app
  src/app/                page shell
  src/features/           providers table, purchase fly-out, feedback popup
  src/components/         shared UI: buttons, chips, fields, dialogs, logos
  src/hooks/              data loading and the purchase flow state
  src/lib/                API client, formatting, input masks
  src/locales/en.ts       all interface text
  src/styles/             design tokens and per-feature styles
supabase/
  migrations/             schema, seed data, grants
  functions/_shared/      types and validation rules used by the API and the web app
  functions/api/          the Edge Function: routing, handlers, data access, tests
scripts/                  local Postgres for tests, local API server
e2e/                      Playwright tests
```

## Differences from the design

- Small copy fixes: "convinience" → "convenience", "You internet provider" →
  "Your internet provider", "John Dow" → "John Doe".
- Cloudid's yearly price shows as "$1,000" (the design omits the "$" there
  but shows it for the other providers).
- Data plan chips are spelled consistently ("20 Gb" rather than "20Gb").
- The confirmation title is "<Provider> Purchase Confirmed!" for every
  provider; the design uses this for Tebiobio and "<Provider> Purchase" for
  the other two.
- A "Demo payment" note is added to the payment step.
- Cloudid's "24h Support" cell says "Text", as in the design.
