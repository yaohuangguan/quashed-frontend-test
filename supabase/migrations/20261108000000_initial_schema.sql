-- Initial schema for the provider comparison and purchase flow.
--
-- Every table has row level security turned on and no policies, so the
-- auto-generated REST API cannot read or write them with the publishable key.
-- All access goes through the `api` Edge Function, which validates input and
-- connects with the database role.

create table public.providers (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  tagline text not null check (char_length(tagline) <= 120),
  monthly_price_cents integer not null check (monthly_price_cents > 0),
  sort_order integer not null,
  -- Comparison table cells keyed by column id, see _shared/providers.ts.
  features jsonb not null,
  -- Which questions the purchase form asks, see _shared/providers.ts.
  purchase_form jsonb not null,
  retrieved_at timestamptz not null default now()
);

create table public.address_suggestions (
  id bigint generated always as identity primary key,
  line text not null unique check (char_length(line) between 1 and 200)
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers (id),
  created_at timestamptz not null default now(),
  disconnected_at timestamptz
);

create index connections_provider_id_idx on public.connections (provider_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- One order per connection, so a repeated "Confirm & Pay" cannot buy twice.
  connection_id uuid not null unique references public.connections (id),
  provider_id text not null references public.providers (id),
  first_name text not null check (char_length(first_name) between 1 and 100),
  surname text not null check (char_length(surname) between 1 and 100),
  address text not null check (char_length(address) between 1 and 200),
  data_plan text not null check (char_length(data_plan) between 1 and 40),
  contract_start_date date not null,
  additional_services text[] not null default '{}',
  needs_router boolean,
  current_provider text check (char_length(current_provider) <= 60),
  -- Payment is simulated. Only the last four digits are kept; the full card
  -- number and the CVV are never stored.
  card_last4 char(4) not null check (card_last4 ~ '^[0-9]{4}$'),
  card_holder text not null check (char_length(card_holder) between 1 and 100),
  card_expiry_month smallint not null check (card_expiry_month between 1 and 12),
  card_expiry_year smallint not null check (card_expiry_year between 2000 and 2100),
  created_at timestamptz not null default now()
);

create index orders_provider_id_idx on public.orders (provider_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- One feedback message per order.
  order_id uuid not null unique references public.orders (id),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.providers enable row level security;
alter table public.address_suggestions enable row level security;
alter table public.connections enable row level security;
alter table public.orders enable row level security;
alter table public.feedback enable row level security;
