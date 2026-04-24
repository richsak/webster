# Webster Domain Model

> Formal model of Webster's entities, states, agents, and week-over-week
> experiment lifecycle. This document is the **shape of the system**.
> `FEATURES.md` lists the work. `ROADMAP.md` sequences it. `DOMAIN-MODEL.md`
> defines what's being built.

## Purpose

Session 4 Phase 7. Locks in the architectural shift from:

- **Old framing**: council produces change → apply executes → visual gate → PR → autoresearch measures post-merge as a back-end feedback loop.
- **New framing**: **autoresearch measurement IS the council's starting input.** A **planning agent** sits before the critics + redesigner, reads last week's verdict, decides the experiment's next move, then the council runs with that plan as context.

Webster becomes an **autonomous experiment agent**, not a blind weekly redesigner.

## Core Entities

| Entity            | What it is                                                          | Where it lives                                         |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| **Site**          | The landing page under management                                   | `site/`; HEAD of `main`                                |
| **Baseline**      | A promoted reference version of Site                                | Pointer in `history/baselines.jsonl`; git SHA-anchored |
| **Experiment**    | One week's proposed-and-applied change relative to current baseline | `history/<week>/` directory                            |
| **Verdict**       | Statistical classification of an experiment's effect on metrics     | `history/<week>/verdict.json`                          |
| **Plan**          | Planning agent's decision on next week's direction                  | `history/<week>/plan.md`                               |
| **Proposal**      | Redesigner's kind-aware change specification                        | `history/<week>/proposal.md`                           |
| **Apply log**     | Record of apply worker's execution against Site                     | `history/<week>/apply-log.json`                        |
| **Visual review** | Visual-reviewer agent's verification output                         | `history/<week>/visual-review.md` + screenshots        |
| **PR**            | GitHub pull request, gated behind visual review pass                | GitHub; linked from `history/<week>/pr.json`           |

## Experiment Lifecycle

An experiment traverses these states during a week:

```text
proposed   →  applied  →  running   →  measured   →  verdicted   →  final
  ↑             ↑            ↑            ↑              ↑             ↑
  │             │            │            │              │             │
redesigner    apply       merged     7-day        verdict        planner
  emits       worker     via human   window      engine          reads +
  proposal    executes   (or auto)   elapsed     scores           decides
```

**Final states**:

- `promoted` — verdict is `improved`, planner designates this version as new baseline
- `rolled-back` — verdict is `hurt` at p<0.05, auto-rollback fired OR planner directed revert
- `inconclusive` — verdict is `neutral` or ambiguous, baseline holds, next experiment adjusts direction

## Agent Roster (9 base + dynamic genealogy)

| #   | Agent                         | Model                  | Role                                                       | Shipped |
| --- | ----------------------------- | ---------------------- | ---------------------------------------------------------- | ------- |
| 1   | `webster-monitor`             | Haiku 4.5              | Analytics anomaly detection                                | ✅ L2   |
| 2   | **`webster-planner`**         | **Opus 4.7**           | **NEW — reads verdict, decides experiment direction**      | 📋 L11  |
| 3   | `seo-critic`                  | Sonnet 4.6             | SEO findings                                               | ✅ L2   |
| 4   | `brand-voice-critic`          | Sonnet 4.6             | Brand-voice consistency                                    | ✅ L2   |
| 5   | `fh-compliance-critic`        | Sonnet 4.6             | Functional-health medical-claims audit                     | ✅ L2   |
| 6   | `conversion-critic`           | Sonnet 4.6             | Conversion-path + CTA audit                                | ✅ L2   |
| 7   | `copy-critic`                 | Sonnet 4.6             | Copy quality + voice                                       | ✅ L2   |
| 8   | `visual-design-critic`        | Sonnet 4.6             | Visual rhythm, hierarchy, imagery relevance (pre-proposal) | ✅ L2   |
| 9   | `webster-redesigner`          | Opus 4.7               | Synthesizes findings + plan → proposal                     | ✅ L2   |
| 10  | **`webster-apply-worker`**    | **Pi / Codex gpt-5.4** | **Executes proposal against Site**                         | 📋 L8   |
| 11  | **`webster-visual-reviewer`** | **Opus 4.7**           | **Browser-based post-apply verification**                  | 📋 L9   |
| —   | Genealogy critics             | Sonnet 4.6             | Runtime-created when Opus detects gap                      | ✅ L3   |

Planner is new (L11). Apply worker + visual-reviewer are planned (L8 / L9). Note: `visual-design-critic` (#8, shipped L2, pre-proposal audit) is a distinct agent from `webster-visual-reviewer` (#11, planned L9, post-apply verification) — different stages, different concerns.

## Managed Agent invocation pattern

All Claude Managed Agents in Webster (monitor, planner, 6 critics, redesigner, visual-reviewer) follow the same 5-step pattern, shipped today in `scripts/critic-genealogy.ts`:

| Step                 | Endpoint                       | Frequency                                                         | Purpose                                                                           |
| -------------------- | ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1. Register spec     | `POST /v1/agents`              | Once per spec (idempotent via `GET /v1/agents` name lookup)       | Creates agent ID from `agents/<name>.json` spec                                   |
| 2. Create session    | `POST /v1/sessions`            | Per run                                                           | Body: `{ agent: agentId, environment_id, vault_ids, title }`                      |
| 3. Send user message | `POST /v1/sessions/:id/events` | After session create                                              | Body: `{ events: [{ type: "user.message", content: [{ type: "text", text }] }] }` |
| 4. Poll status       | `GET /v1/sessions/:id`         | Every 30s until `idle` / `completed` / `stopped` (20min deadline) | Wait for agent to finish reasoning                                                |
| 5. Snapshot          | `GET /v1/sessions/:id`         | After idle                                                        | Orchestrator extracts output events, writes to durable artifacts                  |

All calls carry: `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-beta: managed-agents-2026-04-01`.

**Orchestrator ownership**: the orchestrator (Claude Code session or `scripts/council-run.ts`-equivalent) is responsible for steps 2–5 AND for marshaling memory-substrate reads (from `history/memory.jsonl` + week artifacts) into the user-message text sent in step 3. This is the same discipline used today for critics (orchestrator fetches `site/` and critic spec, passes into context). The planner inherits this pattern unchanged — no new deployment substrate.

## Week Lifecycle — DAY-BY-DAY

A week's council run + measurement window. `N` is the week being planned.

```text
DAY 0 — MONDAY (council run day)

00:00  Autoresearch verdict engine (L9 #44) runs
       └─ reads 7 days of analytics from week N-1's experiment
       └─ writes history/<week-N-1>/verdict.json
       └─ classification: {improved, hurt, neutral}

00:05  Planning agent (L11) runs with context:
       ├─ verdict.json (week N-1)
       ├─ proposal.md (week N-1)
       ├─ apply-log.json (week N-1)
       ├─ monitor anomaly report (current)
       ├─ current baseline pointer
       └─ writes history/<week-N>/plan.md:
           ├─ classification: what happened last week
           ├─ next_action: {promote_and_experiment, hold_baseline, revert_and_retry}
           ├─ direction_hint: "focus on X" / "avoid Y"
           ├─ new_baseline_sha (if promoting)
           └─ rationale

00:10  If plan.next_action == 'revert_and_retry':
       └─ Auto-rollback worker (L9 #45) reverts last week's merge, exits week N early

00:15  5 critics fan out (parallel /v1/sessions)
       ├─ each reads site/ + plan.md as input
       └─ each writes history/<week-N>/council/<critic>-findings.md

00:25  Critic genealogy check (L3)
       ├─ orchestrator Opus 4.7 reads findings, detects gap
       ├─ if gap: authors new critic spec, registers, invokes
       └─ new critic writes findings.md

00:30  Redesigner (Opus 4.7) reads:
       ├─ all findings
       ├─ plan.md
       ├─ current baseline
       └─ writes history/<week-N>/proposal.md
           └─ kind-aware per L10: {text, css, component, asset} + constraints

00:40  Apply worker (Pi / Codex gpt-5.4 via Forge workflow, worktree-isolated)
       ├─ reads proposal.md
       ├─ executes per kind (find-replace / token-mutate / component-edit / asset-invoke)
       ├─ runs lint + type + format (hard floor)
       └─ writes history/<week-N>/apply-log.json

00:50  Runtime validation gate (L8 #39b)
       └─ Playwright: CTAs resolve, no JS errors, no console.error

00:55  Critic re-run gate (L8 #39c)
       ├─ critics run again against mutated code
       ├─ require: 0 new CRITICAL, ≤2 new HIGH
       └─ if fail: fix-hint loop to apply worker, max 3 iterations

01:05  Visual reviewer (L9 #41)
       ├─ headless browser at 3 breakpoints (375/768/1440)
       ├─ screenshot + accessibility-tree text extraction
       ├─ verify proposal constraints held (L10 #49)
       ├─ verify content presence (no drops like session-4 "No more patient churn")
       ├─ interaction recording (click CTAs, scroll, form focus)
       ├─ if regressions: fix-hint loop, max 3 iterations
       └─ writes history/<week-N>/visual-review.md + screenshots

01:15  Per-cluster PR emission (L8 #39d)
       ├─ union-find on touched files → clusters
       ├─ max 3 PRs/week, 1–3 issues per PR
       └─ opens PRs via gh CLI

01:20  Human notification (vault + email + Slack if configured)

DAY 0-6 — MEASUREMENT WINDOW

       Analytics accumulate in D1 (or PostHog/GA4)
       ├─ Proxies (fast): scroll depth, CTA visibility, time-on-page, bounce
       └─ CVR (slow): conversion rate (quarterly-stabilized)

       Daily cron: auto-rollback check (L9 #45)
       └─ if proxy metrics tank hard (p<0.01 negative), revert immediately
           └─ opens draft PR for human override

DAY 7 — NEXT MONDAY

       Becomes DAY 0 of week N+1.
       Planner reads week N's verdict, decides week N+1's direction.
       Cycle continues.
```

## Data Flow (week-over-week)

```text
┌─ week N-1 ─────────────────────────────────────────────┐
│  proposal.md → apply-log.json → visual-review.md → PR  │
│                                                         │
│  [human merges]                                         │
│                                                         │
│  analytics accumulate (7-day window)                    │
│                                                         │
│  verdict.json (L9 #44 verdict engine)                   │
└────────────────────────────┬────────────────────────────┘
                             ↓
┌─ week N ────────────────────────────────────────────────┐
│  plan.md (L11 webster-planner) ←──── reads verdict.json │
│                                                          │
│  findings.md × 6 (critics + genealogy) ← plan.md        │
│                                                          │
│  proposal.md (redesigner) ← findings + plan             │
│                                                          │
│  apply-log.json (apply worker, L8 + L10) ← proposal     │
│                                                          │
│  visual-review.md (visual-reviewer, L9) ← apply         │
│                                                          │
│  PR → [human merges] → analytics → verdict.json         │
└────────────────────────────┬────────────────────────────┘
                             ↓
                       week N+1 …
```

## Invariants (the rules nothing else breaks)

1. **Validate before human approval** — every PR passes the full stack (runtime gate → critic re-run → visual reviewer → planner direction-check) before reaching a human.
2. **Baseline is git-anchored** — every promotion is a specific commit SHA, stored in `history/baselines.jsonl`, recoverable by replaying git history.
3. **Every experiment has a verdict** — no week's change goes un-measured. If analytics are insufficient, verdict is `inconclusive` with low confidence, not absent.
4. **Planning precedes council** — planner decides direction before critics + redesigner start. Council has plan.md as input context.
5. **Human is the last ratchet, not the first debugger** — human PR review is optional. Auto-rollback fires without human. But nothing is MERGED without passing validation.
6. **Agents compose, not override** — planner CAN direct critics to focus on X, but critics cannot ignore critical findings. Override is via operator-decision.json (human override, tracked).
7. **Proposals are kind-aware** (post-L10) — every issue in proposal.md declares kind ∈ {text, css, component, asset} + a constraints block. No silent type-coercion in the apply worker.
8. **Memory is event-sourced, not agent-private** (NEW, see next section) — every agent's durable state lives on disk in the canonical memory substrate; nothing material sits only in a session context.

## Memory substrate (unified across agents)

> Locked by Richie (Q2 side-note, 2026-04-23): "remember context packages and writes/edits need to happen accordingly so there's a unified memory structure and insights into experiment logs and stuff like that accordingly."

The planner at week N+1 does not re-read every artifact from weeks 1..N. It reads a **distilled event log** plus the last 1–2 weeks' raw artifacts. This is the unified memory:

| File                                          | Writer                                   | Readers                                      | Shape                        |
| --------------------------------------------- | ---------------------------------------- | -------------------------------------------- | ---------------------------- |
| `history/baselines.jsonl`                     | planner (on promote)                     | all agents                                   | JSONL, append-only           |
| `history/memory.jsonl`                        | planner + apply-worker + visual-reviewer | planner (next week), critics (for priors)    | JSONL, append-only event log |
| `history/<week>/verdict.json`                 | verdict engine (L9 #44)                  | planner                                      | JSON                         |
| `history/<week>/plan.md`                      | planner                                  | critics + redesigner + apply-worker          | MD w/ YAML frontmatter       |
| `history/<week>/proposal.md`                  | redesigner                               | apply-worker + visual-reviewer               | MD, kind-aware issue blocks  |
| `history/<week>/apply-log.json`               | apply-worker                             | visual-reviewer + planner (next week)        | JSON                         |
| `history/<week>/visual-review.md`             | visual-reviewer                          | planner (next week) + human                  | MD + screenshots             |
| `history/<week>/council/<critic>-findings.md` | each critic                              | redesigner + planner (next week, for priors) | MD                           |

**Event log row shape** (`history/memory.jsonl`):

```json
{
  "ts": "...",
  "week": "2026-W17",
  "actor": "planner|apply|visual|verdict|human",
  "event": "promote|rollback|skip|regression|gap-detected|verdict-ready",
  "refs": { "baseline_sha": "...", "proposal_id": "...", "finding_id": "..." },
  "insight": "<one-sentence durable takeaway>"
}
```

**Write discipline**:

- JSONL files are append-only. No rewriting history.
- Week directories are write-once. Amendments go in follow-up files (`plan-revision-1.md`).
- Every significant agent action MUST emit a `memory.jsonl` row. This is the planner's primary reading substrate at week N+1.
- Raw artifacts stay in their week directory for audit; the event log is the distillation.

**Why this shape**: if the planner had to re-read 12 weeks of findings + verdicts to decide week 13's direction, it would drown. The event log is the curated history. Raw artifacts are the evidence base, queried on demand by refs.

## Reward, gates, and promotion logic

> Locked by Richie (Q4, 2026-04-23). Framed as reward ≠ gates — promotion operates on a matrix, not a single p-value.

**Reward** (one number maximized):

- **Unified page CTA CTR** = total CTA clicks across all CTAs on the page / total page visits
- Single reward keeps promotion math clean and prevents double-counting when multiple CTAs improve simultaneously
- Maps directly to booking-funnel entry

**Per-section CTRs** (learning + attribution, NOT gating):

- `hero_cta_ctr`, `mid_cta_ctr`, `footer_cta_ctr` tracked weekly in `memory.jsonl`
- Used by planner for `direction_hint` generation
- Used for stale-section attribution: if section X's CTR is flat for N≥3 weeks despite direct changes to X, planner pivots direction_hint upstream ("test section (X-1) framing/expectation-setting instead of X")

**Validation gates** (each is a veto, independent of reward):

| Gate                        | Direction         | Threshold                                                                          |
| --------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| Brand-voice alignment       | no-regress        | critic re-run at apply time: 0 new CRITICAL, ≤2 new HIGH from `brand-voice-critic` |
| Bounce rate                 | ceiling           | no regression at p<0.05                                                            |
| Scroll depth                | floor             | no regression at p<0.05                                                            |
| Time-on-page                | floor             | no regression at p<0.05                                                            |
| Token efficiency (run cost) | ceiling           | no regression at p<0.05                                                            |
| Heatmap sanity              | no new dead zones | `webster-visual-reviewer` check vs prior week's heatmap                            |

**Promotion decision matrix**:

| Reward delta                      | Gates status                             | Outcome                                                           |
| --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Positive p<0.01 week 1            | all pass                                 | **PROMOTE fast-track**                                            |
| Positive p<0.05 sustained 2 weeks | all pass                                 | **PROMOTE fallback**                                              |
| Positive (any)                    | ≥1 gate regresses                        | **NOT PROMOTED — archive as "reward+gate-fail" learning insight** |
| Zero delta (no stat-sig change)   | ≥1 gate improves at p<0.05, none regress | **PROMOTE gate-win lane**                                         |
| Zero delta                        | all gates equal                          | Hold baseline                                                     |
| Negative p<0.01                   | —                                        | **ROLLBACK (Q3 locked)**                                          |
| Negative p<0.05 to p>0.01         | —                                        | Hold baseline (not strong enough to rollback)                     |

**Parallel independent-variable experiments** (locked in submission scope):

- A week's proposal may contain multiple experiments if each touches an independent DOM region (e.g., hero + footer CTA simultaneously)
- Each experiment has its own reward (section CTR on its touched region) AND its own gate checks
- Cross-experiment gate: **unified page CTA CTR must not regress at p<0.05** — prevents the pathological case where each experiment improves its section but users are confused by the sum of simultaneous changes
- Creep prevention: critic re-run gate (#39c) + `webster-visual-reviewer` (#41) can decline individual experiments at apply time if they see risk — natural independence check
- Traffic note: ~500 weekly visits is thin. Per-section CTR on a half-page region drops power. Planner decides how many experiments to run in parallel based on recent traffic volume (heuristic: ≥1000/week → up to 3 parallel; 500-1000/week → 1-2 parallel; <500/week → 1 only)

## Genealogy governance

> Locked by Richie (Q5.1, 2026-04-23). Bounds the Q5-locked mechanism where the planner can request new critics via L3 genealogy. Prevents token-waste drift without blocking legitimate spawns.

Four layers, cheapest first. Each layer catches what the previous one misses.

**Layer 1 — Opus 4.7 self-limit via prompt rubric** (primary filter, zero code):

Planner's system prompt includes:

> Only emit `genealogy_request` if the concern is provably unowned by any existing critic. Cite which existing critics partially cover it, and name what they miss. If you cannot articulate that gap in one sentence, do not request.

**Layer 2 — Orchestrator dedup check** (secondary filter, ~50 LOC):

Before invoking `scripts/critic-genealogy.ts`, orchestrator compares the `concern` text against each existing critic's `scope` and `description` strings. Heuristic: keyword-overlap ≥60% → block spawn, return plan to planner with "closest existing critic is X; consider `direction_hint` toward X's coverage."

**Layer 3 — Quarterly hard cap** (safety rail, ~10 LOC):

Max 2 spawns per calendar quarter. Blocks runaway even if layers 1 + 2 fail. Rare trigger if filters work. Reset at start of each quarter.

**Layer 4 — Post-spawn retire-on-idle** (pruning, ~30 LOC):

A spawned critic that has not emitted a CRITICAL or HIGH finding in 4 consecutive weeks is archived (config moved to `agents/archive/`, NOT deleted — recoverable if later needed). Frees a slot in the quarterly cap. Insurance against speculative spawns.

**Second-line defense** (already in Q4's gate table):

The token-efficiency gate ("council run cost must not regress at p<0.05") catches runaway AFTER the fact. Governor prevents; gate catches. Two independent checks.

**Token math** (why this matters):

- 1 critic: ~10K tokens/run × 52 weeks = ~520K tokens/year
- Current 6 critics + redesigner + monitor ≈ 4M tokens/year
- Ungoverned spawning (~1 new critic/quarter, no retirement): +4 critics/year = +2M tokens/year (~50% annual run cost)
- With governor (cap 2/quarter, dedup rejects ~60%, retire-idle prunes ~30%): steady state ~10 critics max = +25% over current

Over 3 years: governor saves roughly 10M tokens.

**Escalation paths for blocked requests**:

- Layer 1 block → planner reasons in plan.md, does not emit request. No operator signal.
- Layer 2 block → planner receives "use direction_hint toward X" and retries in-session.
- Layer 3 block → planner emits `governor_blocked: { concern, rationale, quarter }` row to `memory.jsonl` for operator review. Operator can manually bypass via `operator-decision.json`.
- Layer 4 retire → archived critic logged in `memory.jsonl`. Planner reads archive, can re-request with different scope framing.

## Skip contract

> Locked by Richie (Q6, 2026-04-23). Defines what happens when a parallel experiment is vetoed or fails _before_ reaching the measurement window.

**Skip sources** (all pre-verdict):

| Source             | Trigger                                                               | Stage      |
| ------------------ | --------------------------------------------------------------------- | ---------- |
| Apply-worker       | Technical failure — mutation couldn't execute, lint/type/format fails | Apply      |
| Critic re-run gate | Post-apply critic run surfaces new CRITICAL or >2 new HIGH (#39c)     | Post-apply |
| Visual-reviewer    | Regression detected at any breakpoint; constraint violation (#41)     | Pre-PR     |

**Contract**:

1. Skipped experiment is **terminal at the current week** — no commit on PR branch, no `baselines.jsonl` promoted row, no rollback needed (nothing shipped).
2. Orchestrator emits a `memory.jsonl` row:

   ```json
   {
     "ts": "...",
     "week": "2026-W17",
     "actor": "apply-worker" | "critic-rerun" | "visual-reviewer",
     "event": "skip",
     "exp_id": "exp-NN-<slug>",
     "reason": "apply-fail" | "critic-veto" | "visual-veto",
     "details": { "critic_name"?: "...", "finding"?: "...", "visual_check"?: "...", "apply_error"?: "..." },
     "concern_ref": "<the underlying concern the experiment was addressing>"
   }
   ```

3. `baselines.jsonl` gets entry: `{exp_id, status: "skipped-<reason>", week, concern_ref}`.
4. Week N+1 planner reads skip rows + base concern. Autonomously decides:
   - **Re-propose a variant** (different kind or framing addressing the skip reason)
   - **Pivot** to a different concern (defer this one)
   - **Drop permanently** (concern isn't worth the experimental slot)
   - **Escalate to operator** (write `operator-decision.json` row if skip pattern suggests apply-worker or critic limitation)

**Interaction with Q5 genealogy**: if the skip reason points to a coverage gap (concern unowned by existing critics, or critic fired too late — caught post-apply instead of pre-proposal), planner can emit a `genealogy_request` to spawn a pre-proposal-stage critic. Subject to Q5.1 governance.

**Invariant**: a skip is never implicit information loss. Every skip produces one `memory.jsonl` row with enough detail for next-week planning. Planner is the decision-maker about the skipped concern's fate — not a mechanical rule.

## Dependency order (what builds on what)

```text
L2 (critics + redesigner + monitor — shipped)
 └─ L3 (genealogy — shipped)
 └─ L1 (orchestrator — shipped)
 └─ L5 (mock history seeder — shipped)
     ↓
L8 (apply worker text-only)                         ← ships FIRST post-session-4
     ↓
L10 (designer scope expansion: kind-aware + multi-kind apply)
     ↓
L9 visual reviewer (#41a-d)                         ← ships AFTER L10
     ↓
L9 autoresearch measurement (#42-46)                ← ships AFTER visual reviewer
     ↓
L11 planner + experiment-aware council (NEW)        ← ships LAST, closes the loop
```

Closing the loop means: week N's verdict informs week N+1's plan informs week N+1's proposal informs week N+1's apply informs week N+1's verdict…

## Demo arc (4-week mock)

> Locked by Richie (Q9, 2026-04-23). Seeded by `scripts/seed-demo-arc.ts` (pending — extends the shipped L5 seeder). Demonstrates every L11 invariant + 6 of 7 Q4 promotion outcomes across 9 experiments and one critic-genealogy spawn.

| Week   | Experiments                                                                                                                                                                      | Verdicts                                                                                                  | Outcomes                                                | Planner direction                                | Demo beat                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **W1** | 1 exp: `exp-01-hero-h1-rewrite` (text)                                                                                                                                           | +15% page-CTR p=0.003, all gates pass                                                                     | Fast-track promote                                      | Cold-start: "explore broadly" (Q2)               | Cold-start path, first win                              |
| **W2** | 3 parallel: `exp-02-hero-copy-v2` (text), `exp-03-cta-button-component` (component), `exp-04-trust-badge-image` (asset)                                                          | 02: +8% p=0.02 all gates pass; 03: +12% p=0.006 all gates pass; 04: reward 0, brand-voice improved p=0.03 | 03 fast-track, 02 fallback-pending, 04 **gate-win**     | "extend text wins, test component + asset kinds" | Parallel + kind diversity (L10) + gate-win lane         |
| **W3** | 3 parallel: `exp-05-mid-section-image-swap` (asset), `exp-06-cta-color-shift` (css), `exp-07-subhead-rewrite` (text)                                                             | 05: +10% p=0.008 but bounce +8% p=0.03; 06: reward -11% p=0.004; 07: +4% p=0.08 (ns)                      | 05 **archive-gate-fail**, 06 **auto-rollback**, 07 hold | "deepen asset + css" — intentionally overshoots  | Dramatic beat: partial rollback + gate-fail learning    |
| **W4** | 2 parallel + genealogy: `exp-08-hero-safety-copy` (text), `exp-09-cta-size-adjust` (css); new `bounce-guard-critic` spawned via L3 genealogy in response to W3 gate-fail pattern | New critic validates; 08: +9% p=0.01 all gates pass; 09: +6% p=0.03 all gates pass                        | Both fast-track promote                                 | "conservative tuning; new critic on bounce risk" | Closing-the-loop + critic genealogy reacting to pattern |

**Invariants demonstrated**: all 8. **Q4 promotion outcomes demonstrated**: 6 of 7 (fast-track, fallback, gate-win, archive-gate-fail, auto-rollback, hold). Missing only "hold-weak-negative" which doesn't fit the narrative arc.

**Git state at W4 end**:

- 9 per-experiment commits on main (per-experiment baseline per Q8)
- 1 auto-rollback revert commit (W3 exp-06)
- `agents/bounce-guard-critic.json` added W4 via L3 genealogy spawn
- `history/baselines.jsonl`: 9 rows with status per Q8 vocabulary (`promoted` / `archived-gate-fail` / `rolled-back`)
- `history/memory.jsonl`: ~20 event rows by W4
- PRs on GitHub: W1 (1 commit), W2 (3 commits), W3 (3 commits + revert), W4 (2 commits). All merged.

**Seeder scope**: `scripts/seed-demo-arc.ts` generates the above as pure text/JSON + git commits. No real infrastructure needed to replay the arc at demo time. Council agents + apply worker + planner all run against the seeded inputs when the demo is played back. Estimated effort: ~3-4 hours.

## Grill-me open questions

Decisions needed before L11 (and some L9) can be implemented:

1. **Planner deployment** — 🔒 **LOCKED (Richie, 2026-04-23)**: Claude Managed Agent (Opus 4.7) registered at `POST /v1/agents`, invoked per-run via `POST /v1/sessions` → `POST /v1/sessions/:id/events` → poll `GET /v1/sessions/:id` pattern. Orchestrator owns memory-substrate marshaling: reads `history/memory.jsonl` tail + last 2 weeks' `verdict.json` + current monitor report, concatenates into the user-message text sent in step 3. After planner idles, orchestrator extracts plan.md from session events, writes to `history/<week>/plan.md`, appends one event row to `memory.jsonl`. Identical to the invocation pattern used today by the 6 critics + redesigner (see "Managed Agent invocation pattern" section above). 92/100 — dominates earlier options (Managed-Agent-undefined-marshaling 80, orchestrator-embedded 60, Pi-worker flip 88) on: matches existing pattern, preserves 9-agent-roster narrative, satisfies Q2 side-note via orchestrator marshaling (not a deployment change).

2. **Cold-start behavior** — 🔒 **LOCKED (Richie, 2026-04-23)**: Planner reads monitor's anomaly baseline + analytics snapshot, outputs "explore broadly" plan. Baseline-only analytics are sufficient; planner does not block on absent verdict.

3. **Rollback authority** — 🔒 **LOCKED (Richie, 2026-04-23)**: Auto-rollback fires autonomously on p<0.01 negative signal without human approval. Asymmetric safety net — hurt is cheap to revert, blocking on human defeats the autonomous claim at the crisis moment.

4. **Promotion threshold** — 🔒 **LOCKED (Richie, 2026-04-23) as Option E (92/100)**: reward-and-gates decision matrix with parallel-experiment support. See "Reward, gates, and promotion logic" section below for full spec. Dominates earlier options (1-week p<0.05, 2-week p<0.05, 4-week CVR) on: separation of reward from validation gates, gate-win lane (promote when reward holds + gates improve), reward+gate-fail archive lane (learning insight even without promotion), parallel independent-variable experiments supported in submission.

5. **Planner overriding critics** — 🔒 **LOCKED (Richie, 2026-04-23) as Option 5C (88/100)**: planner can request a NEW critic via L3 genealogy. Plan emits `genealogy_request: { concern, rationale }`; orchestrator authors the spec via existing `scripts/critic-genealogy.ts`. Cannot silence or weight existing critics. Preserves invariant #6. Directly used in Q9 demo arc W4 (bounce-guard-critic spawn). Prior rejected options: `suppressed_findings[]` (60, silences validation), `direction_hint` only (80, no blind-spot mechanism).
   - **Genealogy governance** — 🔒 **LOCKED (Richie, 2026-04-23) as Option 5.1C (90/100)**: four-layer governor bounding 5C's spawn mechanism. See "Genealogy governance" section below for full spec. Prevents token-waste drift over 52-week operation without rigid per-period caps. Token math: ungoverned spawning adds ~50% annual run cost over 3 years; governor C steady-state adds ~25%.

6. **Partial experiments (skip contract)** — 🔒 **LOCKED (Richie, 2026-04-23) as Option 6D (92/100)**: skip is terminal at the current week + feeds next-week planning as structured data. No mechanical roll-forward, no in-session retry loops. See "Skip contract" section below for full spec. Dominates prior options (roll-forward 75 creates infinite loops on systemic vetoes; retry-in-session 60 spirals; logging-only 85 doesn't answer "what next for the skipped experiment").

7. **Secondary substrates (generalization proof)** — 🔒 **LOCKED (Richie, 2026-04-23) as Option 7C (90/100)**: onboard + 2 council cycles per secondary substrate. Each secondary runs `skills/onboard-smb`, week-1 proposal + apply + mocked verdict, week-2 plan consumes week-1 verdict. Shows planner closing the loop on a new substrate — the actual pitch being tested — without ongoing live-flow cost. **Substrate pair: Alpha** — SaaS (B2B software) + local service (B2C phone-first). Maximum vertical spread across the SMB market, stress-tests brand-voice-critic across formal/community register, conversion-critic across demo-signup/phone-call models, fh-compliance-critic's silent path (correctly does NOT fire for non-medical). Substrates are synthetic single-file HTMLs generated at seed time by `skills/onboard-smb`, not hotlinked public LPs. Dominates prior options (frozen 80 — shows one-shot output, not loop-closing; full-live-flow 40 — triples cost for minimal added signal).

8. **Baseline reset granularity** — 🔒 **LOCKED (Richie, 2026-04-23) as Option 8B (90/100)**: per-experiment baseline reset. Each experiment becomes its own commit on the PR branch with `Experiment-Id:` trailer. `history/baselines.jsonl` tracks per-experiment entries. Rollback is `git revert <experiment-sha>`. Dominates full-page (55, incompatible with Q4 parallel) and section-level (70, requires synthetic metadata layer).

9. **Demo arc (4-week mock)** — 🔒 **LOCKED (Richie, 2026-04-23)**: 9 experiments across 4 weeks, seeded via `scripts/seed-demo-arc.ts` (extends L5 seeder). See "Demo arc (4-week mock)" section above for the full table. Covers all 8 invariants and 6/7 Q4 outcomes. Includes a critic-genealogy spawn in W4.

**Deprecated Q4 options (retained for audit trail):** 1-week p<0.05 (70), 2-week p<0.05 (80, superseded by 4E), 4-week CVR (60).

Answer Q5, Q6, Q7 → I implement.

## What this unlocks

Once the full stack ships, Webster's pitch upgrades:

- **v1 (today)**: Council produces proposals. Human applies. 7 agents + critic genealogy.
- **v2 (L8)**: Council produces PRs. 7 agents + genealogy + apply worker.
- **v2.5 (L10)**: Council proposes design-level changes (CSS, components, assets), not just copy.
- **v3 (L9)**: Every PR gated by visual verification. No regressions reach human review.
- **v4 (L11)**: Council plans experiments, measures outcomes, auto-rolls-back failures, promotes winners to baseline. **Genuine autonomous improvement.**

v4 is the hackathon pitch's honest claim. Everything below v4 is a subset.

---

Last updated: 2026-04-23 (session 4 Phase 7, after Richie's "pre-submission scope + planner agent + autoresearch-as-council-input" corrections).
