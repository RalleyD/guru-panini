# Design handoff: translation agency platform

Status: wireframes done for desktop and phone, in two builds: **phase 1** (no cover mode) and the
**phase 3 target** (full cover mode). Last updated after the "simplify the UI" round.

This is the reference for what the screens contain and why. For the order to build them in, see
[factory-handoff.md](factory-handoff.md). For the stack, see
[decisions/0001-tech-stack.md](decisions/0001-tech-stack.md).

## What this is

A private, single-owner dashboard for a small translation agency. The owner translates Dutch to
English and back (legal, real-estate brochures, technical white papers, general business documents)
and manages other translators for other languages (for example Spanish).

The owner may be unavailable for periods. The platform keeps routine work moving: it prepares client
replies, and in phase 3 it runs an AI-assisted translate-and-check workflow for clients who have opted
in. It must stay trustworthy to the professional translators it serves.

Design canvas (private, the owner shares access): https://claude.ai/artifact/LgKcpCy3tuLDSRBSuwMBkc

## Product principles (fixed)

1. **A person decides.** Assistance is opt-in per client and off by default. Every assistant request
   is confirmed by a person.
2. **A person signs off.** Every assisted draft has a named human reviewer who approves it before it
   reaches the client. This is always on and is not a setting.
3. **Some work stays human.** The owner chooses which document types may ever be assisted. Defaults:
   technical white papers and internal business documents yes; legal and real-estate brochures no.
4. **The system prepares, it never sends.** Client emails are drafts that open in the owner's email
   app. A person presses send. Opening the app does not count as sending.
5. **Calm and minimal.** Few controls per screen. One place for "what needs me".

## Scope

- One user: the agency owner. Translators and clients are records, not logins.
- English interface only.
- Out of scope for now: translator or client logins, a notification centre, a Dutch interface.

## Phases

| Phase | Contains | Canvas |
| --- | --- | --- |
| 1 (build waves 1 and 2) | Overview, Project detail, Clients, Translators, Settings (profile, email and sign-off, export, support), first-run checklist, new project, add client, add translator, empty and error states | Rows 1 and 2 |
| 3 (target) | Everything in phase 1, plus cover mode: master switch, per-client cover choice, assisted drafts, approvals, cover activity, assistant request dialog, document-type policy | Row 3 |

Phase 1 has **no** cover-mode UI at all: no master switch, no cover status in the sidebar, Overview,
Clients or Project, no assistant panels, no assistant policy section, no "Assistant" feedback source.

In the source files, each screen is one component with a `phase` setting (`full` or `one`). The
`…P1` files are thin wrappers that set `phase="one"`. Phase-1 and phase-3 screens differ only by what
`phase` switches on.

## Screens

Page names below are the source file names in `docs/design/screens/` (without `.dc.html`).

### Navigation (every screen)

- Sidebar: logo and agency name; four primary links (Overview, Projects, Clients, Translators);
  at the foot Settings and Support (phase 3 adds a Cover mode status link above them).
- **Count badge** on Overview showing how many items are in "Needs you". This is the only
  notification surface.
- Project detail only: a second block of links to its sections (phase 1: Feedback log, Who is on this,
  Details, Notes; phase 3 adds Assisted draft and Cover activity). No other page has a section list.
- Phone (below 900 px): the sidebar becomes a top bar (logo, Settings icon) plus a bottom tab bar of
  the four primary links with the badge; Project detail also shows its sections as a row of chips.
- The sidebar is sticky on desktop. "Projects" opens Project detail: there is no projects list page;
  the Overview board is the list (see open items).

### Overview (`Main`, `MainP1`, `MainFirstRun`)

Order top to bottom, chosen so the first thing visible is what needs the owner:

1. Greeting and one sentence ("3 things need you. Six projects are moving."). Buttons: Add client,
   New project.
2. **Needs you**: one list, no collapsible sections. Each row has a type chip, the project and client,
   one line of reason, and actions.
   - *Follow-up* rows (phase 1 and 3): Open in email app, Copy text. After the owner clicks Open in
     email app the row shows "Opened, not marked as sent" and gains **Mark as sent** (primary) and
     "Open again". The row stays until the owner marks it sent, because a click does not prove it was
     sent. A short preview of the message sits under the row.
   - *Approval* rows (phase 3): "Waiting for <reviewer> to approve", with the number of points left to
     decide, and an Open summary button.
   - Empty: "Nothing needs you right now."
3. Phase 3 only: a slim **cover mode strip** with the master switch (pause everything).
4. **Projects at a glance**: five columns (Intake, In translation, In review, With client,
   Delivered). Cards show client, title, language pair, document type, progress, people, due date, a
   "Follow up" chip when relevant, and (phase 3) an "Assisted draft" line. Scrolls sideways on phones.
5. **Who is on what**: workload per translator.

First run (`MainFirstRun`): the body is replaced by a "Getting started" checklist of three steps
(Add a client, Add a translator, Create a project). Done steps show a tick. The list disappears once
all three are done.

### Project detail (`Project`, `ProjectP1`)

1. Header: title, chips (stage, language pair, document type, words and due date), Message client.
2. **Now** card: stage tracker (Intake, Allocated, Draft, Review, Client feedback, Delivery), **Next
   steps** (checkboxes) and **Needs attention** (open feedback count; phase 3 adds "waiting for
   approval").
3. Phase 3: **Assisted draft** section.
   - If assisted: how the draft was made (Drafted, Checked terminology, Checked subject matter,
     Checked wording, each with a result like "1 point left"), What was done, Strengths,
     Limitations, "2 points left for a person to decide", Open draft, Send back to the translator.
   - If not assisted, one line says why: "Legal documents are never assisted." or "This client has not
     opted in to assisted drafts."
   - **Ask the assistant** opens a dialog: choose Translate, Review only or Terminology check, then
     Cancel or **Confirm and run**. Nothing runs without the explicit Confirm. Not offered for
     document types that are never assisted.
4. Phase 3: **Cover mode activity**: what it did (read the brief, made and checked a draft, asked the
   reviewer to approve, prepared a reply), the prepared reply with Open in email app, Copy text and
   Mark as sent, and **Pause for this project**. The owner chose to keep this project-level pause for
   flexibility as a client's portfolio diversifies.
5. **Feedback log**: filters All, Open, Applied; an add row (text, source, Log); entries with date,
   version, source (Reviewer, Client; phase 3 adds Assistant), tag and status.
6. Three plain cards: Who is on this, Details, Notes.

### Clients (`Clients`, `ClientsP1`)

- List: client, work, last contact, and **one status chip** with priority "Follow-up due", then
  "Cover: replies" or "Cover: replies + drafts" (phase 3), then nothing.
- Selected client panel: a "waiting to hear from them" box with the email actions; phase 3 adds
  **Cover mode for this client**, a single choice: *Off*, *Prepare replies only*, *Replies and
  assisted drafts*, followed by a one-line reason (for example "Legal documents are never assisted, so
  no drafts will be started for this client") and the line "A named reviewer approves every draft
  before it reaches the client."; then contact, writing preferences and history.

### Translators (`Resources`, `ResourcesP1`)

People cards (languages, specialisms, availability, load), an Add translator card, and a two-week
allocation timeline (working days, bars coloured by document type, a dashed bar is a proposal).

### Settings (`Settings`, `SettingsP1`)

Profile (photo, name). Email: open drafts in the default email app, Gmail in the browser or Outlook
in the browser; a sign-off; an Open a test email button. Phase 3: **Cover mode** (master switch, the
document types that may be assisted, the approval line, a link to choose clients). Your data: Export
to Excel (.xlsx) or CSV (.zip), one sheet per area. Support: Email support, Report a problem.

### Forms (`NewProject`, `AddClient`, `AddTranslator`)

Shared by both phases. Required fields first, optional fields in a second card ("all of this can be
added later").

- New project: client, title, document type, due date, language pair (defaults to the client's usual
  pair and says so). Optional: source file (word count is read from it, or added later), translator.
- Add client: client name, contact name, contact email. Optional: usual language pair, usual type of
  work, notes. Cover mode is not set here; it defaults to Off.
- Add translator: name, email. Optional: language pairs, specialisms, availability.

### Empty and error states (`States`, `StatesP1`)

One sheet each. Empty: Overview, Projects, Clients, Translators, Feedback log, search. Errors: save
failed, export failed, file could not be read, email app did not open, offline. Phase 3 adds: assisted
draft did not finish, cover mode paused. Pattern: say what happened, say nothing was lost, offer one
next step.

## Email behaviour

"Open in email app" is a `mailto:` link with subject and body filled in. Settings can switch it to a
Gmail or Outlook compose URL. **Copy text** is always next to it as a fallback, because `mailto:` can
truncate long bodies and cannot attach files. Using the link marks the item "opened" and it stays in
Needs you until the owner presses **Mark as sent**.

In phase 1 the message text is a plain template with client and project filled in. In phase 3 cover
mode prepares it.

## Copy rules

Use these words so the product reads the same everywhere:

- "Needs you", "Follow-up", "Approval", "Open in email app", "Copy text", "Mark as sent".
- Say "assisted draft", "checked terminology", "points left for a person to decide". Avoid "loop",
  "passes", "needs a human eye".
- Always say who: "a named reviewer approves every draft before it reaches the client".
- Keep limitations honest. Plain language must not become vague.

## Design tokens

- Ground `#F3F4F8` (silver); surface `#FFFFFF`; line `#E3E5EE`; ink `#272B3F`; muted `#5C6178`.
- Lavender: primary `#5A4A99`, hover `#4A3B87`, tint `#ECE8F8` / `#E7E1F7`, ink `#4A3B87`.
- Duck egg: tint `#E2F3F1`, border `#BFE3E0`, ink `#1F5654`.
- Soft blue: tint `#E4EEFA` / `#DAE8F8`, ink `#284F7E`.
- "Needs attention" (the only warm colour): tint `#FBEEE6`, ink `#8F4A2A`.
- Type: Newsreader for headings (40 / 24 / 20 px, 30 / 22 px on phones), Inter for body (14 px).
- Cards radius 20 px (16 on phones), 1 px line border. Buttons radius 12 px, minimum height 44 px.
- Touch targets at least 44 px. Visible focus ring `2px #5A4A99`. Text contrast meets WCAG AA; colour
  is never the only signal (chips always carry text).
- Breakpoints: 1100 px (tighter padding) and 899 px (phone layout).

## Sample data

Everything on the screens is sample data: names (Marieke Visser, Jonas Bakker, Sofie Haas, Lucía
Romero), clients, dates, word counts and assistant summaries. Bracketed items such as `[Agency name]`
and `[contact email]` are placeholders. Do not ship any of it as seed data.

## Using the screen files

`docs/design/screens/*.dc.html` are in the design tool's own format. They load a `support.js` runtime
that is not in this repo, so they do not run standalone. Use them as a reference for markup, copy,
spacing and tokens (the CSS is in each file's `<helmet>`), or open the canvas. Rebuild the UI in
Vue; do not port these files. `docs/design/canvas.json` records which file is which board and where.

## Data model implied by the design

Sketch only; the schema is the build's job.

- **Client:** name, contact name and email, usual language pair, usual work type, notes, writing
  preferences, glossary flag, `cover_mode` (`off` | `replies` | `replies_and_drafts`, default `off`).
- **Project:** client, title, source and target language, document type, word count (optional),
  due date, stage, progress, translator(s), reviewer, notes, next steps, cover paused flag (phase 3).
- **Translator:** name, email, language pairs, specialisms, availability note.
- **Allocation:** translator, project, start and end, role (translator or reviewer), proposed flag.
- **Feedback entry:** project, version, date, source (reviewer, client, assistant), person, tag, text,
  status (open or applied).
- **Follow-up (Needs you item):** project, reason, subject and body, state (`ready` → `opened` with
  time → `done`).
- **Settings:** owner name and photo, email provider, sign-off, `cover_paused` (master), document types
  that may be assisted. There is **no** approval setting: approval is always required.
- **Assistant run (phase 3):** project, request type, checks and their results, summary, strengths,
  limitations, points left, approval request and outcome.

## Decisions made in design review

- Cover mode is one choice per client, not three switches; the master switch only pauses everything.
- Approval is a plain statement, not a disabled switch.
- Flagged passages are shown inside the approval row, not as separate rows.
- "Why not assisted" shows on the project and the client, not on every pipeline card.
- The assistant dialog has no free-text note; it is choose, then Confirm.
- Section lists in the sidebar exist on Project detail only.
- Project-level pause is kept (owner's decision).

## Open items

1. **Projects list.** The nav item "Projects" opens a project. Decide whether the Overview board is
   enough or a list page is needed.
2. **Approval without a login.** Needs you shows "waiting for <reviewer> to approve" but reviewers
   have no accounts. Either the owner records the reviewer's approval, or approvals wait for
   translator logins.
3. **Phase-1 reminders** are templates; where the text lives and how it is edited is undecided.
4. **Dialog accessibility.** The assistant dialog is drawn, but focus handling (trap, return focus)
   must be built.
5. **Not designed:** password and sign-in screens, editing existing records (edit screens reuse the
   form layouts), notification emails, any Dutch interface.
