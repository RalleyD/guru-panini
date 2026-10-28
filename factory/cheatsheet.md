# Factory cheatsheet

One page. Full rules: [`.claude/skills/factory/SKILL.md`](../.claude/skills/factory/SKILL.md). Agent
files: `.claude/agents/`. Backlog: [`backlog.md`](backlog.md).

## Commands

| Command | What it does |
| --- | --- |
| `/factory <feature>` | One job: spec → build waves → review → approve → merge. |
| `/factory next [--wave N]` | Claim the first `- [ ]` backlog item (only under `## Wave N` with the flag), then `/factory <item>`. |
| `/factory loop [--one] [--wave N]` | Unattended: `next` → job → record → next item. Stops on the first failure. `--one` = one item, then stop. |
| `factory/loop.sh [--wave N] [max-items]` | Same loop, but one fresh `claude -p "/factory loop --one"` session per item (full context reset). |
| `/factory approve <job-id>` | Merge a job that is in `needs-human` once you've checked it. |
| `/factory rework <job-id> <note>` | Send a `needs-human` job back to a fresh builder with your note. |

`FACTORY_CLAUDE_FLAGS` sets the flags `loop.sh` gives `claude` (default `--permission-mode acceptEdits`).
Unattended runs must not stop at a permission prompt: allow Bash, Agent, SendMessage and the file tools.

## The job flow

```
feature → spec-writer → build waves → [security, ux, ui, code] → approver → merge
                        (gate after      ▲   any CHANGES: resume builder │
                         each wave)      └───────────────────────────────┘
```

| Step | Agent | Writes |
| --- | --- | --- |
| spec | `spec-writer` | `spec.md` (with `## Waves`) |
| build | `builder` (one per wave task, then one for integration) | `waves/wave-W/task-T.md`, then `build.md` + commits |
| review | `reviewer-security`, `-ux`, `-ui`, `-code` (parallel) | `round-N/review-<lens>.md`, first line `VERDICT: PASS \| CHANGES` |
| approve | `approver` | `decision.md`, first line `APPROVE \| ESCALATE` |

- Review rounds: up to **3** (the builder is resumed at most twice). Then `needs-human`.
- The orchestrator (your session) spawns agents and writes `job.json`. It never writes code.
- Stages in `job.json`: `spec` → `build` → `review` → `approve` → `merged`, or `needs-human`.

## Two kinds of "wave"

| | Backlog `## Wave N` headings | Build waves (inside one job) |
| --- | --- | --- |
| What | Groups of features in `backlog.md` | Steps of one feature's build, from `spec.md` |
| Order | Items run **one at a time**, in file order | Waves run **in the order listed** |
| Inside | Each item is reviewed and merged before the next | Tasks run **serial** or **parallel**, as the wave says |
| Gate | Each item's own review + approval | Wave gate: lint, format, tests, type-check, build |
| On failure | Loop stops | Up to 2 automatic fix attempts, then `needs-human` |

## Build waves

- A small feature is one wave with one task and skips the wave machinery (`Build round 1`).
- **Serial wave**: tasks one after another in the job worktree.
- **Parallel wave** (max 3 tasks, disjoint files): each task builds in its own worktree
  `<worktree>-w<W>t<T>` on branch `factory/<job-id>-w<W>t<T>`, then is merged into the job branch.
  A merge conflict re-runs the wave serially, once.
- Shared files (router, `AGENTS.md`, `package.json`, lockfile, generated types, a migration another
  task reads) belong in a serial or the last wave. Two tasks needing the Supabase stack are never parallel.
- **Integration pass** after the last wave: `builder-<job-id>` checks every acceptance criterion on
  the whole branch, runs the **simplify pass** (reuse, dead code, no behaviour change; its own commit),
  re-validates and writes `build.md`.
- Reviews run **once**, after the integration pass, not per wave.

## Loop mode (unattended)

1. Nothing waits for a person. Builders make judgment calls (simplest option that follows recommended
   practice) and record them under `## Decisions`.
2. The approver **auto-approves escalation items** (auth/permissions, migrations, new dependencies,
   deploy/CI config, product-decision assumptions, builder `## Decisions`) only if all three hold:
   - **No unnecessary complexity**: smallest way to meet the spec; diff size matches the requirements.
   - **Follows recommended best practice** for the stack and `AGENTS.md`.
   - **Not diminishing returns**: worth the code, risk and review cost.
3. These always escalate: committed secrets, rewriting or deleting existing user data, anything touching
   production, a deploy target or an external account, assumptions that change what the owner told us
   about their business.
4. Failures are not escalations and are never auto-approved: unmet acceptance criteria, a review that
   isn't all PASS, a merge conflict, a `BLOCKED` task, exhausted review rounds, a dirty `main`.
5. Auto-approved items are recorded in `decision.md` (`## Auto-approved escalations`) and copied into
   the merge commit message.
6. After every item the session ends (via `loop.sh`) or drops everything but the ledger line.

Stops with `{"status": "stop", ...}` in `factory/loop/state.json`; finished with `{"status": "done"}`.
Backlog items needing a person (provider choice, accounts) surface as a `BLOCKED` builder and stop the loop.

## Files

| Path | What |
| --- | --- |
| `factory/backlog.md` | The queue. `- [ ]` open, `- [x] … → <job-id>` claimed/done. |
| `factory/jobs/<job-id>/` | `job.json`, `spec.md`, `build.md`, `waves/`, `round-N/`, `decision.md`, `rework-<k>.md` |
| `factory/loop/state.json` | What the last loop iteration ended with: `continue`, `done` or `stop` + reason. |
| `factory/loop/ledger.md` | One entry per finished item, with its auto-approved escalations. |
| `<repo>/../<name>-factory/<job-id>/` | The job's worktree, on `factory/<job-id>`. |
| `factory/dashboard.html` | Live job board: `cd factory && python3 -m http.server`, open `localhost:8000/dashboard.html`. |

`factory/jobs/` and `factory/loop/` are gitignored runtime state.

## Ports (job number `n`, e.g. `003` → 3)

| Who | Port |
| --- | --- |
| builder | `5100 + 10n` |
| reviewer-ux | `5101 + 10n` |
| reviewer-ui | `5102 + 10n` |
| parallel wave tasks | `5103 + 10n + i` (i = 0..2) |

## When it stops

| You see | Meaning | Do |
| --- | --- | --- |
| `needs-human`, `decision.md` says `ESCALATE` | Approver wants you to check something | Read it; `/factory approve <id>` or `/factory rework <id> <note>` |
| `needs-human`, build `STATUS: BLOCKED` | Spec contradiction, broken environment, or a step only a person can do | Fix the cause, then `/factory rework <id> <note>` |
| `needs-human`, rounds exhausted | 3 review rounds and still CHANGES | Read `round-3/`; rework or fix by hand |
| Approved but main busy | `main` checkout dirty or not on `main` | Clean it, then `/factory approve <id>` |
| `loop.sh`: "ended without writing state" | The session died mid-item | Re-run; the loop resumes the live job from what is on disk |
| `loop.sh`: "no backlog item was claimed" | A session said success but claimed nothing | Check the ledger and `job.json`; re-run |
| `loop.sh`: lock error | Another loop holds `factory/loop/lock` | If none is running, delete that folder |

## Rules of thumb

- Never pushes: the factory merges to local `main` only.
- Every job runs in its own worktree and branch, so several jobs can run in parallel sessions.
- Jobs that touch the local Supabase stack should not run at the same time (fixed ports).
- Wave 4 jobs all edit Project detail: run them one at a time.
