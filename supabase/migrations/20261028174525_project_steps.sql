-- Project steps: the four milestone steps (one row per milestone per project,
-- created the first time the owner ticks it) and free-form steps. A step is done
-- when completed_at is set. Stage and progress are derived from these rows and
-- the allocations, never stored.

create type public.project_milestone as enum ('draft', 'review', 'client_feedback', 'delivery');

create table public.project_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  project_id uuid not null,
  -- Null for a free-form step.
  milestone public.project_milestone,
  -- Null for a milestone step.
  title text,
  due_date date,
  -- Null while the step is not done.
  completed_at timestamptz,
  foreign key (project_id, owner_id) references public.projects (id, owner_id),
  unique (project_id, milestone),
  check ((milestone is null) <> (title is null)),
  check (title is null or length(btrim(title)) > 0)
);

alter table public.project_steps enable row level security;

create policy "Owners can view their project steps" on public.project_steps
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Owners can add project steps" on public.project_steps
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their project steps" on public.project_steps
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Nothing for anon; steps are ticked and un-ticked, never deleted.

revoke all on table public.project_steps from anon, authenticated;

grant select, insert, update on table public.project_steps to authenticated;
