-- Lets a repeated "Confirm & Pay" return the order it already created.
-- The hash covers the validated request; a retry with the same hash gets the
-- existing order back, a different request on the same connection is refused.
alter table public.orders add column request_hash text check (request_hash ~ '^[0-9a-f]{64}$');
