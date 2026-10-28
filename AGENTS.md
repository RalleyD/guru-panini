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

From the repo root, after `pnpm install --frozen-lockfile`:

```bash
pnpm exec vite --port <port> --strictPort
```

Then open `http://localhost:<port>/`; the home page (Overview) is at `/`. `--strictPort` makes
Vite fail if the port is taken instead of silently moving to another port.

The app lives at the repo root: `index.html` loads `src/main.ts`, which mounts `src/App.vue` with
the router from `src/router/index.ts`. `src/App.vue` wraps every page in
`src/components/AppShell.vue` (sidebar on desktop, top bar and bottom tab bar below 900 px, and the
`needsYouCount` prop for the Overview badge). Pages are in `src/views/`.

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
- Clients, projects and translators are archived via `archived_at`, not deleted.
- After every schema change, regenerate the types in `src/types/database.types.ts`:

  ```bash
  pnpm exec supabase gen types typescript --local > src/types/database.types.ts
  pnpm exec biome format --write src/types/database.types.ts
  ```

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
whole backlog with no human in the loop: the approver auto-approves escalations that add no
unnecessary complexity, follow recommended practice and are worth their cost, and the loop stops on
any real failure. Job folders in `factory/jobs/` and `factory/loop/` are runtime state and
gitignored. Backlog: `factory/backlog.md`. Dashboard:
`cd factory && python3 -m http.server`, then open
<http://localhost:8000/dashboard.html>.

Page checks use the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
CLI (`npm install -g agent-browser`, then `agent-browser install`). It is needed
now that the app has pages; install it on the machine running the factory.
