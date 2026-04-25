# History artifacts — immutable

> Runtime output lives here. Never edit, never delete, never regenerate.

## What's in this directory

- `history/<YYYY-MM-DD>/` — weekly production council runs (Nicolette's live business)
- `history/demo-arc/` — pre-shipped 4-week demo arc seeder output
- `history/secondary-arc/` — Pair Alpha (SaaS + local service) seeder output
- `history/memory.jsonl` — event log read by planner + apply-worker + visual-reviewer
- `history/baselines.jsonl` — per-experiment baselines

## The rule

If you think you need to modify something in here, **STOP and ask Richie**.

Manipulating runtime artifacts destroys evidence the planner depends on for next-week decisions. It also breaks the auditability claim that underpins the verdict engine's `confidence` heuristic.

## Hackathon expansion isolation

The hackathon simulation writes to `demo-output/<substrate>/` — NOT under `history/`. Keep it that way. Isolation between production runtime artifacts and demo simulation output is a feature, not an accident.

New sim output structure: `demo-output/landing-page/week-NN/...` and `demo-output/northwest-reno/week-NN/...`. See `context/EXPANSION-TASKS.md` T7–T9 for the asset-bundle contract.

## When you genuinely need to change something here

Reasons this is ever acceptable:

- Richie explicitly instructs it
- A schema migration of `memory.jsonl` or `baselines.jsonl` with an accompanying migration script + test
- Adding a new week-dated directory via a production council run (via `prompts/second-wbs-session.md`, the normal path)

Anything else: surface `[STUCK]` and ask.
