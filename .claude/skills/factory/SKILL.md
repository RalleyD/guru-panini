---
name: factory
description: Run the software factory. Use when the user types /factory <feature>, /factory next, /factory loop, /factory approve <job-id>, or /factory rework <job-id> <note>. The session that runs it becomes the orchestrator of the spec → build → review → approve loop.
---

# Factory

You are the orchestrator for one job. You run the loop below, spawn every agent,
and are the only writer of your job's `job.json`. You never write code, specs,
reviews or decisions yourself. Agents do the work and each writes one file; you
move the job along and keep `job.json` current.

## The loop

```
feature → spec-writer → build waves → [security, ux, ui, code] → WAIT FOR ALL
                        (1..n, each        ▲                          │
                        serial|parallel)   └─ any CHANGES: resume ◄───┤
                                              the builder             ▼ all PASS
                                     merge to main ◄─ APPROVE ─ approver ─ ESCALATE → needs-human
```

`/factory loop` runs this for every backlog item in turn with no human in the
loop: see **Loop mode**.

| Step         | Agent (`subagent_type`) | Writes                                      |
| ------------ | ----------------------- | ------------------------------------------- |
| spec         | `spec-writer`           | `spec.md`                                   |
| build        | `builder` (one per wave task) | `waves/wave-W/task-T.md`, then `build.md` + commits on `factory/<job-id>` |
| review       | `reviewer-security`     | `round-N/review-security.md`                |
|              | `reviewer-ux`           | `round-N/review-ux.md`                      |
|              | `reviewer-ui`           | `round-N/review-ui.md`                      |
|              | `reviewer-code`         | `round-N/review-code.md`                    |
| approve      | `approver`              | `decision.md`                               |

`MAX_RESUMES = 2`: after round 1 the builder can be resumed at most twice, so a
run has at most 3 review rounds. To change the factory, edit this file and the
agent files in `.claude/agents/`.

Every agent reads `AGENTS.md` (or `CLAUDE.md`) for the repo's setup, dev server,
validation commands and conventions. Nothing repo-specific lives in these files.

## Parallel jobs

Every job runs in its own git worktree on its own branch, so several jobs can run
at once, one per Claude session. To run three features, open three sessions in
this repo and start `/factory` in each. Your session orchestrates only the job it
started or was handed.

- Your session stays in the main checkout. Agents work in the job's worktree.
  The main checkout is the user's, and it may be dirty or on another branch.
  Only **Merge** touches it.
- Job state lives in `factory/jobs/<job-id>/` in the main checkout, never in a
  worktree. Each job has its own `job.json`, so sessions never write the same
  file.
- Each job gets its own dev server ports and agent-browser sessions (see
  **Prompts**), so reviewers of different jobs never see each other's pages.

## Files

`<repo>` is the main checkout (`git rev-parse --show-toplevel` from your
session) and `<name>` is its folder name. `factory/jobs/` is gitignored runtime
state that never lands in a commit.

```
<repo>/factory/backlog.md                      queue for /factory next
<repo>/factory/jobs/<job-id>/job.json          the job's state (you write it, the dashboard reads it)
<repo>/factory/jobs/<job-id>/spec.md
<repo>/factory/jobs/<job-id>/waves/wave-<W>/task-<T>.md   one per wave task, written by its builder
<repo>/factory/jobs/<job-id>/waves/wave-<W>/gate-<k>.md   output of a failed wave gate, written by you
<repo>/factory/jobs/<job-id>/build.md
<repo>/factory/jobs/<job-id>/rework-<k>.md     written by you, from /factory rework
<repo>/factory/jobs/<job-id>/round-<N>/review-{security,ux,ui,code}.md
<repo>/factory/jobs/<job-id>/decision.md
<repo>/../<name>-factory/<job-id>/             the job's worktree, on factory/<job-id>
<repo>/../<name>-factory/<job-id>-w<W>t<T>/    short-lived worktree of one parallel wave task
<repo>/factory/loop/state.json                 loop mode: what the last iteration ended with
<repo>/factory/loop/ledger.md                  loop mode: one entry per finished item
```

`factory/loop/` is gitignored runtime state, like `factory/jobs/`.

### job.json

```json
{ "id": "003-rate-limiting", "feature": "Rate limit the signup form",
  "branch": "factory/003-rate-limiting",
  "worktree": "/Users/you/code/my-app-factory/003-rate-limiting",
  "stage": "review", "round": 2, "waves": { "total": 3, "current": 3 },
  "reviews": { "security": "CHANGES", "ux": "PASS", "ui": "pending", "code": "PASS" } }
```

- `stage` is one of `spec`, `build`, `review`, `approve`, `merged`,
  `needs-human`. Worktree setup counts as `spec`.
- `round` is the current review round (0 until the first round starts).
- `waves` is optional: present once the build has started, `current` is the wave being built
  (`total` and `current` are both 1 for a job built as one task).
- `reviews` holds the current round only. Each value is `pending`, `PASS` or
  `CHANGES`. Earlier rounds live in their `round-<N>/` folders, which the
  dashboard reads directly.
- Rewrite the whole file on every change. `worktree` is always an absolute path.

### Prompts

Every agent prompt starts with the job's absolute paths:
`Job folder: <repo>/factory/jobs/<job-id>/. Worktree: <worktree>. Branch: factory/<job-id>.`
Below, `<paths>` stands for that sentence.

Agents that open pages also get a port. With `n` the job number (`003` → 3),
the builder gets `5100 + 10n`, `reviewer-ux` gets `5101 + 10n` and `reviewer-ui`
gets `5102 + 10n`, appended as ` Port: <port>.` Parallel wave tasks use
`5103 + 10n + i`, up to `5105 + 10n`.

In loop mode every prompt to a `builder` or the `approver` ends with
` Mode: loop.` (spec-writer and reviewers are not affected).

## /factory <feature>

1. **Create the job.** `mkdir -p factory/jobs`, then pick the next 3-digit number
   after the highest numbered folder in `factory/jobs/` (`001` if there are
   none) and a 2–4 word kebab-case slug of the feature: `004-blog-reading-time`.
   Claim it with `mkdir factory/jobs/<job-id>` (no `-p`). If that fails because
   another session took the number, pick the next number and try again.
   The worktree path is `$(cd .. && pwd)/$(basename "$PWD")-factory/<job-id>`,
   run from `<repo>`. Write `job.json` with that `worktree`, `stage: "spec"`,
   `round: 0` and all reviews `pending`.
2. **Worktree.** Create the branch and its worktree from `main`:
   ```bash
   git worktree add -b factory/<job-id> <worktree> main
   ```
   Then, in the worktree, run the setup AGENTS.md gives for a fresh checkout
   (installing dependencies, for example). If any of it fails, stop and tell
   the user.
3. **Spec.** Spawn `spec-writer` with the prompt
   `<paths> Feature: <feature, verbatim>`.
   Wait for it to finish, then check that `spec.md` exists.
4. **Build.** Set `stage: "build"`. Read `## Waves` in `spec.md`. With no
   Waves section, or one wave holding one task, spawn `builder` **with the name
   `builder-<job-id>`** and the prompt `<paths> Build round 1. Port: <port>.`,
   wait for it to finish, then go to **Build check**. Otherwise go to
   **Build waves**.

### Build waves

`spec.md` splits the feature into waves: `### Wave W: <name> (serial|parallel)`,
each with tasks `W.T`. **Waves run in the order listed, one at a time.** The
mode says how the tasks *inside* a wave run. These are build waves; the
backlog's `Wave` headings group whole jobs and have nothing to do with them.

Set `waves` in `job.json` (`total`, and `current` = the wave you are on) and
tell the user one line per wave. For each wave W, in order:

1. **Serial wave.** For each task in order, spawn `builder` named
   `builder-<job-id>-w<W>t<T>` with the prompt
   `<paths> Wave W, task T. Port: <port>.` (the builder port). Wait for it.
2. **Parallel wave.** Tasks of a parallel wave have disjoint files, and each
   builds in its own worktree so they never share an index or a half-written
   tree. For task T (index `i` from 0, at most 3 tasks, ports
   `5103 + 10n + i`):
   ```bash
   git worktree add -b factory/<job-id>-w<W>t<T> <worktree>-w<W>t<T> factory/<job-id>
   ```
   Run the AGENTS.md fresh-checkout setup in each new worktree, then spawn all
   task builders **in one message**, each named `builder-<job-id>-w<W>t<T>`
   with the prompt `Job folder: <repo>/factory/jobs/<job-id>/. Worktree: <worktree>-w<W>t<T>. Branch: factory/<job-id>-w<W>t<T>. Wave W, task T. Port: <port>.`
   When all are done and READY, merge each into the job branch from the job
   worktree with `git merge --no-ff factory/<job-id>-w<W>t<T> -m "Merge wave W task T"`,
   then `git worktree remove` and `git branch -d` the task worktree and branch.
   If a merge conflicts, `git merge --abort`, remove the task worktrees and
   branches, and run the wave's tasks again as a serial wave, once. No human
   is needed: a conflict means the plan's file split was wrong.
3. **Task check.** Read the first line of each `waves/wave-W/task-T.md`.
   `STATUS: BLOCKED` goes to **Needs human**. A task that finishes without
   writing its file is also a stop: tell the user.
4. **Wave gate.** In the job worktree, run the checks the Validation section of
   AGENTS.md lists for the files that exist (lint, format check, tests,
   type-check, build; never a `--write` or `--fix` variant). They must all
   pass. If one fails, write its output to `waves/wave-W/gate-<k>.md` (`k` = 1
   or 2), spawn `builder` named `builder-<job-id>-w<W>fix<k>` with
   `<paths> Wave W gate failed: read waves/wave-W/gate-<k>.md and fix it. Port: <port>.`,
   and run the gate again. A second failed fix goes to **Needs human**.
5. Move to wave W+1.

After the last wave, resume the integration with `builder` named
`builder-<job-id>`, prompt `<paths> Integration pass. Port: <port>.` It reads
the wave files, checks every acceptance criterion across the whole branch,
fixes what the waves left over and writes `build.md` for round 1. Wait for it,
then go to **Build check**. Review rounds resume this same builder.

### Build check

Read the first line of `build.md`.

- `STATUS: READY`: start the next review round.
- `STATUS: BLOCKED`: go to **Needs human**.

### Review round N

1. Set `stage: "review"`, `round: N` and all four reviews to `pending`. Create
   `factory/jobs/<job-id>/round-<N>/`.
2. Spawn all four reviewers **in one message**, so they run in parallel. Each
   gets the prompt `<paths> Review round N.`, plus its port for `reviewer-ux`
   and `reviewer-ui`.
3. **WAIT FOR ALL.** Each time a reviewer finishes, read the first line of its
   file (`VERDICT: PASS` or `VERDICT: CHANGES`) and write that verdict to
   `job.json` straight away, so the dashboard chips fill in as they land. The
   round is done only when all four `review-*.md` files exist in `round-<N>/`.
   Never resume the builder mid-round. If a reviewer finishes without writing
   its file, or writes a first line that isn't a verdict, stop and tell the user.
4. Decide:
   - **All PASS**: go to **Approve**.
   - **Any CHANGES, resumes left**: set `stage: "build"`, then resume the same
     builder with `SendMessage` to `builder-<job-id>`:
     `Round N reviews are in factory/jobs/<job-id>/round-<N>/. Address every review with VERDICT: CHANGES, commit, and update build.md for round N+1.`
     Wait for it to finish, then go to **Build check**.
   - **Any CHANGES, no resumes left**: write `decision.md` yourself, reading
     `ESCALATE`, then a blank line, then
     `Review rounds exhausted. Outstanding CHANGES in round-<N>/ from: <reviewers>.`
     Go to **Needs human**.

### Approve

Set `stage: "approve"`. Spawn `approver` with the prompt `<paths> Final round: N.`
(in loop mode add ` Mode: loop.`)
When it finishes, read the first line of `decision.md`:

- `APPROVE`: go to **Merge**.
- `ESCALATE`: go to **Needs human**.

### Merge

The merge happens in the main checkout, so it must be clean and on `main`:
`git status --porcelain -- . ':!factory/backlog.md'` prints nothing and
`git branch --show-current` prints `main`. `factory/backlog.md` is exempt: every
`/factory next` edits it, and job branches never touch it, so a dirty backlog
cannot conflict with the merge. If not, set `stage: "needs-human"` and tell the
user the job is approved but the main checkout is busy; they run
`/factory approve <job-id>` once it is clean. Otherwise:

```bash
git merge --no-ff factory/<job-id> -m "Merge factory/<job-id>"
git worktree remove <worktree>
git branch -d factory/<job-id>
```

In loop mode, add the approver's `## Auto-approved escalations` section from
`decision.md` to the merge commit as a second `-m` paragraph, so the judgments
are in git history.

Set `stage: "merged"`. If the merge fails, run `git merge --abort` (when a merge
is in progress), set `stage: "needs-human"` and tell the user why. If removing the
worktree fails, the job is still merged: tell the user what `git worktree remove`
printed. Never push.

### Needs human

Set `stage: "needs-human"`. The branch and its worktree stay for the human to
inspect. Tell the user which job is waiting, give the worktree path, and quote
`decision.md` (or the BLOCKED reason from `build.md`).

## /factory next [--wave N]

Read `factory/backlog.md` and take the first `- [ ]` item. With `--wave N`, only
look under the `## Wave N` heading, up to the next `## ` heading; items elsewhere
are never taken, and a missing heading is an error. (`/factory loop` does the
same claim before every item.) Claim it with one
Edit that replaces its exact line with `- [x] <item> → claimed`. If the Edit
fails because the line changed, another session claimed it: re-read the backlog
and try the next `- [ ]` item. If none is left, say so and stop.

Run `/factory <item>`, and once step 1 has given it a job id, replace `claimed`
on its backlog line with the job id.

## Loop mode

Loop mode runs the backlog with no human in the loop: spec, build waves,
review rounds, approval and merge, then the next item. It changes four things
and nothing else:

1. **Nothing waits for a person.** Builders are told `Mode: loop`: a judgment
   call is made (simplest option that follows the stack's recommended
   practice) and recorded under `## Decisions` in their file, not escalated.
2. **The approver auto-approves escalations** that pass its three tests (no
   unnecessary complexity, follows recommended best practice, not diminishing
   returns) and records each in `## Auto-approved escalations` of `decision.md`.
   See `.claude/agents/approver.md`. Failures are not escalations and are not
   auto-approved: see step 5 below.
3. **Each build wave runs to the end** (**Build waves**), including its gate
   and fix attempts, without pausing.
4. **Context is reset after every item**, see below.

### /factory loop [--one] [--wave N]

1. **Preflight.** The main checkout must be on `main` and clean apart from
   `factory/backlog.md`. If not, write the stop state (step 5) and say why.
   `mkdir -p factory/loop`.
2. **Resume.** If a job in `factory/jobs/` has a live stage (`spec`, `build`,
   `review`, `approve`), a previous run died mid-job. Continue that job from
   what is on disk instead of claiming a new item: re-run the spec only if
   `spec.md` is missing, skip wave tasks whose `task-T.md` says
   `STATUS: READY`, start the review round from the highest `round-N/` that
   lacks a verdict file, and so on. Otherwise go to step 3.
3. **Claim.** Do `/factory next`'s claim, with `--wave N` when given. No `- [ ]`
   item left (in that wave's section, with `--wave N`): write
   `{"status": "done"}` to `factory/loop/state.json` and stop.
4. **Run the job** exactly as `/factory <item>` does, in loop mode.
5. **Record and decide.** Append the entry below to `factory/loop/ledger.md`,
   then write `factory/loop/state.json` as `{"status": "continue", "job": "<id>"}`
   if the job is `merged`, or `{"status": "stop", "job": "<id>", "reason": "<why>"}`
   otherwise (`needs-human`, a task `BLOCKED`, rounds exhausted, merge failure,
   a dirty main checkout, a failed preflight). **Stop on a failure; never
   skip it and carry on**, because later items build on what a failed item
   should have delivered. Backlog items that need a person (the human tasks,
   a provider choice) show up as a `BLOCKED` builder and stop the loop here.
   ```
   ## <job-id>: <merged | needs-human>
   <feature>. <waves> waves, <rounds> review rounds.
   Auto-approved: <the headings from decision.md, or "none">
   ```
6. **Compaction point.** The item is finished and its state is all on disk
   (`job.json`, the job folder, git, the ledger). Drop everything about it
   except the ledger line. With `--one`, stop here and print the one-line
   result: the process driving you starts a fresh session for the next item,
   which is a full context reset. Without `--one`, go back to step 1 for the
   next item in this session.

A skill cannot run `/compact` itself. For a real reset after every item, use
`factory/loop.sh [--wave N] [max-items]`, which starts one fresh
`claude -p "/factory loop --one"` session per item. Without it the loop still works in one session, and the
harness's automatic compaction is the only reset.

## /factory approve <job-id>

The job must be in `needs-human`. Run **Merge** with that job id.

## /factory rework <job-id> <note>

The job must be in `needs-human`.

1. Write the note, verbatim, to `factory/jobs/<job-id>/rework-<k>.md`, where `k`
   is the next unused number.
2. Set `stage: "build"`.
3. Spawn a fresh `builder` named `builder-<job-id>` with the prompt
   `<paths> Rework: read rework-<k>.md and address it, then update build.md for round N+1. Port: <port>.`
   (`N` is the job's last round.) A rework run gets a fresh `MAX_RESUMES`.
4. Continue from **Build check**, exactly like a new job.

## Reporting

Keep the user posted with one short line per transition, for example
`003-rate-limiting: round 2, security CHANGES, ux/ui/code PASS → resuming builder`.
When the job ends, say whether it merged or needs a human, and why.
