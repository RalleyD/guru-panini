-- New project form: the source file columns, the private source-files bucket
-- and its owner-folder policies, and public.create_project.

begin;
select plan(21);

select has_column('public', 'projects', 'source_file_path', 'projects has source_file_path.');
select has_column('public', 'projects', 'source_file_name', 'projects has source_file_name.');

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'source-files' $$,
  $$
    values (
      false,
      52428800::bigint,
      array[
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
      ]::text[]
    )
  $$,
  'The source-files bucket exists, is private and allows only .docx and .pdf up to 50 MiB.'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.com');

-- As B: B's own client and translator.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000b1', 'Client B', 'Contact B', 'contact-b@example.com');
insert into public.translators (id, name, email)
values ('00000000-0000-0000-0000-0000000000b2', 'Translator B', 'translator-b@example.com');

-- As A: A's own client and translator, and source files.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);

insert into public.clients (id, name, contact_name, contact_email)
values ('00000000-0000-0000-0000-0000000000a1', 'Client A', 'Contact A', 'contact-a@example.com');
insert into public.translators (id, name, email)
values ('00000000-0000-0000-0000-0000000000a2', 'Translator A', 'translator-a@example.com');

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('source-files', '00000000-0000-0000-0000-00000000000a/a-source.docx')
  $$,
  'A can upload a source file into A''s own folder.'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('source-files', '00000000-0000-0000-0000-00000000000b/a-source.docx')
  $$,
  '42501',
  null,
  'A cannot upload a source file into B''s folder.'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('source-files', 'a-source.docx')
  $$,
  '42501',
  null,
  'A cannot upload a source file outside any owner folder.'
);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'source-files' $$,
  $$ values ('00000000-0000-0000-0000-00000000000a/a-source.docx') $$,
  'A sees A''s own source file.'
);

-- create_project as A with A's client and translator.

select lives_ok(
  $$
    select public.create_project(
      client_id => '00000000-0000-0000-0000-0000000000a1',
      title => 'Project A',
      source_language => 'nl',
      target_language => 'en',
      document_type => 'legal',
      due_date => current_date + 10,
      word_count => 1234,
      source_file_path => '00000000-0000-0000-0000-00000000000a/a-source.docx',
      source_file_name => 'Contract.docx',
      translator_id => '00000000-0000-0000-0000-0000000000a2'
    )
  $$,
  'A can create a project with a source file and a translator.'
);

select results_eq(
  $$
    select owner_id, client_id, source_language, target_language, document_type, due_date,
      word_count, source_file_path, source_file_name
    from public.projects
    where title = 'Project A'
  $$,
  $$
    values (
      '00000000-0000-0000-0000-00000000000a'::uuid,
      '00000000-0000-0000-0000-0000000000a1'::uuid,
      'nl', 'en', 'legal'::public.document_type, current_date + 10,
      1234, '00000000-0000-0000-0000-00000000000a/a-source.docx', 'Contract.docx'
    )
  $$,
  'create_project saves every project field for A.'
);

select results_eq(
  $$
    select a.owner_id, a.translator_id, a.role, a.is_proposed, a.start_date, a.end_date
    from public.allocations a
    join public.projects p on p.id = a.project_id
    where p.title = 'Project A'
  $$,
  $$
    values (
      '00000000-0000-0000-0000-00000000000a'::uuid,
      '00000000-0000-0000-0000-0000000000a2'::uuid,
      'translator'::public.allocation_role, false, current_date, current_date + 10
    )
  $$,
  'create_project allocates the translator, confirmed, from today to the due date.'
);

select set_config(
  'test.project_a2_id',
  public.create_project(
    '00000000-0000-0000-0000-0000000000a1', 'Project A2', 'en', 'nl', 'business', current_date + 3
  )::text,
  true
);

select is(
  (select id::text from public.projects where title = 'Project A2'),
  current_setting('test.project_a2_id'),
  'create_project returns the new project''s id.'
);

select is_empty(
  $$
    select a.id
    from public.allocations a
    join public.projects p on p.id = a.project_id
    where p.title = 'Project A2'
  $$,
  'create_project without a translator adds no allocation.'
);

select results_eq(
  $$
    select word_count, source_file_path, source_file_name
    from public.projects
    where title = 'Project A2'
  $$,
  $$ values (null::integer, null::text, null::text) $$,
  'The optional project fields default to null.'
);

select lives_ok(
  $$
    select public.create_project(
      '00000000-0000-0000-0000-0000000000a1', 'Project A3', 'nl', 'en', 'other', current_date - 2,
      translator_id => '00000000-0000-0000-0000-0000000000a2'
    )
  $$,
  'A can create a project with a past due date and a translator.'
);

select results_eq(
  $$
    select a.start_date, a.end_date
    from public.allocations a
    join public.projects p on p.id = a.project_id
    where p.title = 'Project A3'
  $$,
  $$ values (current_date - 2, current_date - 2) $$,
  'A due date before today starts the allocation on the due date.'
);

select throws_ok(
  $$
    select public.create_project(
      '00000000-0000-0000-0000-0000000000a1', 'Project A4', 'nl', 'en', 'legal', current_date + 10,
      translator_id => '00000000-0000-0000-0000-0000000000b2'
    )
  $$,
  '23503',
  null,
  'A cannot create a project with B''s translator.'
);

select is_empty(
  $$ select id from public.projects where title = 'Project A4' $$,
  'A failed allocation leaves no new project for A.'
);

-- As B: none of A's source files.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);

select is_empty(
  $$ select name from storage.objects where bucket_id = 'source-files' $$,
  'B sees none of A''s source files.'
);

-- As anon: no source files.

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select is_empty(
  $$ select name from storage.objects where bucket_id = 'source-files' $$,
  'anon sees no source files.'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.create_project(uuid, text, text, text, public.document_type, date, integer, text, text, uuid)',
    'EXECUTE'
  ),
  'authenticated can execute create_project.'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_project(uuid, text, text, text, public.document_type, date, integer, text, text, uuid)',
    'EXECUTE'
  ),
  'anon cannot execute create_project.'
);

select * from finish();
rollback;
