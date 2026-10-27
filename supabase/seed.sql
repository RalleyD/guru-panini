-- Demo data for local development. Everything in this file is fake demo data:
-- the names, emails, dates and text are placeholders, not real people or work.
--
-- Local Supabase stack only. The guard at the top of the block below aborts
-- unless app.settings.jwt_secret is the Supabase CLI's local default, so the
-- seed cannot write to the hosted project. Every insert sits inside that one
-- block, so a failed guard writes nothing, whichever client runs the file.
--
-- `pnpm exec supabase db reset` loads this file after the migrations.
--
-- Demo owner sign-in: demo-owner@example.com / local-demo-only

do $$
begin
  if coalesce(current_setting('app.settings.jwt_secret', true), '') <> 'super-secret-jwt-token-with-at-least-32-characters-long' then
    raise exception 'supabase/seed.sql only runs on the local Supabase stack';
  end if;

  -- Demo owner account. Every demo row below belongs to it.

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'demo-owner@example.com', extensions.crypt('local-demo-only', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (
    'de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000001',
    '{"sub":"de000000-0000-4000-8000-000000000001","email":"demo-owner@example.com","email_verified":true}',
    'email', now(), now()
  );

  -- Clients: four active, one archived.

  insert into public.clients (id, owner_id, created_at, name, contact_name, contact_email, usual_source_language, usual_target_language, usual_work_type, writing_preferences, notes, has_glossary, archived_at) values
    ('de000000-0000-4000-8000-000000000101', 'de000000-0000-4000-8000-000000000001', now() - interval '120 days', 'Demo Legal Client', 'Demo Contact One', 'contact-one@example.com', 'nl', 'en', 'legal', 'Placeholder preference: British spelling, formal tone.', 'Placeholder note for a demo client.', true, null),
    ('de000000-0000-4000-8000-000000000102', 'de000000-0000-4000-8000-000000000001', now() - interval '90 days', 'Demo Property Client', 'Demo Contact Two', 'contact-two@example.com', 'en', 'nl', 'real_estate', null, 'Placeholder note for a demo client.', false, null),
    ('de000000-0000-4000-8000-000000000103', 'de000000-0000-4000-8000-000000000001', now() - interval '60 days', 'Demo Engineering Client', 'Demo Contact Three', 'contact-three@example.com', 'es', 'en', 'technical', null, null, false, null),
    ('de000000-0000-4000-8000-000000000104', 'de000000-0000-4000-8000-000000000001', now() - interval '45 days', 'Demo Mixed Client', 'Demo Contact Four', 'contact-four@example.com', 'nl', 'en', 'mixed', 'Placeholder preference: short sentences.', null, false, null),
    ('de000000-0000-4000-8000-000000000105', 'de000000-0000-4000-8000-000000000001', now() - interval '200 days', 'Demo Archived Client', 'Demo Contact Five', 'contact-five@example.com', 'fr', 'en', 'business', null, 'Placeholder note for an archived demo client.', false, now() - interval '15 days');

  -- Translators: three active, one archived.

  insert into public.translators (id, owner_id, created_at, name, email, language_pairs, specialisms, availability, archived_at) values
    ('de000000-0000-4000-8000-000000000201', 'de000000-0000-4000-8000-000000000001', now() - interval '150 days', 'Demo Translator One', 'translator-one@example.com', '{nl-en,en-nl}', '{legal,business}', 'Placeholder availability: weekdays.', null),
    ('de000000-0000-4000-8000-000000000202', 'de000000-0000-4000-8000-000000000001', now() - interval '100 days', 'Demo Translator Two', 'translator-two@example.com', '{en-nl,nl-en}', '{"real estate",marketing}', 'Placeholder availability: mornings only.', null),
    ('de000000-0000-4000-8000-000000000203', 'de000000-0000-4000-8000-000000000001', now() - interval '80 days', 'Demo Translator Three', 'translator-three@example.com', '{es-en,fr-en}', '{technical}', 'Placeholder availability: part time.', null),
    ('de000000-0000-4000-8000-000000000204', 'de000000-0000-4000-8000-000000000001', now() - interval '300 days', 'Demo Translator Four', 'translator-four@example.com', '{de-en,fr-en}', '{legal}', 'Placeholder availability: not taking work.', now() - interval '25 days');

  -- Projects: six active over the active clients, one archived for the archived client.

  insert into public.projects (id, owner_id, created_at, client_id, title, source_language, target_language, document_type, word_count, due_date, notes, archived_at) values
    ('de000000-0000-4000-8000-000000000301', 'de000000-0000-4000-8000-000000000001', now() - interval '12 days', 'de000000-0000-4000-8000-000000000101', 'Demo lease agreement', 'nl', 'en', 'legal', 4200, current_date + 3, 'Placeholder note for a demo project.', null),
    ('de000000-0000-4000-8000-000000000302', 'de000000-0000-4000-8000-000000000001', now() - interval '10 days', 'de000000-0000-4000-8000-000000000102', 'Demo property listing', 'en', 'nl', 'real_estate', 1800, current_date + 6, null, null),
    ('de000000-0000-4000-8000-000000000303', 'de000000-0000-4000-8000-000000000001', now() - interval '14 days', 'de000000-0000-4000-8000-000000000103', 'Demo pump manual', 'es', 'en', 'technical', null, current_date + 10, 'Placeholder note for a demo project.', null),
    ('de000000-0000-4000-8000-000000000304', 'de000000-0000-4000-8000-000000000001', now() - interval '9 days', 'de000000-0000-4000-8000-000000000104', 'Demo quarterly report', 'nl', 'en', 'business', 3100, current_date + 14, null, null),
    ('de000000-0000-4000-8000-000000000305', 'de000000-0000-4000-8000-000000000001', now() - interval '1 day', 'de000000-0000-4000-8000-000000000104', 'Demo website FAQ', 'en', 'nl', 'other', null, current_date + 21, 'Placeholder note: not allocated yet.', null),
    ('de000000-0000-4000-8000-000000000306', 'de000000-0000-4000-8000-000000000001', now() - interval '3 days', 'de000000-0000-4000-8000-000000000101', 'Demo supplier contract', 'nl', 'en', 'legal', 6500, current_date + 35, null, null),
    ('de000000-0000-4000-8000-000000000307', 'de000000-0000-4000-8000-000000000001', now() - interval '60 days', 'de000000-0000-4000-8000-000000000105', 'Demo price list', 'fr', 'en', 'business', 900, current_date - 30, null, now() - interval '20 days');

  -- Allocations. Demo website FAQ has none, so it sits in Intake.

  insert into public.allocations (owner_id, project_id, translator_id, role, start_date, end_date, is_proposed) values
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000301', 'de000000-0000-4000-8000-000000000201', 'translator', current_date - 2, current_date + 1, false),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000301', 'de000000-0000-4000-8000-000000000202', 'reviewer', current_date + 2, current_date + 3, false),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000302', 'de000000-0000-4000-8000-000000000202', 'translator', current_date, current_date + 4, false),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000302', 'de000000-0000-4000-8000-000000000201', 'reviewer', current_date + 5, current_date + 6, true),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000303', 'de000000-0000-4000-8000-000000000203', 'translator', current_date + 1, current_date + 8, false),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000304', 'de000000-0000-4000-8000-000000000201', 'translator', current_date + 4, current_date + 11, true),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000306', 'de000000-0000-4000-8000-000000000201', 'translator', current_date + 16, current_date + 30, true),
    ('de000000-0000-4000-8000-000000000001', 'de000000-0000-4000-8000-000000000307', 'de000000-0000-4000-8000-000000000204', 'translator', current_date - 45, current_date - 32, false);

  -- Feedback entries: every source and status.

  insert into public.feedback_entries (owner_id, created_at, project_id, version, source, person, tag, body, status) values
    ('de000000-0000-4000-8000-000000000001', now() - interval '1 day', 'de000000-0000-4000-8000-000000000301', 'v1', 'reviewer', 'Demo Translator Two', 'terminology', 'Placeholder reviewer feedback: check a demo term.', 'open'),
    ('de000000-0000-4000-8000-000000000001', now() - interval '2 days', 'de000000-0000-4000-8000-000000000301', 'v1', 'reviewer', 'Demo Translator Two', 'style', 'Placeholder reviewer feedback: shorten a demo heading.', 'applied'),
    ('de000000-0000-4000-8000-000000000001', now() - interval '3 days', 'de000000-0000-4000-8000-000000000302', 'v1', 'client', 'Demo Contact Two', 'formatting', 'Placeholder client feedback: keep the demo table layout.', 'open'),
    ('de000000-0000-4000-8000-000000000001', now() - interval '5 days', 'de000000-0000-4000-8000-000000000302', 'v1', 'client', 'Demo Contact Two', 'terminology', 'Placeholder client feedback: use the demo glossary term.', 'applied'),
    ('de000000-0000-4000-8000-000000000001', now() - interval '4 days', 'de000000-0000-4000-8000-000000000304', null, 'client', null, null, 'Placeholder client feedback without a version, person or tag.', 'open');

  -- Follow-ups on active projects: every reason and state.

  insert into public.follow_ups (owner_id, created_at, project_id, reason, subject, body, state, opened_at, done_at) values
    ('de000000-0000-4000-8000-000000000001', now() - interval '7 days', 'de000000-0000-4000-8000-000000000301', 'draft_waiting', 'Demo follow-up: draft waiting', 'Placeholder follow-up text for a demo draft.', 'ready', null, null),
    ('de000000-0000-4000-8000-000000000001', now() - interval '8 days', 'de000000-0000-4000-8000-000000000302', 'quote_not_accepted', 'Demo follow-up: quote not accepted', 'Placeholder follow-up text for a demo quote.', 'opened', now() - interval '1 day', null),
    ('de000000-0000-4000-8000-000000000001', now() - interval '10 days', 'de000000-0000-4000-8000-000000000303', 'question_waiting', 'Demo follow-up: question waiting', 'Placeholder follow-up text for a demo question.', 'done', null, now() - interval '2 days'),
    ('de000000-0000-4000-8000-000000000001', now() - interval '6 days', 'de000000-0000-4000-8000-000000000304', 'question_waiting', 'Demo follow-up: question waiting', 'Placeholder follow-up text for a demo question.', 'ready', null, null);

  -- Settings. The reminder texts stay null; the other columns keep their defaults.

  insert into public.settings (owner_id, agency_name, owner_name, sign_off)
  values ('de000000-0000-4000-8000-000000000001', 'Demo Translation Agency', 'Demo Owner', 'Kind regards, Demo Owner');
end
$$;
