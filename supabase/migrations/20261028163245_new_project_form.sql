-- New project form: the project's source file, the private bucket that holds
-- source files, and one call that saves a project with its translator.

-- The object name in the source-files bucket, and the file name the owner chose.

alter table public.projects add column source_file_path text;
alter table public.projects add column source_file_name text;

-- Private bucket for source files. Created here rather than in config.toml so it
-- exists on the hosted project too.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-files',
  'source-files',
  false,
  52428800,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ]
);

-- Object names start with the owner's id folder: '<owner id>/<uuid>.<ext>'.
-- Files are never replaced or deleted from the app, so there is no update or
-- delete policy, and nothing for anon.

create policy "Owners can upload source files to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'source-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners can view source files in their folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'source-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Saves the project and, when a translator is given, a confirmed translator
-- allocation from today (or the due date if earlier) to the due date, in one
-- transaction. Runs as the caller, so row-level security and the same-owner
-- foreign keys apply to both inserts.

create function public.create_project(
  client_id uuid,
  title text,
  source_language text,
  target_language text,
  document_type public.document_type,
  due_date date,
  word_count integer default null,
  source_file_path text default null,
  source_file_name text default null,
  translator_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_project_id uuid;
begin
  insert into public.projects (
    client_id, title, source_language, target_language, document_type, due_date,
    word_count, source_file_path, source_file_name
  )
  values (
    create_project.client_id, create_project.title, create_project.source_language,
    create_project.target_language, create_project.document_type, create_project.due_date,
    create_project.word_count, create_project.source_file_path, create_project.source_file_name
  )
  returning id into new_project_id;

  if create_project.translator_id is not null then
    insert into public.allocations (project_id, translator_id, role, start_date, end_date, is_proposed)
    values (
      new_project_id, create_project.translator_id, 'translator',
      least(current_date, create_project.due_date), create_project.due_date, false
    );
  end if;

  return new_project_id;
end;
$$;

grant execute on function public.create_project(uuid, text, text, text, public.document_type, date, integer, text, text, uuid)
  to authenticated;
