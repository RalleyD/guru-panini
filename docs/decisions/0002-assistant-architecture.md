# 0002: Assistant architecture ("cover me": assisted drafts)

Status: **Proposed.** Applies to phase 3; nothing in phase 1 or 2 depends on it. Revisit when the
evaluation in this record has results.
Inputs: [design handoff](../design-handoff.md) (product principles, cover mode, assisted workflow),
[0001 tech stack](0001-tech-stack.md).

## Context

"Cover me" lets the platform keep routine work moving while the owner is unavailable. Its main value,
and the focus of this record, is the **assisted draft**: for a client who has opted in and a document
type that is eligible, the system produces a first translation draft, checks it, and hands a named
human reviewer a draft with an honest summary. Nothing reaches a client without that reviewer's approval.

Fixed by the product (see the handoff): a person confirms every request; a named reviewer approves
every draft (always on, not a setting); some document types are never assisted (legal and real-estate
brochures by default); the system never sends anything; the owner needs to show clients how a document
was produced.

Secondary and out of focus here: **prepared replies** (follow-up emails). They are one model call with
the existing reminder templates, much lower risk, and can come after assisted drafts or alongside them.

## Principle: start simple, climb on evidence

Prefer a fixed workflow over an autonomous agent, and add a stage only when an evaluation shows it
improves the result. This record deliberately chooses no agent framework.

| Rung | What it is | Climb to the next rung when |
| --- | --- | --- |
| 0 | One prompt: translate with the glossary and the client's style notes, structured output | (baseline to beat) |
| 1 | Fixed pipeline: draft, then separate terminology, subject-matter and fluency checks, each returning validated structured output | The checks catch problems rung 0 misses, on the test set |
| 2 | Bounded fix-and-recheck loop (hard iteration cap, start at 2) | A second round resolves points a single round leaves |
| 3 | A queue and worker outside Edge Functions | Runs exceed Edge Function time limits |
| 4 | An agent that chooses its own tools | Not planned. The system prepares and never sends, so the assistant has no side-effect tools |

The three request types in the design (Translate, Review only, Terminology check) are entry points
into the same pipeline, not separate systems: Translate starts at the draft, Review only starts at the
checks on a supplied draft, Terminology check runs the terminology check alone.

## Decisions

### Rules live in code, never in prompts

These are deterministic and tested, and the model is never asked to enforce them:

- **Eligibility**, returning a reason the UI can show: master switch not paused, client cover mode is
  `replies_and_drafts`, document type allowed by the policy, project not paused, and a person has
  confirmed this request. Reasons map to the design's lines, for example "Legal documents are never
  assisted".
- **Caps**: maximum steps, maximum loop iterations and a cost or token ceiling per run. A run that hits
  a cap stops and hands over what it has, flagged.
- **Approval**: a database rule, not a UI state. No draft is deliverable without an approval row by the
  named reviewer (recorded by the owner), and approval rows are append-only.
- **No side-effect tools.** The assistant reads project context and writes drafts and notes. It cannot
  send email, deliver files or approve its own work.

### Structured output between stages

Every check returns JSON validated by Zod, for example a list of points:
`{ id, passage, kind (terminology | subject | fluency | omission), severity, suggestion, status (open | resolved) }`.
"Points left for a person to decide" in the UI is simply the open points at the end of the run. A
response that fails validation is retried once, then the step fails visibly rather than being guessed at.

### Run state is data

A run is a row with a stage, advanced by short steps, as in 0001. Each step is also a row recording its
stage, input hash, output, prompt version, model, token counts, cost, timings and status. This one table
is the audit trail the owner can show clients, and the dataset for later evaluation. Steps are
idempotent, so a failed run resumes from the last saved step instead of restarting.

### Thin provider adapter, prompts as files

One small function (`complete(prompt, schema)`) wraps the model provider, so the provider and model can
change without touching the pipeline. Prompts are versioned files in the repo, and the prompt version is
stored on every step. The provider and the model are **not decided here**: they are chosen by running
the same evaluation set across a small and a large option, subject to the provider's EU data terms.

### Documents are untrusted input

Text from client documents is data, not instructions. Prompts delimit it and tell the model to ignore
instructions found inside it. The lack of side-effect tools bounds the damage if that fails.

### Honest summaries

The summary states what was checked, what was not, and what remains open, and it errs toward flagging.
Plain language must not become vague (see the handoff's copy rules). A clean run is never presented as a
quality guarantee.

## Evaluation plan (this comes before the pipeline)

1. **Test set.** About 20 to 30 excerpts or short documents of eligible types only (technical white
   papers, internal business documents), in both directions of Dutch and English, with the owner's own
   reference translation or ratings. Use consented or anonymised material, or documents the owner is
   free to share. Include the client glossary and style notes the owner would normally give.
2. **Measures.**
   - Terminology adherence against the glossary (automatic).
   - Numbers, dates and names preserved (automatic string checks) and obvious omissions or additions.
   - The owner's rating of draft usefulness, and how much she had to change it.
   - Quality of flags: of the points the assistant raises, how many were real, and of the problems the
     owner finds, how many the assistant flagged.
   - Cost and time per page, and how often structured output fails validation.
3. **Decision rule.** Agree with the owner, before running, what improvement on which measure justifies
   adding a stage. Do not invent the thresholds in advance of seeing the baseline.
4. **Judging.** Use a model as judge only if it is first calibrated against the owner's ratings.
5. **Regression.** Re-run the set whenever a prompt, model or glossary format changes.

## Sequencing

1. Evaluation set and the rung 0 baseline (docs-only spike, no UI).
2. Run and step tables, the eligibility function and the minimal state machine (still rung 0, with a
   stub in tests).
3. Add the checks (rung 1), then the loop (rung 2), each only if step 1's measures show a gain.
4. The UI from the phase 3 screens: Assisted draft section, Ask the assistant dialog, approval rows,
   cover activity and pause.
5. Prepared replies by the same adapter, if wanted.

## Risks

- Long documents: silent omissions and drift. The evaluation needs at least a few long inputs.
- Formatting: whether a draft is plain text or must round-trip a Word file is undecided and affects
  effort a lot.
- Confidentiality: client text is stored in run rows and sent to a provider. Row-level security, a
  retention rule and the provider's terms must be settled before real documents are used.
- Over-trust: reviewers may skim a clean-looking summary. The flags and honest wording are the control.

## Open questions

1. Model provider and its EU data terms, including retention and no training on inputs.
2. Sample documents, glossary format and the owner's time for ratings. This is the long pole and is a
   human task.
3. Draft format: plain text beside the source, or a reconstructed Word document.
4. How documents are segmented and how much context each segment gets.
5. Whether Edge Function time limits suffice (verify in the state-machine spike) or a worker is needed.
