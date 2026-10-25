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
  EU region. Local development with `supabase start`.
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
- Backend: `supabase start` for the local stack (needs Docker and the Supabase CLI).
- Always run Python through uv (`uv run ...`). Never use `pip install` or a
  hand-made venv.

## Dev server

From the repo root, after `pnpm install --frozen-lockfile`:

```bash
pnpm exec vite --port <port> --strictPort
```

Then open `http://localhost:<port>/`; the home page is at `/`. `--strictPort` makes Vite fail
if the port is taken instead of silently moving to another port.

The app lives at the repo root: `index.html` loads `src/main.ts`, which mounts `src/App.vue` with
the router from `src/router/index.ts`. Pages are in `src/views/`.

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
`.claude/skills/factory/SKILL.md`). Job folders in `factory/jobs/` are runtime
state and gitignored. Backlog: `factory/backlog.md`. Dashboard:
`cd factory && python3 -m http.server`, then open
<http://localhost:8000/dashboard.html>.

Page checks use the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
CLI (`npm install -g agent-browser`, then `agent-browser install`). It is needed
now that the app has pages; install it on the machine running the factory.
