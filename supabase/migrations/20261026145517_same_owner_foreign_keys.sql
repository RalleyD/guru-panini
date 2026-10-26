-- A row may only reference rows with the same owner_id. Each foreign key between
-- public tables includes owner_id, so an owner cannot attach their rows to
-- another owner's client, translator or project, or probe whether its id exists.

alter table public.clients add unique (id, owner_id);
alter table public.translators add unique (id, owner_id);
alter table public.projects add unique (id, owner_id);

alter table public.projects drop constraint projects_client_id_fkey;
alter table public.projects add constraint projects_client_id_fkey
  foreign key (client_id, owner_id) references public.clients (id, owner_id);

alter table public.allocations drop constraint allocations_project_id_fkey;
alter table public.allocations add constraint allocations_project_id_fkey
  foreign key (project_id, owner_id) references public.projects (id, owner_id);

alter table public.allocations drop constraint allocations_translator_id_fkey;
alter table public.allocations add constraint allocations_translator_id_fkey
  foreign key (translator_id, owner_id) references public.translators (id, owner_id);

alter table public.feedback_entries drop constraint feedback_entries_project_id_fkey;
alter table public.feedback_entries add constraint feedback_entries_project_id_fkey
  foreign key (project_id, owner_id) references public.projects (id, owner_id);

alter table public.follow_ups drop constraint follow_ups_project_id_fkey;
alter table public.follow_ups add constraint follow_ups_project_id_fkey
  foreign key (project_id, owner_id) references public.projects (id, owner_id);
