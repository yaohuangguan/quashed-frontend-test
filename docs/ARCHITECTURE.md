# Architecture

```text
Cloudflare Pages  (static React app)
      │  fetch, `apikey: sb_publishable_…`
      ▼
Supabase Edge Function `api`  (Deno, one function, REST routes)
      │  postgres.js over SUPABASE_DB_URL, prepare: false
      ▼
Supabase Postgres  (RLS on, no policies, no grants for anon/authenticated)
```

Supabase Edge Functions rewrite `text/html` responses to `text/plain`, so they
cannot serve the web page. The static app is hosted on Cloudflare Pages and the
Edge Function only serves JSON.

## API

| Method and path | Purpose |
| --- | --- |
| `GET /providers` | Comparison table data; marks the cheapest provider |
| `GET /providers/:id/purchase-options` | Which questions this provider's form asks, plus "today" in Auckland |
| `GET /addresses?q=` | Address suggestions (prefix match, at most 5) |
| `POST /connections` | Starts a purchase session ("Connecting...") |
| `DELETE /connections/:id` | "Disconnect" |
| `POST /orders` | Places the order; repeating the same request returns the same order |
| `POST /feedback` | "How did it go?" message, one per order |

Errors always look like `{"error": {"code": "...", "fields": [...]}}`. The codes
and their HTTP statuses are listed once, in `supabase/functions/_shared/errors.ts`.

## Decisions

**Shared validation.** `supabase/functions/_shared/purchase.ts` holds the zod
rules. The web app uses them to enable "Continue" and "Confirm & Pay" and to
show field errors; the API uses the same rules to reject requests. Both sides
compute "today" in `Pacific/Auckland`, so a date cannot be accepted by one side
and rejected by the other.

**Server-driven forms.** The three providers ask different questions (Pronete
asks about a router; the others ask about services and the current provider).
Each provider row stores which questions to ask and in which order, and the
same configuration drives the form and its validation.

**Runtime-neutral API code.** Only `api/index.ts` touches Deno. Everything else
uses standard `Request`/`Response`, and takes its database, clock and allowed
keys as arguments. The same code runs on Supabase, in the Node test suite and in
`scripts/local-api.ts`.

**Rules in the database.** One order per connection and one feedback per order
are unique constraints, so a double submit cannot create two rows. Lengths and
formats are `check` constraints as well as API validation.

**Repeat-safe ordering.** Each order stores a SHA-256 hash of the validated
request. Sending the same request again (for example after a lost response)
returns the existing order with `200`; a different request on the same
connection gets `409 ORDER_ALREADY_EXISTS`.

**Purchase flow as a state machine.** `connecting → retrieving → details →
payment → confirmed`, plus `failed` with a retry button. "Connecting..." and
"Retrieving data..." each stay for at least 800 ms, as the design asks; the
wait runs alongside the real request instead of after it. Closing the fly-out
aborts requests that are still running.

## Security model

This is a **public, anonymous API**. The design has no login, so there is no
user identity.

- The publishable key (`sb_publishable_…`) is public by design. The function
  checks it, but that only shows the caller knows a public string. It is not
  authentication.
- What protects the data: connection IDs are random UUIDs, every input is
  validated at the boundary (strict objects, length limits, 16 KB body limit,
  escaped `LIKE` patterns), and no endpoint returns personal data.
- The Data API (`/rest/v1`) cannot read or write any table: `anon` and
  `authenticated` have no grants (migration `20261108000200`), and RLS is on
  with no policies. The Edge Function connects as the database owner, so RLS
  does not limit it; the function code is the access control.
- Payment is a demo. The full card number and CVV are validated in the browser
  and never sent. The API rejects a request that contains them, and stores the
  last four digits, expiry month and year, and the name on the card.
- Cloudflare Pages sends a Content Security Policy and other security headers
  (`web/public/_headers`).

Not handled, and needed before real use:

- No user accounts, so orders cannot be tied to a person.
- No rate limiting or CAPTCHA on the public endpoints.
- No real payment provider. A real product would use one, such as Stripe
  Elements, so card data never reaches this API.

## Database connection

The function uses postgres.js with `prepare: false`, as Supabase's examples do
for the transaction pooler. postgres.js can pipeline queries on one connection;
the handlers run their queries one after another and use no transactions or
session state. Against the deployed function, 3 rounds of 60 concurrent
requests (different providers and queries) all returned the right data. That
is evidence, not proof. Moving data access to `supabase-js` over HTTP would
remove the question entirely, at the cost of rewriting the two store modules.

## Tests

| Suite | What it covers | Command |
| --- | --- | --- |
| API integration (`supabase/functions/api/app.test.ts`) | Every endpoint against a real, freshly migrated Postgres with a fixed clock: API key, validation limits on both sides, Auckland date boundary, expired cards, card data refused, repeat and concurrent orders, disconnect, feedback, Data API roles denied | `npm test` |
| Web unit (`web/src/lib/masks.test.ts`) | Input masks, real-date checks, money and "time ago" formatting | `npm test` |
| End-to-end (`e2e/purchase.spec.ts`) | Built app against the local API: full Cloudid purchase and feedback, Pronete router question, field errors, every way of closing the fly-out, focus return, card data not sent, phone layout | `npm run test:e2e` |

The end-to-end tests never touch the production database.
