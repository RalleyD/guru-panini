-- Settings, phase 1: the private bucket that holds the owner's profile photo.

-- Created here rather than in config.toml so it exists on the hosted project too.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Object names start with the owner's id folder: '<owner id>/<uuid>.<ext>'.
-- A new photo is a new object and old ones are never replaced or deleted from the
-- app, so there is no update or delete policy, and nothing for anon.

create policy "Owners can upload profile photos to their folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Owners can view profile photos in their folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
