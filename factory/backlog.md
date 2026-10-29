# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.

Waves 0 to 6 are phase 1 (no cover-mode UI). Wave 7 is the phase 3 cover-me demo. Source of the item text: the suggested backlog in
[docs/factory-handoff.md](../docs/factory-handoff.md), adjusted for build order and job size (see
"Changes from the handoff" at the end). Product spec: [docs/design-handoff.md](../docs/design-handoff.md).
Stack: [docs/decisions/0001-tech-stack.md](../docs/decisions/0001-tech-stack.md).

How to read this file:

- Items are one line each, in dependency order. `spec-writer` turns an item into the detailed spec.
- Work in **waves**. Every job branches from `main` when it starts, so merge a wave before starting
  the next. Items inside a wave marked *parallel* can run in separate sessions at the same time.
- Jobs that touch the local Supabase stack should not run at the same time as each other:
  `supabase start` uses fixed ports and containers.
- Wave 4 jobs all edit Project detail. Run them one at a time or expect small merge conflicts.
- `/factory next` ignores wave headings, so do not start a wave early.
- `/factory loop` takes the items one at a time in file order and stops at the first failure, so the
  order here is the order they build. `--wave N` limits it to the items under the `## Wave N` heading. The "waves" in `/factory` specs are different: they split one
  item's build into steps, and are not these headings.

## Wave 0: foundations (serial, merge each before starting the next)

- [x] Scaffold the app: Vue 3 + TypeScript + Vite + Vue Router, Vitest, Biome and vue-tsc with pnpm, and a placeholder home page. Fill in the "Dev server" section of AGENTS.md and make the validation commands there work. → 001-scaffold-app
- [x] Build the responsive app shell from docs/design-handoff.md (sidebar on desktop; top bar and bottom tab bar below 900 px; Overview, Projects, Clients, Translators, Settings, Support links; a count badge on Overview that takes a number). Add the design tokens as CSS variables and base styles for card, button, chip, field and focus ring. Pages are empty placeholders. → 002-app-shell
- [x] Supabase foundation: local stack with `supabase start`, row-level security on every table, generated TypeScript types, and a first migration for clients, translators, projects, allocations, feedback entries, follow-ups and settings, using the phase 1 columns in docs/design-handoff.md (no cover-mode columns). → 003-supabase-foundation
- [x] Database hardening, part 1: revoke Supabase's default privileges so new tables in `public` are not granted to `anon` or `authenticated` automatically (`alter default privileges ... revoke`), so a later migration that forgets its explicit grants fails closed. Add a test or check that proves a new table starts with no access for `anon`. From the 003 security review. → 004-db-default-privileges
- [x] Database hardening, part 2: cross-owner foreign key checks. Today a user can insert a row that references another user's client, translator or project id (the data does not leak, but the row is accepted). Make every foreign key reference only rows with the same `owner_id` (composite keys or a check), and test it with two users. Do this before any second role is added. From the 003 security review. → 005-cross-owner-fk-checks
- [x] Database hardening, part 3: functions. Functions in `public` can still be run by `anon` and `authenticated`, through Supabase's default privileges and Postgres's built-in grant of execute to everyone, so any future function (above all a `security definer` one) is callable through `/rest/v1/rpc` unless its migration takes that access away. Close the same gap part 1 closed for tables: revoke the default execute grants for new functions in `public` (including the grant to `public`), so a function must be granted explicitly. Add a pgTAP test that proves a new function starts with no execute access for `anon`. Do this before the first function is added. From the 004 security review. → 006-db-function-privileges
- [x] Database hardening, part 4: sequences and `supabase_admin`. New sequences in `public` still give `anon` read, write and usage by default (low risk), and objects created by `supabase_admin` still grant `anon` and `authenticated` everything, because a migration cannot change that role's defaults. Revoke the default sequence privileges for `postgres`, and write down in AGENTS.md that extensions must be installed in the `extensions` schema, not `public`. From the 004 security review. → 007-db-sequence-privileges
- [x] Single-owner sign-in: a minimal sign-in page, public sign-ups disabled, a route guard and sign-out. The sign-in screen is not in the wireframes: build it in the existing visual language and flag it for the owner's review. Owner's decisions: email and password only (no magic link, no forgot-password); a centred card with an email field, a password field and one primary button, the brand text, and an inline error ("Email or password is incorrect"); sign-out in the sidebar footer on desktop and in the top bar on phones; turn `enable_signup` off in both `[auth]` and `[auth.email]` of supabase/config.toml; a signed-out visitor to any route goes to the sign-in page. The owner account is created by hand (the dashboard on the hosted project, the seed script locally). Runs after the Seed script item, which provides the local owner account. → 009-single-owner-sign-in
- [x] Seed script with clearly fake demo data (separate from migrations), so pages can be developed and reviewed with the dev server. Also create one clearly fake local owner account that the demo rows belong to (email and password written in the seed file and in AGENTS.md; local only, and the seed must never run against the hosted project), so the sign-in job's reviewers can sign in. Added at the owner's request, and it runs before Single-owner sign-in. → 008-seed-demo-data
- [x] Fix `.gitignore`: the `lib/` rule also ignores `src/lib/`, so `src/lib/supabase.ts` had to be committed with `git add -f` and `biome check .` skips that folder. Anchor it as `/lib/` (or remove it if nothing needs it) so `src/lib/` is tracked and linted, and drop the `git add -f` caveat from AGENTS.md. Also ignore `.env.local`, `.env.*.local` and `.env.production*` so a real key cannot be committed by accident, while `.env.development` (local CLI defaults only) stays tracked. From the 009 code and security reviews. → 010-gitignore-fix

## Wave 1: people (parallel)

- [x] Clients page: client list with search, one status chip (Follow-up due, otherwise none), the selected-client panel (contact, how they like it written, history), and the Add client form (required: name, contact name, contact email; optional: usual language pair, usual work type, notes). Match docs/design/screens/ClientsP1 and AddClient. → 011-clients-page
- [x] Translators page: people cards with languages, specialisms, availability and load, and the Add translator form (required: name, email; optional: language pairs, specialisms, availability). Match ResourcesP1 and AddTranslator. No allocation timeline yet. → 012-translators-page

## Wave 2: the project record (serial)

- [x] New project form and project record: required client, title, document type, due date and language pair (default from the client's usual pair, with the hint text); optional source file uploaded to a private bucket with the word count read from .docx (PDF word count can wait), and optional translator. Match NewProject. → 013-new-project-form

## Wave 3: project views and settings (parallel)

- [x] Project detail page, phase 1: header with chips, the "Now" card (stage tracker derived from completed steps, next steps with the milestone steps, needs attention), Who is on this, Details and Notes, and the sidebar section links and phone chips. Follow the "Rules the screens rely on" table in docs/design-handoff.md for stage and progress; neither the tracker nor the board is editable. Match ProjectP1 without the feedback log. → 014-project-detail-page
- [x] Projects list page: list sorted by due date with the Active, Delivered, Archived and All filters, search, stage chips derived from steps, and a Show more button after 25 rows. The sidebar's Projects link opens it. Match ProjectsP1. → 015-projects-list-page
- [x] Settings, phase 1: agency name (shown as the brand text in the sidebar and phone top bar in place of the temporary "guru-panini" in AppShell.vue; add the settings column if missing), profile name and photo, email provider choice (default app, Gmail, Outlook) and sign-off used by every email, Open a test email, the Follow-ups section (days setting with default 5 and three editable reminder texts), and Support links. Match SettingsP1. Export is a later item. → 016-settings-phase-1

## Wave 4: things that edit Project detail (one at a time)

- [ ] Archiving: Archive project (inline confirm) on Project detail, Archive client on the selected-client panel (only when the client has no active projects, otherwise the explanatory line), and the same for translators with no active allocations. Archived records leave lists and pickers and return under the Archived filter. No delete button. Match the archive lines on ProjectP1 and ClientsP1.
- [ ] Allocations: assign translators and reviewers to projects, and the two-week allocation timeline on the Translators page with dashed proposed bars. Match the Allocation section of ResourcesP1.
- [ ] Feedback log on Project detail: filters All, Open and Applied, the add row (text, source Reviewer or Client, Log), and entries with version, tag and status. Needs-attention shows the open count, and the sidebar and phone chips gain a Feedback log link. Match the Feedback log section of ProjectP1.

## Wave 5: Overview and follow-ups (serial)

- [ ] Overview, part 1: greeting, Projects at a glance (five stage columns, scrolling sideways on phones), Who is on what, and the first-run checklist that disappears once a client, a translator and a project exist. Match MainP1 and MainFirstRun, without the Needs-you list.
- [ ] Needs you: follow-up items created by the follow-up due rule in docs/design-handoff.md (waiting on the client longer than the Follow-ups setting, default 5 days; three situations, three reminder texts), each with a prepared email (mailto with subject and body from the Settings template, Copy text), the opened state and Mark as sent (which restarts the clock), stored in the database so they survive a reload, the empty message, and the count badge in the sidebar and tab bar. Match the Needs you section of MainP1.
- [ ] Export all data: Excel and zipped CSV, one sheet per area (clients, projects, translators, allocations, feedback, follow-ups, settings), from the Your data section of Settings. Match SettingsP1.

## Wave 6: polish

- [ ] Empty and error states for every page and form, using the patterns on StatesP1, then a responsive pass at 1360 px and 390 px across all pages. Phone wireframes exist only for some pages, so derive the others from the desktop screen and the responsive rules.

## Human tasks (not for the factory)

- Create the Supabase cloud project in an EU region and the Cloudflare account, then set up the deploy
  (static SPA with fallback routing to `index.html`, environment variables, `pnpm-lock.yaml` detection).
  Do this after Wave 3 so there is something to show.
- On the hosted Supabase project, before the first deploy: turn off "Allow new users to sign up" and keep
  the Email provider on, then create the owner account by hand. Afterwards check that `auth.users` holds
  only the owner's real email (no `@example.com` demo account). Set `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables on the host. From the 009 reviews.
- Decide the LLM provider and its EU data terms before phase 3 (see the tech stack record).

## Wave 7: cover-me demo, rung 0 (after Wave 6 is merged and the provider is chosen)

Design record: [docs/decisions/0002-assistant-architecture.md](../docs/decisions/0002-assistant-architecture.md).
The goal is a working end-to-end demo with a single-prompt draft, no formal evaluation and no checks or
loop yet. Screens are the non-`P1` boards in docs/design/screens/ (the phase 3 target). Every run is
started by a person; automatic starts are not built. Do not use real client documents until the
provider's EU data terms are settled. Jobs that edit Project detail run one at a time.

- [ ] Cover mode settings and eligibility: the per-client choice (Off, Prepare replies only, Replies and assisted drafts) with its reason line on the selected-client panel, the master switch (Overview strip and Settings), the document types that may be assisted (technical white papers and internal business documents on, legal and real-estate brochures off), and the approval statement. Add a server-side eligibility function that returns a reason code for every refusal, with tests. Match Clients, Main and Settings (the non-P1 boards).
- [ ] Assistant run and step tables with the minimal state machine: a run row with a stage, short idempotent steps, caps on steps and cost, Zod-validated step output, and a stub model for tests. Row-level security applies, and run rows record prompt version, model, tokens, cost and timings.
- [ ] Rung 0 draft: a thin provider adapter, a versioned prompt file that translates with the client's glossary and style notes, source text read from the uploaded file, a draft stored with its run, and the flags list. Dutch to English and English to Dutch. The summary must state that no separate checks were run. Needs the provider chosen and a spending limit set.
- [ ] Ask the assistant dialog and the Assisted draft section on Project detail: choose Translate, Review only or Terminology check, then an explicit Confirm and run. Show what was done, limitations, the flags as "points left for a person to decide", Open draft and the "why not assisted" line. Review only and Terminology check may be stubbed to the same single prompt at this rung. Match Project.
- [ ] Reviewer approval: named reviewer of record, Record the reviewer's approval by the owner, an append-only approval row (reviewer, owner who recorded it, time) enforced in Postgres, Send back to the translator, and approval rows in Needs you. Nothing is deliverable without an approval row. Match Main and Project.
- [ ] Feedback capture on assisted drafts, with no new screens: store the approved final text beside the draft, and add a Send feedback on this draft link in the Assisted draft section that opens the Support email prefilled with the run id, prompt version and model (never document text) and prompts for a rating and a note. Reuse the Support mailto from Settings.
- [ ] Cover mode activity and Pause for this project on Project detail, showing what was done for the project. Match Project.

## Assistant track: owner tasks and spikes

- Owner task: choose the model provider after reading its EU data terms, and set a spending limit.
- Owner task: use the demo with fake or consented documents and record experience-based ratings. Over
  time curate annotated example documents with quality notes. They become the evaluation set that
  decides whether checks and a loop are added.
- Owner task: decide whether a client's opt-in counts as the confirmation for automatic starts. For the
  demo a person confirms every run, then it runs unattended.
- Owner task: receive demo feedback through the Support email, and keep the run ids it quotes.
- Spike (optional, can run during phase 1): prototype the run and step state machine with a stub model on
  Edge Functions and `pg_cron`; report time limits in docs/spikes/assist-run-state-machine.md.
- Spike (optional): extract text from sample Word and PDF files and report what survives in
  docs/spikes/document-extraction.md.

## Changes from the handoff

The handoff's suggested block is used as written except:

1. The first item is split in two (scaffold, then shell and tokens) and the Supabase item is split in
   two (foundation, then sign-in), so each job is small enough to review.
2. A seed-data item is added, because the handoff requires fake seed data kept separate and the
   reviewers need pages to look at.
3. **Settings now comes before Needs you.** Needs you reads the follow-up days and reminder texts from
   Settings, and in the handoff's order Settings came last.
4. Export is split out of Settings and moved after the features, because it covers every area.
5. Items are grouped into waves, to show which jobs can run in parallel.
6. Deploy and the LLM choice are listed as human tasks.
