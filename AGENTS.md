# guru-panini

Translation project management and client-support platform.

The full tech stack is not decided yet. This file records what is settled and
marks the rest TBD. Factory agents read it for setup, dev server, validation
commands and conventions, so update it as the stack takes shape. Until a TBD
below is filled in, an agent that needs it should say so rather than guess.

## Stack (settled so far)

- **Python**: environments and dependencies managed with [uv](https://docs.astral.sh/uv/).
  Linted and formatted with [ruff](https://docs.astral.sh/ruff/).
- **Frontend**: Vue 3 + TypeScript, built and served with [Vite](https://vite.dev/), tested with
  [Vitest](https://vitest.dev/), type-checked with `vue-tsc`. Single-page app (Vue Router),
  validation with [Zod](https://zod.dev).
- **TypeScript lint/format**: [Biome](https://biomejs.dev/) (fast Rust-based lint + format in one tool).
  [oxlint](https://oxc.rs/docs/guide/usage/linter) is a lint-only alternative.
  Biome is configured in `biome.json`.
- **Backend / database**: [Supabase](https://supabase.com/) (Postgres, Auth, Storage, Edge Functions),
  EU region. The Supabase CLI is a pinned devDependency (`supabase` in `package.json`); run it as
  `pnpm exec supabase ...`. Local development with `pnpm exec supabase start`.
- **Package manager**: [pnpm](https://pnpm.io/). Commit `pnpm-lock.yaml`; pin the version with
  `"packageManager"` in `package.json`. Do not use npm or yarn to install.
- **Frontend hosting**: Cloudflare (static SPA, free `workers.dev` / `pages.dev` subdomain).
- Rationale and open questions: [docs/decisions/0001-tech-stack.md](docs/decisions/0001-tech-stack.md).
- Assistant ("cover me") architecture, phase 3: [docs/decisions/0002-assistant-architecture.md](docs/decisions/0002-assistant-architecture.md).

## Setup a fresh checkout

```bash
uv sync          # creates .venv and installs deps (once pyproject.toml exists)
```

- TypeScript deps: `pnpm install --frozen-lockfile`. Needs Node 22.12 or later (required by Vite and
  Vitest). Bun is not used as the bundler or test runner.
- Backend: `pnpm install --frozen-lockfile` also installs the Supabase CLI; no separate CLI install.
  Start the local stack with `pnpm exec supabase start` (needs Docker) and stop it with
  `pnpm exec supabase stop`.
- Always run Python through uv (`uv run ...`). Never use `pip install` or a
  hand-made venv.

## Dev server

From the repo root, after `pnpm install --frozen-lockfile`. The app needs the local Supabase stack
running (`pnpm exec supabase start`), reset with `pnpm exec supabase db reset` so the demo owner
exists:

```bash
pnpm exec vite --port <port> --strictPort
```

Then open `http://localhost:<port>/`; the home page (Overview) is at `/`. `--strictPort` makes
Vite fail if the port is taken instead of silently moving to another port.

- `.env.development` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the local
  stack. They are the local CLI defaults and safe to commit; never put hosted values or a secret or
  service-role key in it. Only the dev server reads it, not `vite build`. `.env.local`,
  `.env.*.local`, `.env.production*`, `.env.staging*`, `.env.test*` and `.env.keys` are gitignored,
  so a real key in one of them will not be committed by accident.
- Every route except `/sign-in` needs a session, so a signed-out visit goes to `/sign-in`. Sign in
  with the demo owner (`demo-owner@example.com` / `local-demo-only`, see "Demo data").

The app lives at the repo root: `index.html` loads `src/main.ts`, which mounts `src/App.vue` with
the router from `src/router/index.ts` once the first route guard has run. `src/App.vue` renders
`/sign-in` on its own and wraps every other page in `src/components/AppShell.vue` (sidebar on
desktop, top bar and bottom tab bar below 900 px, the `needsYouCount` prop for the Overview badge,
the `agencyName` prop for the brand text, and a `sign-out` event that `App.vue` handles). The shell
does not talk to Supabase: `App.vue` loads `agency_name` from the owner's settings row each time a
signed-in route shows and passes it through the shared `agencyName` ref in `src/lib/settings.ts`
(empty until the load ends, "guru-panini" when the name is empty or the load fails); the Settings
page updates that ref after a save. Pages are in `src/views/`; Project detail is
`/projects/:id` (`src/views/ProjectDetailView.vue`).

- The Supabase client is in `src/lib/supabase.ts`; import it from there rather than creating
  another.
- The global `router.beforeEach` guard in `src/router/index.ts` fails closed: new routes are
  guarded by default, and only `sign-in` is open.
- Tests that import the router, `App` or a component that uses Supabase mock it with
  `vi.mock("../lib/supabase", ...)`, so no test makes a network call.
- Forms validate input with Zod (`zod`) before writing to Supabase. Client rules shared by the
  Clients page and the Add client form are in `src/lib/clients.ts`; translator rules shared by the
  Translators page and the Add translator form are in `src/lib/translators.ts`; the New project
  form's rules are in `src/lib/projects.ts`; the Settings page's field rules
  (`settingsFieldSchemas`), its defaults and the resolver `resolveSettings` (a settings row, or no
  row, to the values every page uses) are in `src/lib/settings.ts`.
- Every email link the app renders is built with `src/lib/email.ts` (`composeUrl`, `withSignOff`,
  `opensInNewTab`), using the saved provider (`default_app`, `gmail`, `outlook`) and the resolved
  sign-off; Gmail and Outlook links get `target="_blank"` and `rel="noopener noreferrer"` through
  `newTabAttrs`. The
  support address and subjects are constants there too. Never hand-build a `mailto:` link.
- The project stage rules are in `src/lib/projects.ts`: `milestoneLabels`, `projectStage` (the six
  stages, done count and board column from allocations and steps), `columnChipClasses`,
  `documentTypeChipClasses` and `formatDate`. Pages that show a stage, column, progress or project
  date reuse them rather than re-deriving the rules. It also holds the Projects list's filter and
  search rules (`projectGroup`, `projectFilterLabels`, `searchProjects`); the per-project follow-up
  check shared by the Clients page and the Projects list is `isProjectFollowUpDue` in
  `src/lib/clients.ts`.
- `AppShell.vue` renders a route's `meta.sections` (`{ label, hash }[]`, typed in
  `src/router/index.ts`) as the sidebar "This project" links and, below 900 px, the phone chips
  under the top bar. Routes without `sections` show neither.

Design tokens (CSS custom properties) are in `src/styles/tokens.css` and base classes (`.card`,
`.btn`, `.btn-primary`, `.chip` and its variants, `.field`, `.field-label`, `.h1`–`.h3`, `.sr-only`)
in `src/styles/base.css`; pages should use them rather than raw colours.

## Database

- Migrations live in `supabase/migrations/`. Create one with
  `pnpm exec supabase migration new <name>` (from a non-interactive shell add `< /dev/null`, or it
  waits for SQL on stdin). Apply them locally with `pnpm exec supabase db reset`.
- Every table has `owner_id` defaulting to `auth.uid()`, row-level security enabled, and
  `to authenticated` policies on `owner_id`. Grant explicitly: `revoke all` from `anon` and
  `authenticated`, then grant `authenticated` only the commands the app needs.
- The default privileges for tables in `public` are revoked for `anon` and `authenticated`
  (migration `revoke_default_privileges`), so a new table has no Data API access until its
  migration grants it.
- New functions in `public` get no execute for `anon`, `authenticated` or `PUBLIC` (migration
  `revoke_default_function_privileges`; the `PUBLIC` revoke is global, so it covers functions
  `postgres` creates in any schema). A migration that adds a function must
  `grant execute on function public.<name>(<args>)` to the roles that call it (through
  `/rest/v1/rpc` or from an RLS policy); trigger functions need no grant.
  `supabase/tests/database/default_privileges.test.sql` checks this.
- New sequences in `public` get no privileges for `anon` or `authenticated` (migration
  `revoke_default_sequence_privileges`). Identity columns need no sequence grant. A `serial`
  column, or a `nextval()` call made as those roles, needs `grant usage on sequence public.<name>`.
  `supabase/tests/database/default_privileges.test.sql` checks this.
- Install extensions in the `extensions` schema, never in `public`. In a migration, use
  `create extension if not exists <name> with schema extensions;`, because a bare
  `create extension` lands in `public`. Choose `extensions` when enabling one from the dashboard
  too. Extension objects are owned by `supabase_admin`, whose default privileges in `public` give
  `anon` and `authenticated` full access, and a migration cannot change that role's defaults.
- A foreign key between `public` tables must include `owner_id`: the parent gets
  `unique (id, owner_id)`, and the child uses
  `foreign key (<x>_id, owner_id) references <parent> (id, owner_id)`, so a row can only reference
  the same owner's rows. `supabase/tests/database/same_owner_foreign_keys.test.sql` checks this.
- Clients, projects and translators are archived via `archived_at`, not deleted.
- `project_steps` holds a project's milestone steps (`milestone` set, `title` null) and free-form
  steps (`title` set, `milestone` null); `completed_at` null means not done. A milestone row is
  created the first time it is ticked (upsert on `project_id, milestone`), so a missing row means
  not done. Stage, board column and progress are derived from the steps and allocations, never
  stored.
- Projects are created through `public.create_project`, so the project and its translator
  allocation are saved together in one transaction. The `.docx` word count is read in the browser
  by `src/lib/docx.ts`.
- Storage: the private `source-files` bucket and its limits (50 MiB, `.docx` and PDF MIME types) are
  created in a migration that inserts into `storage.buckets`, not in `config.toml`, so the bucket
  exists on the hosted project too. Object names start with the owner's id folder
  (`<owner id>/<uuid>.<ext>`), which the `to authenticated` insert and select policies on
  `storage.objects` check; there is no update or delete policy and nothing for `anon`. The private
  `profile-photos` bucket (5 MiB, JPEG, PNG and WebP; migration `profile_photos`) follows the same
  owner-folder pattern, with no update or delete policy; the Settings page shows a photo through a
  signed URL. A new bucket follows the same pattern.
- After every schema change, regenerate the types in `src/types/database.types.ts`:

  ```bash
  pnpm exec supabase gen types typescript --local > src/types/database.types.ts
  pnpm exec biome format --write src/types/database.types.ts
  ```

- Demo data: `supabase/seed.sql` holds clearly fake demo data, and `pnpm exec supabase db reset`
  loads it after the migrations. The local demo owner signs in as `demo-owner@example.com` /
  `local-demo-only`, and every demo row belongs to that account.
  - It is local only: the file is one `do` block that starts with a guard, which aborts unless
    `app.settings.jwt_secret` is the local CLI default, so a failed guard writes nothing in any
    client. Never run `supabase db push --include-seed`, never run `supabase db reset --linked`,
    and never load the seed with a `--db-url` that points at the hosted project. The hosted owner
    account is created by hand in the Supabase dashboard.
  - Adding rows: put the inserts inside the guarded `do` block, never after it. Start names and
    titles with `Demo `, use `@example.com` emails, compute dates from `current_date` or `now()`,
    set `owner_id` to the demo owner's id explicitly, use no wireframe sample names
    (`docs/design-handoff.md` "Sample data"), and only insert (no schema objects, grants or
    settings). Page jobs that need more demo rows add them here.
  - pgTAP tests must not depend on seed rows; they insert their own users and rows.

## Auth

One owner signs in with email and password; there is no sign-up.

- Local config (`supabase/config.toml`): public sign-ups are off through
  `[auth] enable_signup = false`. `[auth.email] enable_signup` must stay `true`: in this CLI it
  turns the whole email provider on or off, so `false` turns off email sign-in too.
- Config changes take effect only after `pnpm exec supabase stop` then `pnpm exec supabase start`.
- Hosted project (by hand, in the Supabase dashboard): turn off "Allow new users to sign up" and keep
  the Email provider on. The owner account is created by hand there.
- Deploy: the build must set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build
  environment variables on the host. `.env.development` is not used by `vite build`.

## Validation

Run all of these before committing. Each only applies once its files exist.

```bash
uv run ruff check .            # Python lint
uv run ruff format --check .   # Python formatting (use `uv run ruff format .` to fix)
uv run pytest                  # Python tests (pytest assumed; TBD until chosen)
```

- TypeScript lint/format: `pnpm exec biome check .`
- TypeScript tests: `pnpm exec vitest run`
- Type-check: `pnpm exec vue-tsc --noEmit`
- Build: `pnpm exec vite build`
- Database tests: `pnpm exec supabase test db` (pgTAP files in `supabase/tests/`; needs the local
  stack running)

## Conventions

- Python: follow ruff's defaults unless `pyproject.toml` configures otherwise;
  type-hint public functions.
- Keep changes small and match the surrounding code.
- Commit job work only on the `factory/<job-id>` branch; `main` is merged to by
  the factory orchestrator or a human.

## UI design

The product spec and wireframes are in [docs/design-handoff.md](docs/design-handoff.md), with the
screens in `docs/design/screens/` and the suggested build order in
[docs/factory-handoff.md](docs/factory-handoff.md). Read the handoff before specifying or reviewing
any page. Phase 1 has no cover-mode UI.

## Software factory

`/factory <feature>` runs a spec → build → review → approve loop (see
`.claude/skills/factory/SKILL.md`). The spec splits a feature into waves that run in order, each
serial or parallel inside. `/factory loop` (or `factory/loop.sh`, one fresh session per item) runs the
whole backlog, or one `## Wave N` group with `--wave N`, with no human in the loop: the approver auto-approves escalations that add no
unnecessary complexity, follow recommended practice and are worth their cost, and the loop stops on
any real failure. Job folders in `factory/jobs/` and `factory/loop/` are runtime state and
gitignored. Backlog: `factory/backlog.md`. Dashboard:
`cd factory && python3 -m http.server`, then open
<http://localhost:8000/dashboard.html>.

Page checks use the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
CLI (`npm install -g agent-browser`, then `agent-browser install`). It is needed
now that the app has pages; install it on the machine running the factory.
