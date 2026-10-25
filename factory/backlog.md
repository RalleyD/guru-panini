# Backlog

`/factory next` builds the first unchecked item and checks it off with its job id.

How to read this file:

- Items are one line each, in dependency order. `spec-writer` turns an item into the detailed spec,
  so keep items short; point at the docs instead of repeating them.
- Work in **waves**. Every job branches from `main` when it starts, so finish and merge a wave's
  prerequisites before starting jobs that need them. Inside Wave 1, Wave 2 and Wave 3 jobs can run in
  parallel sessions, but each wave waits for the one before it to be merged.
- Jobs that touch the local Supabase stack (schema, migrations, auth) should not run at the same time
  as each other: `supabase start` uses fixed ports and containers.
- Sources: [design handoff](../docs/design-handoff.md), [tech stack](../docs/decisions/0001-tech-stack.md).
  Wireframe markup for each screen is in `docs/design/screens/`.
- Items marked **(needs design)** have no wireframe yet. Build them in the existing visual language and
  flag the result for a human to review.

## Wave 0: foundations (serial, merge each before starting the next)

- [ ] Scaffold the Vue 3 + Vite + TypeScript app with pnpm, Vue Router, Biome, Vitest and vue-tsc and a placeholder home page, then update the dev server and validation commands in AGENTS.md to match the real `package.json`
- [ ] Add the design tokens, base components and app shell (sidebar, top bar, bottom tab bar, section chips, 899 px breakpoint) with empty Overview, Projects, Clients and Translators routes
- [ ] Set up local Supabase (EU config) with generated TypeScript types and the core schema with row-level security: clients, projects, translators, allocations, feedback entries and settings, per the entities in the design handoff
- [ ] Add an append-only audit log table enforced in Postgres (no update or delete) and a helper to record who did what and when
- [ ] Add owner sign-in with Supabase Auth (public sign-ups disabled), a route guard and sign-out

## Spikes (docs only, safe in parallel once the scaffold is merged)

- [ ] Spike: extract text from sample Word and PDF files server-side and report what survives (headings, tables, figures, layout) in docs/spikes/document-extraction.md
- [ ] Spike: prototype the assist-run state machine (a run row with a stage, short steps queued by pg_cron and an Edge Function, using a stub instead of a real model) and report limits and findings in docs/spikes/assist-run-state-machine.md

## Wave 1: core records (parallel after Wave 0 is merged)

- [ ] Clients page: list with follow-up and cover status, selected-client panel (contact, writing preferences, history), and an add and edit client form **(needs design)**
- [ ] Translators page: profiles, language pairs and specialisms, the two-week allocation timeline, and an add and edit translator form **(needs design)**
- [ ] Projects: pipeline board (Intake, In translation, In review, With client, Delivered) and a new-project intake form **(needs design)**
- [ ] Project detail: stage tracker, details, team and allocations, next steps and notes
- [ ] Project feedback log with source, tag and status filters
- [ ] Settings page: profile name and photo, sign-off, email provider choice, and export of all data as Excel or zipped CSV

## Wave 2: overview and email (after Wave 1 is merged)

- [ ] Overview page: pipeline summary, workload per translator and follow-ups
- [ ] Follow-ups and prepared replies: draft subject and body, "open in email app" links for the default mail app, Gmail and Outlook, and ready, opened and dismissed statuses; the system never sends

## Wave 3: assistant and cover mode (after Wave 2 is merged and the LLM provider is decided)

- [ ] Document upload and private storage with signed URLs, linked to a project
- [ ] Assistant policy: which document types may ever be assisted (technical white papers and internal business documents on by default; legal and real-estate brochures off), enforced on the server
- [ ] Assistant run records and the human approval gate: named reviewer of record, an approval that cannot be switched off, and an audit entry for every approval, enforced in the database
- [ ] Assistant workflow: analyse, translate, then terminology, subject-matter and fluency passes until clean, with stored passes, summary, strengths, limitations and "needs a human eye" flags
- [ ] Cover mode: master switch, per-client opt-in and options, a project activity log with "Pause for this project", and triggers for new projects and overdue follow-ups
- [ ] Notifications, empty states and error states across all pages **(needs design)**
