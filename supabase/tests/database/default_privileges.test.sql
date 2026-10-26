-- A table created in public without any grant statements has no Data API
-- access for anon or authenticated, and a function created in public without
-- any grant statements cannot be executed by anon, authenticated or PUBLIC,
-- because the default privileges are revoked.

begin;
select plan(23);

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

create function public.default_privileges_probe_function()
returns integer
language sql
security definer
set search_path = ''
as $$ select 1 $$;

select ok(not has_function_privilege('anon', 'public.default_privileges_probe_function()', 'EXECUTE'), 'anon cannot execute a new function.');
select ok(not has_function_privilege('authenticated', 'public.default_privileges_probe_function()', 'EXECUTE'), 'authenticated cannot execute a new function.');
select ok(not has_function_privilege('public', 'public.default_privileges_probe_function()', 'EXECUTE'), 'PUBLIC cannot execute a new function.');

select is_empty(
  $$
    select grantee, privilege_type
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'default_privileges_probe_function'
      and grantee in ('anon', 'authenticated', 'PUBLIC')
  $$,
  'A new function has no grants for anon, authenticated or PUBLIC.'
);

select is_empty(
  $$
    select acl.grantee::regrole, acl.privilege_type
    from pg_default_acl d, aclexplode(d.defaclacl) acl
    where d.defaclrole = 'postgres'::regrole
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and acl.grantee in ('anon'::regrole, 'authenticated'::regrole)
  $$,
  'The postgres default privileges for functions in public grant nothing to anon or authenticated.'
);

select is_empty(
  $$
    select acl.grantee, acl.privilege_type
    from aclexplode(coalesce(
      (
        select defaclacl
        from pg_default_acl
        where defaclrole = 'postgres'::regrole
          and defaclnamespace = 0
          and defaclobjtype = 'f'
      ),
      acldefault('f', 'postgres'::regrole)
    )) acl
    where acl.grantee = 0
  $$,
  'The postgres global default privileges for functions grant nothing to PUBLIC.'
);

set local role anon;

select throws_ok(
  'select public.default_privileges_probe_function()',
  '42501',
  null,
  'anon gets permission denied when it calls a new function.'
);

reset role;

select * from finish();
rollback;
