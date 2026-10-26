-- A table created in public without any grant statements has no Data API
-- access for anon or authenticated, because the default privileges are revoked.

begin;
select plan(16);

create table public.default_privileges_probe (id bigint primary key);

select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'SELECT'), 'anon cannot select from a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'INSERT'), 'anon cannot insert into a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'UPDATE'), 'anon cannot update a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'DELETE'), 'anon cannot delete from a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'TRUNCATE'), 'anon cannot truncate a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'REFERENCES'), 'anon cannot reference a new table.');
select ok(not has_table_privilege('anon', 'public.default_privileges_probe', 'TRIGGER'), 'anon cannot create triggers on a new table.');

select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'SELECT'), 'authenticated cannot select from a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'INSERT'), 'authenticated cannot insert into a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'UPDATE'), 'authenticated cannot update a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'DELETE'), 'authenticated cannot delete from a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'TRUNCATE'), 'authenticated cannot truncate a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'REFERENCES'), 'authenticated cannot reference a new table.');
select ok(not has_table_privilege('authenticated', 'public.default_privileges_probe', 'TRIGGER'), 'authenticated cannot create triggers on a new table.');

select is_empty(
  $$
    select grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'default_privileges_probe'
      and grantee in ('anon', 'authenticated')
  $$,
  'A new table has no grants for anon or authenticated.'
);

select is_empty(
  $$
    select acl.grantee::regrole, acl.privilege_type
    from pg_default_acl d, aclexplode(d.defaclacl) acl
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'r'
      and acl.grantee in ('anon'::regrole, 'authenticated'::regrole)
  $$,
  'The postgres default privileges for tables in public grant nothing to anon or authenticated.'
);

select * from finish();
rollback;
