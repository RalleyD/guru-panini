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
| 1 (build waves 1 and 2) | Overview, Projects list, Project detail, Clients, Translators, Settings (profile, email and sign-off, follow-ups, export, support), first-run checklist, new project, add client, add translator, empty and error states | Rows 1 and 2 |
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
  at the foot Settings, Support and a Sign out button (phase 3 adds a Cover mode status link above
  them).
- **Count badge** on Overview showing how many items are in "Needs you". This is the only
  notification surface.
- Project detail only: a second block of links to its sections (phase 1: Feedback log, Who is on this,
  Details, Notes; phase 3 adds Assisted draft and Cover activity). No other page has a section list.
- Phone (below 900 px): the sidebar becomes a top bar (logo; on the right a Settings icon and a
  Sign out icon) plus a bottom tab bar of the four primary links with the badge; Project detail also
  shows its sections as a row of chips.
- The sidebar is sticky on desktop. "Projects" opens the Projects list; a row opens Project detail.
- As built: the brand text in the sidebar and the phone top bar is the agency name from Settings,
  trimmed. It is empty while it loads and reads "guru-panini" when no agency name is set or it cannot
  be loaded. A long name wraps in the sidebar without widening it, and is cut off with an ellipsis in
  the phone top bar so the Settings and Sign out icons stay on screen. The sign-in page always reads
  "guru-panini".

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

### Projects list (`Projects`, `ProjectsP1`)

A list, not a board, for finding any project. Sorted by **due date, soonest first** (not by creation
date). Filters: Active (default), Delivered, Archived, All; a search box. Each row: title, client and
language pair, a stage chip, document type, people, due date and a "Follow up" chip when relevant.
Lists show 25 at a time with a **Show more** button; there are no numbered pages. The Overview board
stays as the at-a-glance view; this page is for the full list.

Phase 1 as built (`/projects`): all of the owner's projects load in one query, and filtering, search,
sorting and paging happen in the browser. Filters: Archived is every project with `archived_at` set,
whatever its stage; Delivered is a non-archived project whose stage chip reads "Delivered" (every
stage done, as on Project detail); Active is every other non-archived project; All is every project.
Each pill shows its total ("Active 6"), which does not change with the search. Search narrows the
chosen filter to projects whose title or client name contains the trimmed text, case-insensitively.
Rows sort by due date, soonest first, then by title, and each row is one link to Project detail. The
stage chip uses the same rule as Project detail. People shows the project's allocations, proposals
included, translators before reviewers then by start date: at most two initials avatars (translator
in duck, reviewer in lavender, the second overlapping the first), then "+<n>", with every full name
in visually hidden text; "None" when there are no allocations. The due date uses the "4 Nov 2026"
format, after a "Follow up" chip when the project is not archived and has a follow-up waiting (state
ready or opened), the same rule as the Clients page's "Follow-up due" chip. 25 rows show at first;
**Show more** reveals the next 25 and moves focus to the first new row, and disappears once every
matching row shows; changing the filter or the search starts again at 25. A footer line reads
"Showing <shown> of <matching>." States: nothing until the first load ends; "Projects could not be
loaded. Nothing was lost." with Try again; "No projects yet" with New project (no filters or search)
when there are no projects at all; "Nothing here." when the chosen filter is empty; and "No projects
match “…”" with "Check the spelling, or clear the search." and Clear search when the search finds
nothing. There are no archive controls, sorting controls or extra columns yet.

### Project detail (`Project`, `ProjectP1`)

1. Header: title, chips (stage, language pair, document type, and words and due date; the word count
   appears only when a source file was uploaded), Message client.
2. **Now** card: stage tracker (Intake, Allocated, Draft, Review, Client feedback, Delivery), **Next
   steps** (checkboxes) and **Needs attention** (open feedback count; phase 3 adds "waiting for
   approval").
3. Phase 3: **Assisted draft** section.
   - If assisted: how the draft was made (Drafted, Checked terminology, Checked subject matter,
     Checked wording, each with a result like "1 point left"), What was done, Strengths,
     Limitations, "2 points left for a person to decide", **Record Marieke’s approval**, Open draft,
     Send back to the translator. The owner records the reviewer's approval on their behalf (the
     reviewer has no login); the log shows who approved and that the owner recorded it.
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
7. A quiet footer line with **Archive project**. It asks once inline ("Archive this project? Nothing is
   deleted.") and then hides the project from the lists (see Archiving).

Phase 1 as built (`/projects/:id`): the stage tracker and the stage chip are derived from the
completed steps and are read-only. Intake is always done; Allocated is done when the project has a
confirmed (not proposed) translator; Draft, Review, Client feedback and Delivery are done when their
step is ticked, each on its own, so ticks may come in any order. The current stage is the first stage
not done, and the stage chip follows the board column of the current stage (Allocated → Intake,
Draft → In translation, Review → In review, Client feedback and Delivery → With client); it reads
"Delivered" only once every stage is done, including the Delivered step. Next steps lists the four
milestone steps "Draft finished", "Review finished", "Client feedback dealt with" and "Delivered",
then any free-form steps (by due date, undated last) with a "By <date>" line; free-form steps are
shown and can be ticked but there is no control to add, edit or delete them yet. Ticking saves at
once; a failed save puts the checkbox back and says "Your changes were not saved. Nothing was lost.
Try again." Needs attention shows "<n> open feedback point(s)" without a link until the Feedback log
exists, otherwise "Nothing needs attention." Who is on this lists translators before reviewers
("…, proposed" for a proposal), or "No translator yet.", then the client contact. Details shows
Client, Languages, Document type, Words (only when a file gave a count), Glossary ("Supplied by
client" or "None yet") and Deadline, in place of the wireframe's Subject and Formats. Notes shows the
project's notes or "No notes yet." The section links (sidebar block and phone chips) are Who is on
this, Details and Notes. There is no Feedback log section, Change allocation link or archive footer
yet. An unknown or malformed id shows "Project not found" with a Back to projects link.

### Clients (`Clients`, `ClientsP1`)

- List: client, work, last contact, and **one status chip** with priority "Follow-up due", then
  "Cover: replies" or "Cover: replies + drafts" (phase 3), then nothing.
- Selected client panel: a "waiting to hear from them" box with the email actions; phase 3 adds
  **Cover mode for this client**, a single choice: *Off*, *Prepare replies only*, *Replies and
  assisted drafts*, followed by a one-line reason (for example "Legal documents are never assisted, so
  no drafts will be started for this client") and the line "A named reviewer approves every draft
  before it reaches the client."; then contact, writing preferences and history.
- At the foot of the panel, archiving: if the client has active projects, a plain line says to finish
  or archive them first; otherwise an **Archive client** button (not drawn) appears in its place.
- Phase 1 as built: the list has no Last contact column and the panel no "Prefers" row (there is no
  data for either yet). "How they like it written" shows the writing preferences and notes as text,
  then the glossary chip. History rows show the due date; stages come with Project detail. The
  "waiting to hear from them" box and the archive line arrive with the Needs you and Archiving jobs.

### Translators (`Resources`, `ResourcesP1`)

People cards (languages, specialisms, availability, load), an Add translator card, and a two-week
allocation timeline (working days, bars coloured by document type, a dashed bar is a proposal).

- Phase 1 as built: each card shows the initials, name, pair line (`↔` when both directions are
  stored), specialism chips, the availability note as written (it is a free-text note, so there is
  no coloured status such as "Limited capacity"), and a load count of non-archived projects with a
  confirmed allocation that has not ended. The intro has no "least room" sentence. The Add
  translator form offers Dutch → English, English → Dutch and English → Spanish, with no "Other"
  box yet. The allocation timeline arrives with the Allocations job.

### Settings (`Settings`, `SettingsP1`)

Profile (photo, name). Email: open drafts in the default email app, Gmail in the browser or Outlook
in the browser; a sign-off; an Open a test email button. **Follow-ups**: one global number, "Follow up
after 5 days without a reply", and three editable reminder texts (draft waiting for feedback, quote
not accepted, question waiting for the client) using `[contact name]`, `[project]` and `[date]`; the
sign-off is added at the end. Phase 3: **Cover mode** (master switch, the
document types that may be assisted, the approval line, a link to choose clients). Your data: Export
to Excel (.xlsx) or CSV (.zip), one sheet per area. Support: Email support, Report a problem.

Phase 1 as built (`/settings`): the header "Settings" / "Just the essentials." sits above four cards
in a column at most 760 px wide: Profile, Email, Follow-ups and Support. There is no Your data card
yet (Export is a later item) and no Cover mode card. Nothing below the header shows until the
settings load ends; a failed load shows "Settings could not be loaded. Nothing was lost." with Try
again, and a page opened with a hash (the sidebar's Support link opens `/settings#support`) scrolls
to that card. With no saved settings the fields show the defaults: 5 days, My default email app,
the sign-off "Kind regards," then the owner name and the agency name on their own lines, and the
three wireframe reminder texts. **Profile**: a 72 px avatar with the photo, or the initials of Your
name on the lavender tint, then a Profile photo file input, Your name, and **Agency name** ("Shown at
the top of every page."), which the wireframe does not draw. A photo must be a JPEG, PNG or WebP
image (checked from the file's contents) up to 5 MB, or "Choose a JPG, PNG or WebP image up to 5 MB."
shows and nothing is uploaded; photos are private and there is no Remove photo control.
**Email**: the intro, the three "Open drafts in" options with the wireframe titles and lines (the
chosen one tinted lavender), a 3-row "Sign-off for emails", and **Open a test email**, which uses the
values on the page ("Test email from <agency name>", body "This is how an email will open." plus the
sign-off), with the note about attachments and long emails. An empty sign-off means no sign-off.
**Follow-ups**: "Follow up after [1–30] days without a reply", then "Reminder text" with three 4-row
texts (Draft waiting for feedback, Quote not accepted, Question waiting for the client); a reminder
cannot be empty ("Enter the reminder text") and days outside 1 to 30 or not whole show "Enter a whole
number from 1 to 30". **Support**: Email support (primary) and Report a problem, with the subjects
"Support request" and "Something looks wrong" and no recipient address yet (the owner supplies it).
There is no Save button: each text field saves when it loses focus after an edit, and a radio or a
photo when it is chosen. An invalid value is not saved and its message shows under the field. A
successful save shows "Saved." in that card, and a saved agency name changes the brand at once; a
failed save shows "Your changes were not saved" / "Nothing was lost. Your edits are still on this
page. Try again." with Try again, and the typed value stays.

### Forms (`NewProject`, `AddClient`, `AddTranslator`)

Shared by both phases. Required fields first, optional fields in a second card ("all of this can be
added later").

- New project: client, title, document type, due date, language pair (defaults to the client's usual
  pair and says so). Optional: source file (the word count is read from it; without a file no word
  count is shown and it is never typed in), translator.
- New project as built: the Client select starts at "Choose a client" rather than a preselected
  client, and the Language pair at "Choose one". A client with no usual pair leaves the pair as it
  is and shows no hint; a client whose usual pair is not one of the four (for example `FR → EN`)
  gets it added to the list. After reading a `.docx` the hint becomes "<n> words in this file.".
  Only `.docx` and `.pdf` are accepted (PDFs get no word count yet); any other file, or a `.docx`
  that cannot be read, shows "That file could not be read" / "Word and PDF files work best. You can
  create the project now and add the file later." and the file is cleared. With no active clients,
  "No clients yet." and an Add client link sit under the Client select. The translator is saved as
  a confirmed allocation from today (or the due date if earlier) to the due date. After creating,
  the owner lands on the new project's Project detail.
- Add client: client name, contact name, contact email. Optional: usual language pair, usual type of
  work, notes. Cover mode is not set here; it defaults to Off.
- Add translator: name, email. Optional: language pairs, specialisms, availability.

### Empty and error states (`States`, `StatesP1`)

One sheet each. Empty: Overview, Projects, Clients, Translators, Feedback log, search. Errors: save
failed, export failed, file could not be read, email app did not open, offline. Phase 3 adds: assisted
draft did not finish, cover mode paused. Pattern: say what happened, say nothing was lost, offer one
next step.

### Sign in (not in the wireframes)

Built in job 009 in the existing visual language, without a wireframe; it awaits the owner's review.
`/sign-in` has no sidebar, top bar or tab bar. One white card, at most 400 px wide, sits centred
across and about 15% of the screen height down, on the ground colour (16 px clear of the edges on
phones), so it does not move when the error appears. Top to bottom: the brand text "guru-panini"
(no logo mark), an Email field, a Password field and one primary **Sign in** button. A visually
hidden "Sign in" heading serves screen readers. There is no sign-up, forgot-password or magic link.
The button is disabled while the request is in flight. A wrong password or an unknown email shows
"Email or password is incorrect" between the password field and the button, in the "Needs
attention" colours; any other failure shows "Could not sign in. Try again in a moment." The typed
values stay. Success, and opening `/sign-in` while signed in, go to Overview. Every other page sends
a signed-out visitor here.

## Rules the screens rely on

**Stage and progress are derived, never dragged or typed.** The tracker and the Overview board are
read-only. A project moves only when its steps are completed, and un-completing a step moves it back.

| Tracker stage | Complete when | Board column while it is the current stage |
| --- | --- | --- |
| Intake | the project is created | Intake (until a translator is assigned) |
| Allocated | a translator is assigned (automatic) | In translation |
| Draft | the owner completes "Draft finished" | In translation |
| Review | the owner completes "Review finished" (phase 3: records the reviewer's approval) | In review |
| Client feedback | the owner completes "Client feedback dealt with" | With client |
| Delivery | the owner completes "Delivered" | Delivered |

Progress is completed stages ÷ 6. The project's **Next steps** list holds these milestone steps plus
any free-form steps; only milestone steps move the stage. (The wireframe shows two free-form examples.)

**Follow-up due.** One global setting, "Follow up after N days without a reply", default **5**, range
1 to 30, calendar days. A project becomes follow-up due when it has been waiting on the client for N
days in one of three situations: a draft was sent and no client feedback has been logged since; a
quote was sent and not accepted; a question to the client is unanswered. Each situation has its own
reminder text in Settings. Marking a reminder as sent restarts the clock. The item leaves Needs you
when the client replies or the owner marks the project as no longer waiting.

**Archiving, not deleting.** Clients, projects and translators are archived, never deleted, from the
UI. Archived records disappear from lists and pickers, keep their history, and come back from the
Archived filter. A client can be archived only when it has no active projects; a translator only when
it has no active allocations. Permanent deletion (for example a data-erasure request) is handled
through support, not a button.

**Approval (phase 3).** The owner records a reviewer's approval. The append-only log stores who
approved (the reviewer), who recorded it (the owner) and when.

## Email behaviour

"Open in email app" is a `mailto:` link with subject and body filled in. Settings can switch it to a
Gmail or Outlook compose URL. **Copy text** is always next to it as a fallback, because `mailto:` can
truncate long bodies and cannot attach files. Using the link marks the item "opened" and it stays in
Needs you until the owner presses **Mark as sent**.

As built: every email link the app opens, Message client on Project detail and the Settings page's
Open a test email, Email support and Report a problem included, follows the provider setting and ends
with the sign-off. Gmail and Outlook open in a new tab; the default email app does not. If the
settings cannot be loaded, Message client uses the defaults (default email app and the default
sign-off).

In phase 1 the message text is one of the three reminder templates from Settings, with client,
project and date filled in. In phase 3 cover mode can prepare its own text; the templates remain.

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
  preferences, glossary flag, `archived_at`, `cover_mode` (`off` | `replies` | `replies_and_drafts`,
  default `off`; phase 3).
- **Project:** client, title, source and target language, document type, word count (set only from
  an uploaded file), due date, translator(s), reviewer, notes, `archived_at`, cover paused flag
  (phase 3). **Steps** (milestone and free-form, with completion times) are stored; stage and progress
  are derived from them, not stored as typed values.
- **Translator:** name, email, language pairs, specialisms, availability note, `archived_at`.
- **Allocation:** translator, project, start and end, role (translator or reviewer), proposed flag.
- **Feedback entry:** project, version, date, source (reviewer, client, assistant), person, tag, text,
  status (open or applied).
- **Follow-up (Needs you item):** project, reason (draft waiting, quote not accepted, question
  waiting), subject and body, state (`ready` → `opened` with time → `done`).
- **Settings:** owner name and photo, email provider, sign-off, `follow_up_after_days` (default 5),
  three reminder templates, `cover_paused` (master, phase 3), document types that may be assisted
  (phase 3). There is **no** approval setting: approval is always required.
- **Assistant run (phase 3):** project, request type, checks and their results, summary, strengths,
  limitations, points left.
- **Approval (phase 3, append-only):** run, reviewer who approved, owner who recorded it, time.

## Decisions made in design review

- Cover mode is one choice per client, not three switches; the master switch only pauses everything.
- Approval is a plain statement, not a disabled switch.
- Flagged passages are shown inside the approval row, not as separate rows.
- "Why not assisted" shows on the project and the client, not on every pipeline card.
- The assistant dialog has no free-text note; it is choose, then Confirm.
- Section lists in the sidebar exist on Project detail only.
- Project-level pause is kept (owner's decision).

### Owner's answers to the build questions

- **Follow-up due:** a global setting with a sensible default (5 days). See the rules above.
- **Stage and progress:** derived from completed steps; the board is read-only. (Recommendation,
  adopted.)
- **Projects list:** yes, a list page ahead of Project detail, sorted by due date, with a Show more
  button instead of numbered pages. (Recommendation, adopted.)
- **Word count:** omitted when there is no file.
- **Archive or delete:** archive from the selected-client panel and from Project detail; no delete
  button. (Recommendation, adopted.)
- **Phase-1 reminder templates:** edited on the Settings page.
- **Reviewer approval:** recorded by the signed-in owner on the reviewer's behalf.

## Open items

1. **Dialog accessibility.** The assistant dialog is drawn, but focus handling (trap, return focus)
   must be built.
2. **Not drawn but implied:** the Archive client button when a client has no active projects; the same
   archive pattern on a translator card; the "Show more" button; editing an existing record (reuse
   the form layouts).
3. **Next steps wording.** The wireframe shows two free-form steps; the real list also carries the
   milestone steps (Draft finished, Review finished, Client feedback dealt with, Delivered).
4. **Not designed:** notification emails, any Dutch interface. The sign-in page was built without a
   wireframe (job 009, "Sign in (not in the wireframes)" above); the owner should review it.
