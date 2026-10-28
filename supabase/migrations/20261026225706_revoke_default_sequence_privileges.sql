-- New sequences in public start with no access for anon or authenticated, so
-- each migration must grant what it needs. Identity columns need no grant, but
-- a serial column or a nextval() call made as those roles needs
-- grant usage on sequence.

alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
