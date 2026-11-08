-- All data access goes through the `api` Edge Function, so the roles used by
-- the auto-generated Data API (anon, authenticated) get no table access at
-- all. With RLS alone the endpoints still answered `200 []`; without grants
-- they answer "permission denied".

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Tables created later in this schema start without grants as well.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
