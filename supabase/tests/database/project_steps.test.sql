-- Project steps: owner A can add milestone and free-form steps to A's project and
-- tick them; one row per milestone per project; a step is either a milestone or
-- a titled free-form step; owner B cannot see, change or add to A's steps; anon
-- has no access and nobody can delete a step.

begin;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.com');

-- As A: a client and a project.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000a1', 'Client A', 'Contact A', 'contact-a@example.com');
insert into public.projects (id, client_id, title, source_language, target_language, document_type, due_date)
values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Project A', 'nl', 'en', 'legal', '2026-12-01');

select lives_ok(
  $$
    insert into public.project_steps (id, project_id, milestone)
    values ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a3', 'draft')
  $$,
  'A can add a milestone step to A''s project.'
);

select lives_ok(
  $$
    insert into public.project_steps (id, project_id, title, due_date)
    values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a3', 'Call the client', '2026-11-20')
  $$,
  'A can add a free-form step to A''s project.'
);

select results_eq(
  $$
    select owner_id, completed_at
    from public.project_steps
    where id = '00000000-0000-0000-0000-0000000000a4'
  $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, null::timestamptz) $$,
  'A new step belongs to A and is not done.'
);

select lives_ok(
  $$
    update public.project_steps
    set completed_at = '2026-11-02 10:00:00+00'
    where id in ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5')
  $$,
  'A can tick A''s steps.'
);

select results_eq(
  $$ select count(*) from public.project_steps where completed_at = '2026-11-02 10:00:00+00' $$,
  $$ values (2::bigint) $$,
  'Both of A''s steps are done.'
);

select lives_ok(
  $$
    insert into public.project_steps (project_id, milestone, completed_at)
    values ('00000000-0000-0000-0000-0000000000a3', 'review', now())
    on conflict (project_id, milestone) do update set completed_at = excluded.completed_at
  $$,
  'A can upsert a milestone step on (project_id, milestone).'
);

select throws_ok(
  $$
    insert into public.project_steps (project_id, milestone)
    values ('00000000-0000-0000-0000-0000000000a3', 'draft')
  $$,
  '23505',
  null,
  'A second row for the same project and milestone fails.'
);

select throws_ok(
  $$
    insert into public.project_steps (project_id, milestone, title)
    values ('00000000-0000-0000-0000-0000000000a3', 'delivery', 'Deliver')
  $$,
  '23514',
  null,
  'A step with both a milestone and a title fails.'
);

select throws_ok(
  $$
    insert into public.project_steps (project_id)
    values ('00000000-0000-0000-0000-0000000000a3')
  $$,
  '23514',
  null,
  'A step with neither a milestone nor a title fails.'
);

select throws_ok(
  $$
    insert into public.project_steps (project_id, title)
    values ('00000000-0000-0000-0000-0000000000a3', '   ')
  $$,
  '23514',
  null,
  'A free-form step with a blank title fails.'
);

-- As B: B's own client and project, and nothing of A's.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000b1', 'Client B', 'Contact B', 'contact-b@example.com');
insert into public.projects (id, client_id, title, source_language, target_language, document_type, due_date)
values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Project B', 'nl', 'en', 'legal', '2026-12-01');

select is_empty(
  $$ select id from public.project_steps $$,
  'B sees none of A''s steps.'
);

select is_empty(
  $$
    update public.project_steps
    set completed_at = null
    where project_id = '00000000-0000-0000-0000-0000000000a3'
    returning id
  $$,
  'B cannot update A''s steps (0 rows).'
);

select throws_ok(
  $$
    insert into public.project_steps (project_id, milestone)
    values ('00000000-0000-0000-0000-0000000000a3', 'delivery')
  $$,
  '23503',
  null,
  'B cannot add a step to A''s project.'
);

reset role;

select results_eq(
  $$
    select count(*)
    from public.project_steps
    where project_id = '00000000-0000-0000-0000-0000000000a3' and completed_at is not null
  $$,
  $$ values (3::bigint) $$,
  'A''s ticked steps are unchanged after B''s update.'
);

select is_empty(
  $$
    select privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'project_steps' and grantee = 'anon'
  $$,
  'anon has no privileges on project_steps.'
);

select ok(has_table_privilege('authenticated', 'public.project_steps', 'SELECT'), 'authenticated can select project steps.');
select ok(has_table_privilege('authenticated', 'public.project_steps', 'INSERT'), 'authenticated can insert project steps.');
select ok(has_table_privilege('authenticated', 'public.project_steps', 'UPDATE'), 'authenticated can update project steps.');
select ok(
  not has_table_privilege('authenticated', 'public.project_steps', 'DELETE'),
  'authenticated cannot delete project steps.'
);

select * from finish();
rollback;
