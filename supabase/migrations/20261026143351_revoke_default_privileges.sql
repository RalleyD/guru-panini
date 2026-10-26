-- New tables in public start with no Data API access for anon or authenticated,
-- so each migration must grant what it needs. A migration that forgets its
-- grants fails closed instead of exposing its table.

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
