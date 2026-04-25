# Planner is a Managed Agent with orchestrator-owned memory marshaling

**Status**: accepted (2026-04-23, locked by Richie)

Webster's L11 planner (`webster-planner`, Opus 4.7) is a Claude Managed Agent registered via `POST /v1/agents` and invoked per-run through the `/v1/sessions` + events + poll pattern shipped today in `scripts/critic-genealogy.ts`. The orchestrator — not the agent itself — owns all reads from and writes to the unified memory substrate (`history/memory.jsonl`, per-week `verdict.json`, `plan.md`, `apply-log.json`, `visual-review.md`). On each run the orchestrator fetches the relevant memory slice, concatenates it into the user-message text sent at step 3, and on idle extracts the planner's output, writes `history/<week>/plan.md`, and appends one event row to `memory.jsonl`.

## Considered options

- **A. Managed Agent with undefined memory marshaling (80/100)** — matches the existing roster but left the Q2 "unified memory substrate" side-note unanswered.
- **B. Orchestrator-embedded Claude Code subagent (60/100)** — loses the "agent that decides" narrative and creates a new invocation pattern inconsistent with the rest of the roster.
- **C. Pi / Codex Forge worker (88/100 during session)** — shares JSON-artifact I/O with apply-worker, but mixes reasoning-role and execution-role lanes and breaks the "9 Claude Managed Agents" pitch for a problem orchestrator marshaling already solves.
- **E (chosen, 92/100). Managed Agent + orchestrator-owned memory marshaling** — identical to the pattern the 6 shipped critics + redesigner already use; no new infrastructure; memory discipline centralized in the orchestrator.

## Consequences

- Zero new deployment substrate. One new `agents/webster-planner.json` spec + a marshaling helper in the orchestrator.
- All reasoning agents in Webster (monitor, planner, 6 critics, redesigner, visual-reviewer) now share one invocation pattern — future agents follow suit by default.
- Memory substrate discipline has exactly one caller: the orchestrator. Agents never touch `memory.jsonl` directly. This is the load-bearing simplification.
- Reversal cost is medium. Switching to a Pi worker later would require rewriting ~150 LOC of orchestrator glue + moving the spec into a Forge workflow. Not trivial, not irreversible.

## References

- `context/DOMAIN-MODEL.md` → "Managed Agent invocation pattern" and "Memory substrate" sections
- `scripts/critic-genealogy.ts:440-556` — canonical 5-step invocation code
- Q1 grill-me decision (2026-04-23)
- Q2 grill-me side-note (2026-04-23): "unified memory structure and insights into experiment logs"
