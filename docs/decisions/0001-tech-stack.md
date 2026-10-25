# 0001: Tech stack

Status: **Frontend accepted (Vue 3 + TypeScript, Vite, Vitest)**; hosting and package manager still open. Proof of
concept, single user. Revisit before real client data goes in.
Inputs: [design handoff](../design-handoff.md) and its open questions.

## Context

A private, single-owner dashboard for a small translation agency: projects, clients, translators,
and an opt-in "cover mode" in which an AI-assisted translate and review loop runs while the owner is
away. A person always approves before anything reaches a client. The owner is new to TypeScript and
does not want to pay for anything not needed yet (no domain, no paid plans).

What the design implies:

1. **Private dashboard, no public pages.** SEO and server rendering are not needed, so a plain SPA is enough.
2. **Mostly forms, lists and boards.** Pipeline board, two-week timeline, client table, settings. No
   exotic UI needs.
3. **The hard part is the backend.** The assist loop (analyse, translate, then terminology, subject-matter
   and fluency passes) is multi-step and takes minutes. It cannot run inside a web request.
4. **Safety rules are enforced server-side.** "Client opted in AND document type eligible AND human
   approval" must live in the database or worker, not only in the UI, so a UI bug cannot send a
   document to an LLM.
5. **Audit trail.** Approvals must be append-only and show how a document was produced.
6. **EU data residency.** Documents include legal contracts (GDPR).
7. **Email is frontend-only.** `mailto:` and compose URLs, no account connection.
8. **Multi-user later.** Translator and client logins are out of scope now, but should be additive.

## Decisions

| Area | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript end to end | Types generated from the DB schema. |
| Frontend | **Vue 3 + Vite**, Vue Router, SPA | Runner-up: SvelteKit. Add Nuxt only if server rendering is ever needed. |
| Validation | [Zod](https://zod.dev) | Runtime validation of forms, API payloads and LLM output. |
| Backend / DB | **Supabase** (Postgres, Auth, Storage, Edge Functions, pg_cron) | EU region, chosen at project creation. |
| Hosting (frontend) | Static files on a free host | See "Hosting" below. Not decided. |
| Assist workflow | Run rows with a stage, advanced by short steps | See "Assist workflow". |
| Lint / format | Ruff (Python, if any), Biome (TypeScript) | Per `AGENTS.md`. |
| Build / dev server | **Vite** | Official Vue path (`create-vue`, `@vitejs/plugin-vue`). Bun is not used as bundler. |
| Tests / types | **Vitest**, `vue-tsc` | Vitest is Vite-native and handles `.vue` files; `bun test` does not. |
| Package manager | npm or pnpm (not yet chosen) | Bun-as-installer would work, but its support in the chosen host's build system is unverified. |

### Why Vue

- Template syntax is HTML with `{{ }}`, close to the `.dc.html` wireframes, so rebuilding screens is direct.
- Gentlest learning curve of the mature options, good TypeScript support, large ecosystem.
- Supabase provides first-class Vue quickstarts.

| | Learning curve | TypeScript | Ecosystem | Fit |
| --- | --- | --- | --- | --- |
| Vue 3 + Vite | Gentlest | Very good | Large, mature | Best balance |
| SvelteKit | Very gentle, least code | Good (Svelte 5 changed APIs, so tutorials are mixed) | Smaller | Runner-up |
| Angular | Steep | Excellent | Large, opinionated | Overkill for one person |
| Solid | Moderate | Good | Small | Too niche |
| React / Next | Moderate | Excellent | Largest | Safest long term; not chosen because non-React was requested |

The Syncfusion article that prompted the comparison could not be fetched when this was written, so
this table uses the usual contenders rather than the article's exact five.

### Database and auth (Supabase)

- Postgres with row-level security (RLS) on every table; every row belongs to an account so translator
  and client roles can be added later without a rewrite.
- Supabase Auth with public sign-ups disabled and one owner account.
- Private Storage bucket for documents, served by signed URLs.
- `supabase gen types typescript` for typed queries. Local development uses `supabase start`.
- Audit trail: append-only table; revoke UPDATE and DELETE and add a trigger.
- Free tier (per third-party sources, verify at supabase.com/pricing): 500 MB database, 1 GB files, and
  **projects pause after 7 days of inactivity**. Fine for a proof of concept, but it conflicts with a
  product meant to work while the owner is away. Plan for Pro (about $25/month) before real use.
- A reported change from 30 October 2026 requires explicit Postgres grants for Data API access. Check
  this when writing the first migrations.

### Hosting

Deploy the SPA as static files; keep long-running work off the frontend host.

| | Vercel Hobby | Cloudflare (Pages or Workers static assets) |
| --- | --- | --- |
| Commercial use on free plan | **No**, non-commercial personal use only | Yes, per secondary sources |
| Fit for this app | Good for the proof of concept | Good for the proof of concept and real use |
| Paid step | Pro $20/month once the agency uses it | Free for static assets |
| Direction | Mature, polished | Cloudflare steers new projects to Workers with Static Assets; Pages is still supported |

Recommendation: Cloudflare, because it removes the licence problem at no cost. Vercel is also fine
for a throwaway proof of concept. Because the app is a static SPA, switching hosts later is cheap.
Verify current free-tier limits on the official pages before relying on them; secondary sources
disagree on some numbers (for example Vercel Hobby function duration: 10 to 60 s officially, 300 s
claimed elsewhere). The design does not depend on either figure.

### Assist workflow

- Each assistant run is a **row with a stage**. Each pass is a short step that saves its result (pass
  output, summary, strengths, limitations, human-review flags) and queues the next.
- Supabase Edge Functions run the steps; `pg_cron` triggers cover-mode work (new project, overdue
  follow-up).
- If runs outgrow Edge Function limits, move the same state machine to a small worker (Fly, Railway or
  a VPS) or a job service. The data model does not change.
- All LLM calls go through this server layer, which checks client opt-in and document-type eligibility
  first and injects glossary and style preferences. Legal and real-estate work is excluded by default,
  so the most sensitive documents never leave the system.
- Nothing is delivered to a client without the named reviewer's approval; that is a database rule,
  not only a UI state.

### Documents and export

- `.docx` text extraction (for example mammoth) runs server-side. PDF text and layout fidelity is the
  least certain part: **spike it early**.
- Excel and CSV export: `exceljs` or `fflate` in the browser, or an Edge Function for zipped CSV.

## Open questions

1. Final hosting host (Cloudflare vs Vercel), and package manager (npm vs pnpm).
2. Which LLM provider, and its EU data-processing terms (handoff question 4).
3. How much of the unverified free-tier information (limits, pricing) still holds at build time.
4. Not yet designed: intake, add-client and add-translator forms, notifications, empty and error
   states.

## Sources

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel Hobby plan limits table (mirror)](https://examples.vercel.com/docs/plans/hobby)
- [Supabase pricing and free-tier summary (third party)](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Cloudflare Workers vs Pages compatibility matrix](https://developers.cloudflare.com/workers/static-assets/compatibility-matrix)
