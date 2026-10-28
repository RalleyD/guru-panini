-- New functions in public start with no execute for anon or authenticated, so
-- each migration must grant execute to the roles that call the function. A
-- migration that forgets its grant fails closed instead of exposing an RPC.

alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- Postgres also grants execute on every new function to PUBLIC, which anon and
-- authenticated inherit. That built-in grant is global and cannot be revoked per
-- schema, so this statement has no in schema clause and covers functions
-- postgres creates in any schema.

alter default privileges for role postgres revoke execute on functions from public;
