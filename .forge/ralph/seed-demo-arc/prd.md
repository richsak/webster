# Demo Arc Seeder (scripts/seed-demo-arc.ts) — Product Requirements

## Overview

**Problem**: The Q9 demo arc (9 experiments across 4 weeks, 6 of 7 Q4 promotion outcomes, 1 genealogy spawn) exists only as a spec in DOMAIN-MODEL.md. Without seeded artifacts, a live demo requires running the full agent council against real infrastructure — expensive, slow, non-deterministic. The demo cannot be replayed reliably.

**Solution**: A TypeScript seed script that generates the complete 4-week artifact tree under `history/demo-arc/` — all proposals, decisions, verdicts, memory rows, baselines, and a W4 genealogy mock — from pure in-process data writes. No network calls, no agent invocations. Idempotent; replay-safe.

**Branch**: `feat/seed-demo-arc`

---

## Goals & Success

### Primary Goal

Produce a `history/demo-arc/` tree that faithfully represents the locked Q9 demo arc narrative, such that council agents + planner can read those artifacts as if they had been produced by a real 4-week run.

### Success Metrics

| Metric                      | Target                           | How Measured                                                     |
| --------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| Outcome lane coverage       | 6 of 7 Q4 lanes                  | Inspect baselines.jsonl: all 6 status values present             |
| Idempotency                 | Identical tree on 2nd run        | `diff` of outputs before/after re-run shows zero delta           |
| Validate gate               | Zero warnings/errors             | `bun run validate` exits 0                                       |
| Genealogy mock completeness | bounce-guard-critic spec present | `agents/bounce-guard-critic.json` exists + valid AgentJSON shape |
| Memory event log            | ≥18 rows                         | `wc -l history/demo-arc/memory.jsonl`                            |

### Non-Goals (Out of Scope)

- Story #58 (secondary-substrate seeder) — separate feature, separate PR
- Real agent API calls — seed script is pure file I/O
- Git commits from the seed script — seeder writes files only; committing is a manual step or separate CI task
- UI or CLI flags beyond the single `bun run scripts/seed-demo-arc.ts` invocation

---

## User & Context

### Target User

- **Who**: Demo runner (Richie) and evaluators watching the submission demo
- **Role**: Needs to show Webster's full autonomous loop working across 4 weeks
- **Current Pain**: No seeded artifacts → demo requires live agent runs → non-deterministic, costly, slow

### User Journey

1. **Trigger**: Ready to record demo or show evaluators the 4-week arc
2. **Action**: `bun run scripts/seed-demo-arc.ts`
3. **Outcome**: `history/demo-arc/` is populated; evaluators can inspect any week's proposal, decision, verdict, memory log, and see the W4 genealogy spawn artifact

---

## UX Requirements

### Interaction Model

CLI script, single invocation:

```
bun run scripts/seed-demo-arc.ts
```

Stdout: progress lines per week + summary. No flags required for normal use. Script exits 0 on success, non-zero on any write failure.

### States to Handle

| State               | Description                               | Behavior                                            |
| ------------------- | ----------------------------------------- | --------------------------------------------------- |
| Clean run           | `history/demo-arc/` does not exist        | Create tree, write all artifacts                    |
| Re-run (idempotent) | `history/demo-arc/` exists from prior run | Clear contents, repopulate identically              |
| Write failure       | Filesystem error during any write         | Propagate error, exit non-zero — no silent fallback |

---

## Technical Context

### Patterns to Follow

- **File-write pattern**: `scripts/critic-genealogy.ts:573-595` — `mkdirSync({ recursive: true })` + `writeFileSync` — mirror exactly
- **Root resolution**: `scripts/critic-genealogy.ts:29` — `const ROOT = resolve(import.meta.dir, "..")` — same anchor
- **Imports**: `scripts/critic-genealogy.ts:16-18` — node:fs + node:path only; no external deps beyond bun builtins
- **AgentJSON shape**: `scripts/critic-genealogy.ts:50-60` — use for `agents/bounce-guard-critic.json`
- **NewCriticSpec shape**: `scripts/critic-genealogy.ts:31-43` — embed in W4 genealogy spec.json
- **Memory row shape**: `context/DOMAIN-MODEL.md:236-244` — verbatim, event ∈ `{promote, rollback, skip, regression, gap-detected, verdict-ready}`
- **Baselines row shape**: per-experiment per ADR-0002 — `{ exp_id, week, status, baseline_sha }` where status ∈ `{promoted, archived-gate-fail, rolled-back}`
- **Genealogy directory**: `history/<week>/genealogy/` with `spec.json`, `session.json`, `rationale.md` — per `critic-genealogy.ts:577-582`

### Types & Interfaces

```typescript
// Verbatim from DOMAIN-MODEL.md — memory row
interface MemoryRow {
  ts: string; // ISO timestamp
  week: string; // "demo-W1" … "demo-W4"
  actor: "planner" | "apply" | "visual" | "verdict" | "human";
  event: "promote" | "rollback" | "skip" | "regression" | "gap-detected" | "verdict-ready";
  refs: { baseline_sha?: string; proposal_id?: string; finding_id?: string; exp_id?: string };
  insight: string; // one-sentence durable takeaway
}

// Per-experiment baseline row (ADR-0002)
interface BaselineRow {
  exp_id: string; // "exp-01-hero-h1-rewrite" etc.
  week: string;
  status: "promoted" | "archived-gate-fail" | "rolled-back";
  baseline_sha: string; // synthetic git SHA placeholder
}

// Per-experiment verdict entry
interface ExperimentVerdict {
  exp_id: string;
  kind: "text" | "component" | "asset" | "css";
  reward_delta_pct: number;
  p_value: number;
  gates: {
    brand_voice: "pass" | "fail" | "improved";
    bounce_rate: "pass" | "fail";
    scroll_depth: "pass" | "fail";
    time_on_page: "pass" | "fail";
    token_efficiency: "pass" | "fail";
    heatmap_sanity: "pass" | "fail";
  };
  classification: "improved" | "hurt" | "neutral";
  outcome:
    | "promote-fast-track"
    | "promote-fallback"
    | "promote-gate-win"
    | "archive-gate-fail"
    | "auto-rollback"
    | "hold";
}

// verdict.json shape
interface VerdictJSON {
  week: string;
  experiments: ExperimentVerdict[];
}

// AgentJSON (mirror of critic-genealogy.ts:50-60, for bounce-guard-critic.json)
interface AgentJSON {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}
```

### Architecture Notes

- No external dependencies. All file I/O via `node:fs` + `node:path`.
- Week directories use synthetic date strings: `demo-W1` through `demo-W4` (not real calendar dates) — keeps the demo-arc namespace cleanly separate from live `history/YYYY-MM-DD/` directories.
- Idempotency: `rmSync(demoArcDir, { recursive: true, force: true })` then full rebuild on each run.
- TODO integration comments: at script top, note that `history/demo-arc/` memory.jsonl rows will need schema alignment with story #51 (memory substrate) and proposal.md blocks will need kind-aware field alignment with story #47 (proposal schema v2) once those land.
- `agents/bounce-guard-critic.json` is the only file written outside `history/demo-arc/`. The script should check if the file already exists and skip (not overwrite) to avoid clobbering a real spawn.

---

## Q9 Demo Arc — Canonical Experiment Data

Locked in `context/DOMAIN-MODEL.md:411-416`. Reproduced here as implementation reference:

| Week | Exp ID                        | Kind      | Reward Δ | p-value | Gates                  | Outcome Lane       |
| ---- | ----------------------------- | --------- | -------- | ------- | ---------------------- | ------------------ |
| W1   | exp-01-hero-h1-rewrite        | text      | +15%     | 0.003   | all pass               | promote-fast-track |
| W2   | exp-02-hero-copy-v2           | text      | +8%      | 0.02    | all pass               | promote-fallback   |
| W2   | exp-03-cta-button-component   | component | +12%     | 0.006   | all pass               | promote-fast-track |
| W2   | exp-04-trust-badge-image      | asset     | 0%       | 1.0     | brand-voice improved   | promote-gate-win   |
| W3   | exp-05-mid-section-image-swap | asset     | +10%     | 0.008   | bounce +8% p=0.03 FAIL | archive-gate-fail  |
| W3   | exp-06-cta-color-shift        | css       | -11%     | 0.004   | —                      | auto-rollback      |
| W3   | exp-07-subhead-rewrite        | text      | +4%      | 0.08    | all pass               | hold               |
| W4   | exp-08-hero-safety-copy       | text      | +9%      | 0.01    | all pass               | promote-fast-track |
| W4   | exp-09-cta-size-adjust        | css       | +6%      | 0.03    | all pass               | promote-fast-track |

W4 also includes genealogy spawn: `bounce-guard-critic` triggered by the W3 gate-fail pattern.

---

## Implementation Summary

### Story Overview

| ID     | Title                                                | Priority | Dependencies |
| ------ | ---------------------------------------------------- | -------- | ------------ |
| US-001 | Types, interfaces, constants, and directory scaffold | 1        | —            |
| US-002 | W1 + W2 artifact writers (4 experiments)             | 2        | US-001       |
| US-003 | W3 artifact writers (gate-fail + rollback beat)      | 3        | US-002       |
| US-004 | W4 artifacts, genealogy mock, main entry + validate  | 4        | US-003       |

### Dependency Graph

```
US-001 (types + scaffold)
    ↓
US-002 (W1+W2 writers)
    ↓
US-003 (W3 writers)
    ↓
US-004 (W4 + genealogy + main + validate)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Full: `bun run validate`

---

_Generated: 2026-04-23T00:00:00Z_
