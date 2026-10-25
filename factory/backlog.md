# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.

This is phase 1 only (no cover-mode UI). Source of the item text: the suggested backlog in
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

## Wave 0: foundations (serial, merge each before starting the next)

- [ ] Scaffold the app: Vue 3 + TypeScript + Vite + Vue Router, Vitest, Biome and vue-tsc with pnpm, and a placeholder home page. Fill in the "Dev server" section of AGENTS.md and make the validation commands there work.
- [ ] Build the responsive app shell from docs/design-handoff.md (sidebar on desktop; top bar and bottom tab bar below 900 px; Overview, Projects, Clients, Translators, Settings, Support links; a count badge on Overview that takes a number). Add the design tokens as CSS variables and base styles for card, button, chip, field and focus ring. Pages are empty placeholders.
- [ ] Supabase foundation: local stack with `supabase start`, row-level security on every table, generated TypeScript types, and a first migration for clients, translators, projects, allocations, feedback entries, follow-ups and settings, using the phase 1 columns in docs/design-handoff.md (no cover-mode columns).
- [ ] Single-owner sign-in: a minimal sign-in page, public sign-ups disabled, a route guard and sign-out. The sign-in screen is not in the wireframes (**needs design**): build it in the existing visual language and flag it for review.
- [ ] Seed script with clearly fake demo data (separate from migrations), so pages can be developed and reviewed with the dev server.

## Wave 1: people (parallel)

- [ ] Clients page: client list with search, one status chip (Follow-up due, otherwise none), the selected-client panel (contact, how they like it written, history), and the Add client form (required: name, contact name, contact email; optional: usual language pair, usual work type, notes). Match docs/design/screens/ClientsP1 and AddClient.
- [ ] Translators page: people cards with languages, specialisms, availability and load, and the Add translator form (required: name, email; optional: language pairs, specialisms, availability). Match ResourcesP1 and AddTranslator. No allocation timeline yet.

## Wave 2: the project record (serial)

- [ ] New project form and project record: required client, title, document type, due date and language pair (default from the client's usual pair, with the hint text); optional source file uploaded to a private bucket with the word count read from .docx (PDF word count can wait), and optional translator. Match NewProject.

## Wave 3: project views and settings (parallel)

- [ ] Project detail page, phase 1: header with chips, the "Now" card (stage tracker derived from completed steps, next steps with the milestone steps, needs attention), Who is on this, Details and Notes, and the sidebar section links and phone chips. Follow the "Rules the screens rely on" table in docs/design-handoff.md for stage and progress; neither the tracker nor the board is editable. Match ProjectP1 without the feedback log.
- [ ] Projects list page: list sorted by due date with the Active, Delivered, Archived and All filters, search, stage chips derived from steps, and a Show more button after 25 rows. The sidebar's Projects link opens it. Match ProjectsP1.
- [ ] Settings, phase 1: profile name and photo, email provider choice (default app, Gmail, Outlook) and sign-off used by every email, Open a test email, the Follow-ups section (days setting with default 5 and three editable reminder texts), and Support links. Match SettingsP1. Export is a later item.

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
- Decide the LLM provider and its EU data terms before phase 3 (see the tech stack record).

## Parallel track: assistant architecture (phase 3, not queued for the factory)

Design record: [docs/decisions/0002-assistant-architecture.md](../docs/decisions/0002-assistant-architecture.md).
Focus is assisted drafts. This track runs alongside phases 1 and 2 and needs the owner's input. These
lines have no checkbox on purpose, so `/factory next` does not claim them. Turn one into a
checkbox item when its inputs exist.

- Owner task: supply the evaluation material (consented or anonymised eligible documents, a glossary,
  reference translations or ratings) and agree what improvement justifies adding a stage.
- Owner task: choose the model provider after reading its EU data terms.
- Spike: build the evaluation set and the rung 0 baseline (single prompt with glossary and style notes),
  and report results in docs/spikes/assistant-baseline.md.
- Spike: prototype the run and step state machine with a stub model on Edge Functions and `pg_cron`,
  and report time limits and findings in docs/spikes/assist-run-state-machine.md.
- Spike: extract text from sample Word and PDF files and report what survives (headings, tables,
  figures, layout) in docs/spikes/document-extraction.md.
- Phase 3 build, after the spikes: run and step tables with eligibility and caps; the checks and loop
  (each only if the evaluation shows a gain); then the Assisted draft section, Ask the assistant
  dialog, approval rows (append-only), cover mode settings and project pause.

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
