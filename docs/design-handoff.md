# Design handoff: translation agency platform

Status: UI wireframes done (desktop + phone). No code, stack or architecture decisions made yet.
This note is for whoever picks the work up next, to choose the tech stack and system design.

## What this is

A client and translator management platform for a small translation agency. The owner translates
Dutch to English and back (legal, real-estate brochures, technical white papers, general business
documents) and manages other translators for other languages (e.g. Spanish).

The owner may be unavailable for periods, so the platform should keep routine work moving without
her: prepare client replies, and run an AI-assisted translation and review loop where appropriate.
It must stay trustworthy to the professional translators it serves.

Design canvas (private, owner shares access): https://claude.ai/artifact/LgKcpCy3tuLDSRBSuwMBkc
Source copies of every screen are in `docs/design/screens/` (see "Using the screen files").

## Product principles (decisions already made)

1. **A person decides.** AI assistance is proposed per project, and per client in cover mode. It is
   opt-in and off by default.
2. **A person signs off.** Every assisted draft has a named human reviewer of record. Nothing is
   delivered to a client without that approval. The approval setting is always on and not editable.
3. **Some work stays human.** The owner chooses which document types may ever be suggested for
   assistance. Defaults: technical white papers and internal business documents allowed; legal and
   real-estate brochures not allowed.
4. **The system prepares, it never sends.** Client emails are drafts that open in the owner's email
   app. A person presses send.
5. **Calm and minimal.** Uncluttered, few controls per screen, quiet colour.

## Scope and users

- Single user: the agency owner. Translators and clients are records she manages. No translator or
  client logins in this version.
- English interface only.
- Out of scope for now: a translator login view, a client portal, a Dutch interface.

## Screens

| Screen | File | Purpose |
| --- | --- | --- |
| Overview | `Main.dc.html` | Cover-mode status and master switch; project pipeline (Intake, In translation, In review, With client, Delivered); follow-ups with prepared replies; workload per translator; assistant summaries |
| Project detail | `Project.dc.html` | Stage tracker; assisted draft panel (loop, summary, strengths, limitations, "needs a human eye"); ask the assistant; cover-mode activity with pause; feedback log with filters; team; next steps; details; notes |
| Translators | `Resources.dc.html` | Translator profiles; two-week allocation timeline; assistant policy and eligible document types |
| Clients | `Clients.dc.html` | Client list with follow-up and cover status; selected-client panel with per-client cover mode, contact, writing preferences, history |
| Settings | `Settings.dc.html` | Profile name and photo; email behaviour and sign-off; cover-mode master switch; export all data; support |
| Phone previews | `MainPhone`, `ProjectPhone`, `ClientsPhone` | The same pages at 390 px (they import the real pages) |

Navigation: four primary pages (Overview, Projects, Clients, Translators). Every page except Overview
adds a "this page" section list in the sidebar. Cover-mode status, Settings and Support sit at the foot.
On phones the sidebar becomes a top bar, a bottom tab bar and a row of section chips.

## Cover mode (key feature)

- **Master switch** (Overview card, Settings) plus **per-client opt-in** (Clients page). Off by default.
- Per client, the owner chooses:
  - Prepare replies and reminders for her to send.
  - Run analyse, translate and review on eligible projects.
  - Ask for approval before delivery (locked on).
- On a project: shows what cover mode did (analysed the brief, translated and reviewed, summary and
  approval request, reply prepared) and a "Pause for this project" control.
- A client's work is only touched if that client is opted in AND the document type is eligible under
  the assistant policy.

## Assisted translation workflow (proposed by the owner's collaborator)

1. Analyse the project: is it eligible (document type, glossary available, tone sensitivity)?
2. Translate a first draft.
3. Loop: terminology check, subject-matter review, fluency review, until the review stages have no
   open points.
4. Hand to the named human reviewer with a summary: what was done, strengths, limitations, and
   passages that need a human eye. Log this to the project and show it on the Overview.
5. The reviewer approves before anything reaches the client.

Request types a user can make from a project: Translate, Review only, Terminology check. Requests
run only after the owner or translator in charge confirms.

## Email approach

"Open in email app" is a `mailto:` link with subject and body prefilled. This needs no account
connection. Settings lets her choose the default email app, Gmail in the browser, or Outlook in the
browser (compose URLs). Limits: no attachments, and very long bodies can be truncated by some mail
apps. A later upgrade could create drafts through the Gmail or Microsoft APIs.

## Entities the UI implies

Sketch only. The stack session should design the real schema.

- **Client:** name, contact name and email, preferred contact method, language pair(s), work type,
  tone and spelling preferences, glossary (yes/no), cover-mode settings, notes.
- **Project:** client, title, source and target language, document type, word count, due date, stage,
  progress, assigned translator(s), reviewer of record, assisted flag, notes, next steps.
- **Translator:** name, language pairs, specialisms, availability, current allocations.
- **Allocation:** translator, project, start and end dates, role (translator or reviewer).
- **Feedback entry:** project, draft/version, date, source (reviewer, client or assistant), person,
  tag (tone, terminology, brief, layout), text, status (open or applied).
- **Assistant run:** project, request type, stages and passes, summary, strengths, limitations,
  human-review flags, approval request and outcome.
- **Prepared reply:** project or client, subject, body, status (ready, opened, dismissed).
- **Follow-up:** project, reason, due, prepared reply.
- **Settings:** owner name and photo, email provider, sign-off, cover-mode master switch, eligible
  document types.
- **Export:** one sheet or file per area above, as Excel or zipped CSV.

## Design tokens

- Ground `#F3F4F8` (silver); surface `#FFFFFF`; line `#E3E5EE`; ink `#272B3F`; muted `#5C6178`.
- Lavender: primary `#5A4A99`, tint `#ECE8F8` / `#E7E1F7`, ink `#4A3B87`.
- Duck egg: tint `#E2F3F1`, border `#BFE3E0`, ink `#1F5654`.
- Soft blue: tint `#E4EEFA` / `#DAE8F8`, ink `#284F7E`.
- Warm "needs attention" (the only warm colour): tint `#FBEEE6`, ink `#8F4A2A`.
- Type: Newsreader (headings), Inter (body). Cards radius 20 (16 on phones). Touch targets at least 44 px.
- Text contrast was chosen to meet WCAG AA. Colour is never the only signal.

## Responsive rules

Breakpoint 899 px. Below it: sidebar hidden; top bar, section chips and bottom tab bar shown; card
padding and heading sizes reduce; wide boards and timelines scroll sideways inside their own box;
the client table drops its header row.

## Sample data

Everything on the screens is sample data: names (Marieke Visser, Jonas Bakker, Sofie Haas, Lucía
Romero), clients, dates, word counts and the assistant summaries. Bracketed items such as
`[Agency name]` and `[contact email]` are placeholders. Do not treat any of it as real.

## Using the screen files

The `.dc.html` files are in the design tool's own format (they load a `support.js` runtime that is not
in this repo), so they do not run standalone. Use them as a reference for markup, copy, layout and
tokens, or open the live canvas. Rebuild the UI in the chosen framework rather than porting these files.

## Open questions for the stack and system design session

1. Hosting and data residency. Documents include legal contracts, so EU storage and GDPR duties apply.
2. Authentication for a single owner now, with room for translator and client access later.
3. Where the agent workflow runs (queue and workers), how runs are triggered in cover mode (new
   project, overdue follow-up), and how passes and summaries are stored.
4. Which model or provider handles translation and review, and how glossaries and client style
   preferences are fed in.
5. Document storage and format handling (Word, PDF, figures).
6. Export implementation (Excel and CSV).
7. Audit trail: who approved what and when, kept so the owner can show clients how a document was produced.
8. Not yet designed: new-project intake, add-client and add-translator forms, notifications, empty and
   error states.
