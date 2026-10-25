# guru-panini

Translation project management and client-support platform.

The full tech stack is not decided yet. This file records what is settled and
marks the rest TBD. Factory agents read it for setup, dev server, validation
commands and conventions, so update it as the stack takes shape. Until a TBD
below is filled in, an agent that needs it should say so rather than guess.

## Stack (settled so far)

- **Python**: environments and dependencies managed with [uv](https://docs.astral.sh/uv/).
  Linted and formatted with [ruff](https://docs.astral.sh/ruff/).
- **TypeScript** (if/when a frontend or Node tooling is added): linted with
  [Biome](https://biomejs.dev/) (fast Rust-based lint + format in one tool).
  [oxlint](https://oxc.rs/docs/guide/usage/linter) is a lint-only alternative.
  Not installed yet; add it with the first TypeScript package.
- Backend framework, frontend framework, database, hosting: **TBD**.

## Setup a fresh checkout

```bash
uv sync          # creates .venv and installs deps (once pyproject.toml exists)
```

- TypeScript deps: **TBD** (package manager not chosen).
- Always run Python through uv (`uv run ...`). Never use `pip install` or a
  hand-made venv.

## Dev server

**TBD.** The factory gives each job its own port, so the start command must
take a port, e.g. `uv run <server> --port <port>`. Replace this section once a
server exists. Until then there are no pages for the UX and UI reviewers to
open; they should review from the code and mark UI criteria as not applicable.

## Validation

Run all of these before committing. Each only applies once its files exist.

```bash
uv run ruff check .            # Python lint
uv run ruff format --check .   # Python formatting (use `uv run ruff format .` to fix)
uv run pytest                  # Python tests (pytest assumed; TBD until chosen)
```

- TypeScript lint/format: `npx biome check .` (once Biome is installed).
- Type-check: **TBD** (e.g. `uv run mypy` / `tsc --noEmit` once chosen).
- Build: **TBD**.

## Conventions

- Python: follow ruff's defaults unless `pyproject.toml` configures otherwise;
  type-hint public functions.
- Keep changes small and match the surrounding code.
- Commit job work only on the `factory/<job-id>` branch; `main` is merged to by
  the factory orchestrator or a human.

## Software factory

`/factory <feature>` runs a spec → build → review → approve loop (see
`.claude/skills/factory/SKILL.md`). Job folders in `factory/jobs/` are runtime
state and gitignored. Backlog: `factory/backlog.md`. Dashboard:
`cd factory && python3 -m http.server`, then open
<http://localhost:8000/dashboard.html>.

Page checks use the [`agent-browser`](https://github.com/vercel-labs/agent-browser)
CLI (`npm install -g agent-browser`, then `agent-browser install`). It is only
needed once the project has pages; install it on the machine running the
factory.
