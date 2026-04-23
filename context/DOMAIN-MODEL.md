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

```
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

```
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

```
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

## Dependency order (what builds on what)

```
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

## Grill-me open questions

Decisions needed before L11 (and some L9) can be implemented:

1. **Planner deployment** — 🔒 **LOCKED (Richie, 2026-04-23)**: Claude Managed Agent (Opus 4.7) registered at `POST /v1/agents`, invoked per-run via `POST /v1/sessions` → `POST /v1/sessions/:id/events` → poll `GET /v1/sessions/:id` pattern. Orchestrator owns memory-substrate marshaling: reads `history/memory.jsonl` tail + last 2 weeks' `verdict.json` + current monitor report, concatenates into the user-message text sent in step 3. After planner idles, orchestrator extracts plan.md from session events, writes to `history/<week>/plan.md`, appends one event row to `memory.jsonl`. Identical to the invocation pattern used today by the 6 critics + redesigner (see "Managed Agent invocation pattern" section above). 92/100 — dominates earlier options (Managed-Agent-undefined-marshaling 80, orchestrator-embedded 60, Pi-worker flip 88) on: matches existing pattern, preserves 9-agent-roster narrative, satisfies Q2 side-note via orchestrator marshaling (not a deployment change).

2. **Cold-start behavior** — 🔒 **LOCKED (Richie, 2026-04-23)**: Planner reads monitor's anomaly baseline + analytics snapshot, outputs "explore broadly" plan. Baseline-only analytics are sufficient; planner does not block on absent verdict.

3. **Rollback authority** — 🔒 **LOCKED (Richie, 2026-04-23)**: Auto-rollback fires autonomously on p<0.01 negative signal without human approval. Asymmetric safety net — hurt is cheap to revert, blocking on human defeats the autonomous claim at the crisis moment.

4. **Promotion threshold** — 🔒 **LOCKED (Richie, 2026-04-23) as Option E (92/100)**: reward-and-gates decision matrix with parallel-experiment support. See "Reward, gates, and promotion logic" section below for full spec. Dominates earlier options (1-week p<0.05, 2-week p<0.05, 4-week CVR) on: separation of reward from validation gates, gate-win lane (promote when reward holds + gates improve), reward+gate-fail archive lane (learning insight even without promotion), parallel independent-variable experiments supported in submission.

5. _(deprecated row, retained for audit trail)_
   - Proxy-improved at p<0.05 for 1 week — 70/100 (fast, but noisy)
   - Proxy-improved at p<0.05 for 2 consecutive weeks — 80/100 (superseded)
   - CVR-improved at p<0.05 (4+ weeks) — 60/100. Too slow; blocks experimentation cadence.

6. **Planner overriding critics** — can plan.md tell a critic "don't flag X this week"?
   - Yes, via a `suppressed_findings[]` field in plan.md — 60/100. Risky; silences validation.
   - No, planner only influences direction via `direction_hint` — **80/100, my pick**. Critics remain independent. Plan shapes proposal, not findings.

7. **Partial experiments** — if #39d skips 1 of 3 issues in a PR, what does planner do next week?
   - Treat as full experiment; skipped issue rolls forward to next proposal — 75/100, my pick.
   - Treat as failed experiment; planner directs retry on skipped issues — 60/100. Creates loops.

8. **Silent secondary substrates** — other SMB LPs in the repo for generalization proof. Do they run the same L11 flow, or are they frozen demonstrations?
   - Frozen demonstrations, visible in git history but no live council — **80/100, my pick** for submission scope.
   - Full live flow on all three sites — 40/100. Triples cost + complexity without adding signal.

Answer these → I implement.

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
