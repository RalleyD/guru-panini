-- Phase 1 schema: clients, translators, projects, allocations, feedback entries,
-- follow-ups and settings. Every row belongs to an owner (auth.users) and is only
-- reachable through the Data API by that owner, signed in as `authenticated`.

-- Choice lists

create type public.document_type as enum ('legal', 'real_estate', 'technical', 'business', 'other');
create type public.client_work_type as enum ('legal', 'real_estate', 'technical', 'business', 'mixed');
create type public.allocation_role as enum ('translator', 'reviewer');
create type public.feedback_source as enum ('reviewer', 'client');
create type public.feedback_status as enum ('open', 'applied');
create type public.follow_up_reason as enum ('draft_waiting', 'quote_not_accepted', 'question_waiting');
create type public.follow_up_state as enum ('ready', 'opened', 'done');
create type public.email_provider as enum ('default_app', 'gmail', 'outlook');

-- Tables

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  contact_name text not null,
  contact_email text not null,
  usual_source_language text check (usual_source_language ~ '^[a-z]{2}$'),
  usual_target_language text check (usual_target_language ~ '^[a-z]{2}$'),
  usual_work_type public.client_work_type,
  writing_preferences text,
  notes text,
  has_glossary boolean not null default false,
  archived_at timestamptz
);

create table public.translators (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  -- Each pair is '<source>-<target>', for example 'nl-en'.
  language_pairs text[] not null default '{}',
  specialisms text[] not null default '{}',
  availability text,
  archived_at timestamptz
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id),
  title text not null,
  source_language text not null check (source_language ~ '^[a-z]{2}$'),
  target_language text not null check (target_language ~ '^[a-z]{2}$'),
  document_type public.document_type not null,
  -- Only set from an uploaded file.
  word_count integer check (word_count >= 0),
  due_date date not null,
  notes text,
  archived_at timestamptz
);

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id),
  translator_id uuid not null references public.translators (id),
  role public.allocation_role not null,
  start_date date not null,
  end_date date not null,
  is_proposed boolean not null default false,
  check (end_date >= start_date)
);

create table public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The entry's date.
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id),
  version text,
  source public.feedback_source not null,
  person text,
  tag text,
  body text not null,
  status public.feedback_status not null default 'open'
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  project_id uuid not null references public.projects (id),
  reason public.follow_up_reason not null,
  subject text not null,
  body text not null,
  state public.follow_up_state not null default 'ready',
  opened_at timestamptz,
  done_at timestamptz
);

-- One row per owner.
create table public.settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  agency_name text,
  owner_name text,
  photo_path text,
  email_provider public.email_provider not null default 'default_app',
  sign_off text,
  follow_up_after_days integer not null default 5 check (follow_up_after_days between 1 and 30),
  reminder_draft_waiting text,
  reminder_quote_not_accepted text,
  reminder_question_waiting text
);

-- Row-level security: each owner reads and writes only their own rows.

alter table public.clients enable row level security;
alter table public.translators enable row level security;
alter table public.projects enable row level security;
alter table public.allocations enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.follow_ups enable row level security;
alter table public.settings enable row level security;

create policy "Owners can view their clients" on public.clients
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add clients" on public.clients
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their clients" on public.clients
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners can view their translators" on public.translators
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add translators" on public.translators
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their translators" on public.translators
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners can view their projects" on public.projects
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add projects" on public.projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their projects" on public.projects
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners can view their allocations" on public.allocations
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add allocations" on public.allocations
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their allocations" on public.allocations
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners can delete their allocations" on public.allocations
  for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "Owners can view their feedback entries" on public.feedback_entries
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add feedback entries" on public.feedback_entries
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their feedback entries" on public.feedback_entries
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners can view their follow-ups" on public.follow_ups
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add follow-ups" on public.follow_ups
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their follow-ups" on public.follow_ups
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "Owners can view their settings" on public.settings
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add their settings" on public.settings
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their settings" on public.settings
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Explicit Data API grants: nothing for anon, only the commands the app needs
-- for authenticated. Clients, projects and translators are archived, not deleted.

revoke all on table public.clients from anon, authenticated;
revoke all on table public.translators from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.allocations from anon, authenticated;
revoke all on table public.feedback_entries from anon, authenticated;
revoke all on table public.follow_ups from anon, authenticated;
revoke all on table public.settings from anon, authenticated;

grant select, insert, update on table public.clients to authenticated;
grant select, insert, update on table public.translators to authenticated;
grant select, insert, update on table public.projects to authenticated;
grant select, insert, update on table public.allocations to authenticated;
grant select, insert, update on table public.feedback_entries to authenticated;
grant select, insert, update on table public.follow_ups to authenticated;
grant select, insert, update on table public.settings to authenticated;

grant delete on table public.allocations to authenticated;
