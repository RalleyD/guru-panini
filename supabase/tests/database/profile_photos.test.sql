-- Settings, phase 1: the private profile-photos bucket and its owner-folder policies.

begin;
select plan(8);

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'profile-photos' $$,
  $$ values (false, 5242880::bigint, array['image/jpeg', 'image/png', 'image/webp']::text[]) $$,
  'The profile-photos bucket exists, is private and allows only JPEG, PNG and WebP up to 5 MiB.'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'owner-b@example.com');

-- As B: B's own photo.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('profile-photos', '00000000-0000-0000-0000-00000000000b/b-photo.png')
  $$,
  'B can upload a photo into B''s own folder.'
);

-- As A: A's own photo, and attempts outside A's folder.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000a', 'role', 'authenticated')::text, true);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('profile-photos', '00000000-0000-0000-0000-00000000000a/a-photo.png')
  $$,
  'A can upload a photo into A''s own folder.'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('profile-photos', '00000000-0000-0000-0000-00000000000b/a-photo.png')
  $$,
  '42501',
  null,
  'A cannot upload a photo into B''s folder.'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values ('profile-photos', 'a-photo.png')
  $$,
  '42501',
  null,
  'A cannot upload a photo outside any owner folder.'
);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'profile-photos' $$,
  $$ values ('00000000-0000-0000-0000-00000000000a/a-photo.png') $$,
  'A sees only A''s own photo.'
);

-- As B: only B's photo.

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000000b', 'role', 'authenticated')::text, true);

select results_eq(
  $$ select name from storage.objects where bucket_id = 'profile-photos' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b/b-photo.png') $$,
  'B sees only B''s own photo.'
);

-- As anon: no photos.

reset role;
select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
set local role anon;

select is_empty(
  $$ select name from storage.objects where bucket_id = 'profile-photos' $$,
  'anon sees no profile photos.'
);

reset role;

select * from finish();
rollback;
