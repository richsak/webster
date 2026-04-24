# Orchestrator Memory Marshaling + Planner Invocation (L11 #52)

## Problem

Webster's council flow fans out critics + redesigner, but week-over-week
learning currently has no explicit planner step. Feature #50 ships the
`webster-planner` Managed Agent spec. Feature #51 ships the
`history/memory.jsonl` event substrate + `appendEvent` / `tailN` helpers.
This feature wires the two together: an orchestrator step that runs BEFORE
critic fan-out, invokes the planner, writes `plan.md`, and logs the event.

Per ADR-0001 the orchestrator owns all JSONL I/O. The planner agent never
touches disk — it receives marshaled context as `user.message` text and
returns structured output the orchestrator parses.

## Scope

- Add a TypeScript helper module that marshals the planner's input context.
- Add a TypeScript helper module that invokes the planner via the
  Anthropic Agents Managed-Agents flow and writes the decoded `plan.md`.
- Add a new orchestration step to `prompts/second-wbs-session.md` that
  calls the helpers BEFORE the critic fan-out step.

Out of scope (covered by separate features):

- Plan → critic context wiring (#53).
- Cold-start explore-broadly defaults (#54) — this feature must not
  crash when memory tail is empty, but the dedicated cold-start logic is #54.
- Critic-genealogy invocation of `new_critic_request` (#55).

## Invariants

- Orchestrator-owned I/O. No disk writes from inside the planner agent
  prompt or tool definitions.
- Append-only `history/memory.jsonl`. Use the `appendEvent` helper from
  feature #51. Never mutate prior rows.
- Zero lint warnings. `bun run validate` must pass.
- No silent fallbacks. If the planner call fails or returns unparseable
  output, surface the error — do not fabricate a plan.
- No API keys in committed code. Load from environment.

## Stories

### US-001 — Memory marshaling helper

Add `scripts/planner-context.ts` exporting a pure function that reads the
last N memory events plus recent verdict files plus the monitor anomaly
report and returns a single concatenated text payload suitable for the
planner's `user.message`.

### US-002 — Planner invocation + plan writer

Add `scripts/planner-invoke.ts` exporting a function that registers the
`webster-planner` agent (idempotent lookup), creates a session, sends the
marshaled user message, polls until idle, parses the planner's JSON
response, writes `history/<week>/plan.md`, and appends a `verdict-ready`
row to `history/memory.jsonl` via the feature #51 helper.

### US-003 — Orchestrator integration step

Edit `prompts/second-wbs-session.md` to add a new numbered step that runs
BEFORE the critic fan-out step. The step invokes the helper from US-002
using the marshaled context from US-001, writes `plan.md` into the current
week's `history/<week>/` directory, and halts the run if the planner call
returns an error.
