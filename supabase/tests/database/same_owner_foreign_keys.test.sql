-- A row may only reference rows with the same owner_id. User B can build on B's
-- own client, translator and project, but not on user A's.

begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.com');

-- As A: a client, a translator and a project for that client.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000a1', 'Client A', 'Contact A', 'contact-a@example.com');
insert into public.translators (id, name, email)
values ('00000000-0000-0000-0000-0000000000a2', 'Translator A', 'translator-a@example.com');
insert into public.projects (id, client_id, title, source_language, target_language, document_type, due_date)
values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Project A', 'nl', 'en', 'legal', '2026-12-01');

-- As B: B's own client, translator and project.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000b1', 'Client B', 'Contact B', 'contact-b@example.com');
insert into public.translators (id, name, email)
values ('00000000-0000-0000-0000-0000000000b2', 'Translator B', 'translator-b@example.com');
insert into public.projects (id, client_id, title, source_language, target_language, document_type, due_date)
values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Project B', 'nl', 'en', 'legal', '2026-12-01');

select lives_ok(
  $$
    insert into public.allocations (project_id, translator_id, role, start_date, end_date)
    values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b2', 'translator', '2026-11-01', '2026-11-10')
  $$,
  'B can add an allocation for B''s own project and translator.'
);

select lives_ok(
  $$
    insert into public.feedback_entries (project_id, source, body)
    values ('00000000-0000-0000-0000-0000000000b3', 'client', 'Looks good.')
  $$,
  'B can add a feedback entry for B''s own project.'
);

select lives_ok(
  $$
    insert into public.follow_ups (project_id, reason, subject, body)
    values ('00000000-0000-0000-0000-0000000000b3', 'draft_waiting', 'Draft', 'Any news?')
  $$,
  'B can add a follow-up for B''s own project.'
);

select throws_ok(
  $$
    insert into public.projects (client_id, title, source_language, target_language, document_type, due_date)
    values ('00000000-0000-0000-0000-0000000000a1', 'Project B2', 'nl', 'en', 'legal', '2026-12-01')
  $$,
  '23503',
  null,
  'B cannot add a project for A''s client.'
);

select throws_ok(
  $$
    insert into public.allocations (project_id, translator_id, role, start_date, end_date)
    values ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000b2', 'translator', '2026-11-01', '2026-11-10')
  $$,
  '23503',
  null,
  'B cannot add an allocation for A''s project.'
);

select throws_ok(
  $$
    insert into public.allocations (project_id, translator_id, role, start_date, end_date)
    values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', 'translator', '2026-11-01', '2026-11-10')
  $$,
  '23503',
  null,
  'B cannot allocate A''s translator.'
);

select throws_ok(
  $$
    insert into public.feedback_entries (project_id, source, body)
    values ('00000000-0000-0000-0000-0000000000a3', 'client', 'Looks good.')
  $$,
  '23503',
  null,
  'B cannot add a feedback entry for A''s project.'
);

select throws_ok(
  $$
    insert into public.follow_ups (project_id, reason, subject, body)
    values ('00000000-0000-0000-0000-0000000000a3', 'draft_waiting', 'Draft', 'Any news?')
  $$,
  '23503',
  null,
  'B cannot add a follow-up for A''s project.'
);

select throws_ok(
  $$
    update public.projects
    set client_id = '00000000-0000-0000-0000-0000000000a1'
    where id = '00000000-0000-0000-0000-0000000000b3'
  $$,
  '23503',
  null,
  'B cannot move B''s own project to A''s client.'
);

-- As postgres: deleting a user removes their rows, and the catalog guards
-- tables that later migrations add.

reset role;

select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000a' $$,
  'Deleting user A succeeds.'
);

select is_empty(
  $$ select id from public.clients where owner_id = '00000000-0000-0000-0000-00000000000a' $$,
  'A''s clients are gone after A is deleted.'
);

select is_empty(
  $$ select id from public.translators where owner_id = '00000000-0000-0000-0000-00000000000a' $$,
  'A''s translators are gone after A is deleted.'
);

select is_empty(
  $$ select id from public.projects where owner_id = '00000000-0000-0000-0000-00000000000a' $$,
  'A''s projects are gone after A is deleted.'
);

select is_empty(
  $$
    select c.conrelid::regclass, c.conname
    from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_class parent on parent.oid = c.confrelid
    where c.contype = 'f'
      and child.relnamespace = 'public'::regnamespace
      and parent.relnamespace = 'public'::regnamespace
      and not exists (
        select
        from unnest(c.conkey, c.confkey) as k (child_attnum, parent_attnum)
        join pg_attribute ca on ca.attrelid = c.conrelid and ca.attnum = k.child_attnum
        join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = k.parent_attnum
        where ca.attname = 'owner_id'
          and pa.attname = 'owner_id'
      )
  $$,
  'Every foreign key between public tables matches owner_id to the referenced owner_id.'
);

select * from finish();
rollback;
