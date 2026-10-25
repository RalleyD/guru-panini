# Factory handoff

For the session or sessions running `/factory`. This is the bridge between the design and the build:
what to read, what is decided, what to build first, and where a human must decide.

## Read in this order

1. `AGENTS.md`: setup, validation commands and conventions.
2. [docs/decisions/0001-tech-stack.md](decisions/0001-tech-stack.md): the stack and why.
3. [docs/design-handoff.md](design-handoff.md): what every screen contains, the copy, the tokens and
   the data model the design implies. This is the product spec.
4. `docs/design/screens/*.dc.html`: the wireframes. See "Using the screens" below.

## What to build, and what not to

**Build phase 1 only.** Phase 1 is Overview, Project detail, Clients, Translators, Settings (profile,
email and sign-off, export, support), the first-run checklist, the three forms, and the empty and
error states. The matching boards are the `…P1` files plus `MainFirstRun`, `NewProject`, `AddClient`,
`AddTranslator` and `StatesP1`.

Phase 1 has **no cover-mode UI**: no master switch, no cover status in the sidebar, Overview, Clients
or Project, no assistant panels, no document-type policy, no "Assistant" feedback source, no approval
rows. Do not add feature flags or empty placeholders for it. It is built later (see "Later").

The non-`P1` screens are the **phase 3 target**. Read them to avoid design choices that would block
cover mode (for example, the sidebar foot and the Needs-you list must be able to take more content),
but do not build them yet.

## Suggested backlog for phase 1

Ordered by dependency. Each line is written to be passed to `/factory` as-is, and each is sized for
one job. Copy the block into `factory/backlog.md` when you are ready; nothing has been queued.

```markdown
- [ ] Scaffold the app: Vue 3 + TypeScript + Vite + Vue Router, Vitest, Biome and vue-tsc with pnpm. Build the responsive app shell from docs/design-handoff.md (sidebar on desktop; top bar and bottom tab bar below 900 px; Overview, Projects, Clients, Translators, Settings, Support links; a count badge on Overview that takes a number). Add the design tokens as CSS variables and base styles for card, button, chip, field and focus ring. Pages are empty placeholders. Fill in the "Dev server" section of AGENTS.md.
- [ ] Supabase foundation: local stack with `supabase start`, single-owner sign-in page with public sign-ups disabled, row-level security on every table, generated TypeScript types, and a first migration for clients, translators, projects, allocations, feedback entries, follow-ups and settings, using the phase 1 columns in docs/design-handoff.md (no cover-mode columns).
- [ ] Clients page: client list with search, one status chip (Follow-up due, otherwise none), the selected-client panel (contact, how they like it written, history), and the Add client form (required: name, contact name, contact email; optional: usual language pair, usual work type, notes). Match docs/design/screens/ClientsP1 and AddClient.
- [ ] Translators page: people cards with languages, specialisms, availability and load, and the Add translator form (required: name, email; optional: language pairs, specialisms, availability). Match ResourcesP1 and AddTranslator. No allocation timeline yet.
- [ ] New project form and project record: required client, title, document type, due date and language pair (default from the client's usual pair, with the hint text); optional source file uploaded to a private bucket with the word count read from .docx (PDF word count can wait), and optional translator. Match NewProject.
- [ ] Project detail page, phase 1: header with chips, the "Now" card (stage tracker derived from completed steps, next steps with the milestone steps, needs attention), Who is on this, Details and Notes, and the sidebar section links and phone chips. Follow the "Rules the screens rely on" table in docs/design-handoff.md for stage and progress; neither the tracker nor the board is editable. Match ProjectP1 without the feedback log.
- [ ] Projects list page: list sorted by due date with the Active, Delivered, Archived and All filters, search, stage chips derived from steps, and a Show more button after 25 rows. The sidebar's Projects link opens it. Match ProjectsP1.
- [ ] Archiving: Archive project (inline confirm) on Project detail, Archive client on the selected-client panel (only when the client has no active projects, otherwise the explanatory line), and the same for translators with no active allocations. Archived records leave lists and pickers and return under the Archived filter. No delete button. Match the archive lines on ProjectP1 and ClientsP1.
- [ ] Allocations: assign translators and reviewers to projects, and the two-week allocation timeline on the Translators page with dashed proposed bars. Match the Allocation section of ResourcesP1.
- [ ] Feedback log on Project detail: filters All, Open and Applied, the add row (text, source Reviewer or Client, Log), and entries with version, tag and status. Needs-attention shows the open count. Match the Feedback log section of ProjectP1.
- [ ] Overview, part 1: greeting, Projects at a glance (five stage columns, scrolling sideways on phones), Who is on what, and the first-run checklist that disappears once a client, a translator and a project exist. Match MainP1 and MainFirstRun, without the Needs-you list.
- [ ] Needs you: follow-up items created by the follow-up due rule in docs/design-handoff.md (waiting on the client longer than the Follow-ups setting, default 5 days; three situations, three reminder texts), each with a prepared email (mailto with subject and body from the Settings template, Copy text), the opened state and Mark as sent (which restarts the clock), stored in the database so they survive a reload, the empty message, and the count badge in the sidebar and tab bar. Match the Needs you section of MainP1.
- [ ] Settings, phase 1: profile name and photo, email provider choice (default app, Gmail, Outlook) and sign-off used by every email, Open a test email, the Follow-ups section (days setting with default 5 and three editable reminder texts), Export all data to Excel and zipped CSV (one sheet per area), and Support links. Match SettingsP1.
- [ ] Empty and error states for every page and form, using the patterns on StatesP1, then a responsive pass at 1360 px and 390 px across all pages.
```

## Later (phase 3, do not queue yet)

Cover mode settings (master switch, per-client choice, document-type policy); the assistant workflow
as a stage-based run table advanced by Edge Functions and `pg_cron`; the append-only approval audit
trail; the Assisted draft and Cover activity sections, Ask the assistant dialog and project pause;
approval rows in Needs you. Spike PDF text extraction early (it is the least certain part).

## Writing specs and reviewing UI

- **Cite the screen.** A spec should name the board it matches (for example "match
  `docs/design/screens/ClientsP1.dc.html`") and quote copy and tokens from the handoff doc. The
  canvas is private, so reviewers and agents cannot rely on opening it.
- **Acceptance criteria worth including:** the exact button and heading text from the handoff's copy
  rules; the 44 px minimum touch target; the 899 px breakpoint behaviour (sidebar to top bar and tab
  bar); the focus ring; empty and error states; and that no cover-mode UI appears in phase 1.
- **UX and UI reviewers** should check pages with the dev server at 1360 px and 390 px wide. Until the
  Vue app exists there are no pages (see AGENTS.md); they review from code.
- **Do not copy sample data.** Names, clients, dates and the assistant text on the wireframes are made
  up. Seed data for development must be clearly fake and separate.

## Already decided: do not reopen

- The stack in 0001. Single owner. English only. EU data region.
- Phase 1 excludes cover mode.
- Email is `mailto:` or a compose URL plus Copy text; the app never sends email.
- "Opened" is not "sent": an item stays in Needs you until Mark as sent.
- Approval by a named reviewer is always required and is not a setting (phase 3).
- Section lists in the sidebar exist on Project detail only.

## Decided by the owner (see "Owner's answers" in design-handoff.md)

- Follow-up due is one global setting, default 5 days; reminder texts are edited in Settings.
- Stage and progress are derived from completed steps; the board and tracker are read-only.
- There is a Projects list page (due date order, Show more after 25).
- No word count without a source file; it is never typed in.
- Clients, projects and translators are archived, not deleted; archive controls sit on the selected
  client panel and on Project detail.
- A reviewer's approval is recorded by the signed-in owner (phase 3).

## Still needs a human decision (the approver should escalate these, not guess)

1. Anything the handoff lists under "Open items" that a job turns out to need, for example the
   wording of the milestone steps or the translator archive control.
2. Whether the follow-up days apply per situation rather than globally, if the owner finds one number
   too blunt after using it.

## Using the screens

The `.dc.html` files are in the design tool's format and do not run on their own. Read them for
markup, copy, spacing and states; the CSS is in each file's `<helmet>`. Each screen is one component
with a `phase` setting, and the `…P1` and `…Phone` files are wrappers that import it. Rebuild in Vue;
do not port them. `docs/design/canvas.json` lists which board is which.

## Docs each job must update

- `AGENTS.md` whenever setup, the dev server or validation commands change.
- `docs/design-handoff.md` if a job changes what a screen contains. The design and the product should
  not drift apart silently.
