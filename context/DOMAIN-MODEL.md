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

## Agent Roster (8 base + dynamic genealogy)

| #   | Agent                         | Model                  | Role                                                  | Shipped |
| --- | ----------------------------- | ---------------------- | ----------------------------------------------------- | ------- |
| 1   | `webster-monitor`             | Haiku 4.5              | Analytics anomaly detection                           | ✅ L2   |
| 2   | **`webster-planner`**         | **Opus 4.7**           | **NEW — reads verdict, decides experiment direction** | 📋 L11  |
| 3   | `seo-critic`                  | Sonnet 4.6             | SEO findings                                          | ✅ L2   |
| 4   | `brand-voice-critic`          | Sonnet 4.6             | Brand-voice consistency                               | ✅ L2   |
| 5   | `fh-compliance-critic`        | Sonnet 4.6             | Functional-health medical-claims audit                | ✅ L2   |
| 6   | `conversion-critic`           | Sonnet 4.6             | Conversion-path + CTA audit                           | ✅ L2   |
| 7   | `copy-critic`                 | Sonnet 4.6             | Copy quality + voice                                  | ✅ L2   |
| 8   | `webster-redesigner`          | Opus 4.7               | Synthesizes findings + plan → proposal                | ✅ L2   |
| 9   | **`webster-apply-worker`**    | **Pi / Codex gpt-5.4** | **Executes proposal against Site**                    | 📋 L8   |
| 10  | **`webster-visual-reviewer`** | **Opus 4.7**           | **Browser-based post-apply verification**             | 📋 L9   |
| —   | Genealogy critics             | Sonnet 4.6             | Runtime-created when Opus detects gap                 | ✅ L3   |

Planner is new (L11). Apply worker + visual-reviewer are planned (L8 / L9).

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

1. **Planner deployment** — Managed Agent (like monitor + redesigner) OR part of orchestrator Claude Code session? My pick: **Managed Agent (80/100)**. Matches pattern, gives it a clean audit trail, same agent-from-outside registration. Counter: embedding in orchestrator avoids a second fan-out round-trip. But orchestrator-embedded loses the "agent that decides" narrative — harder to point at as a council member. Go Managed Agent.

2. **Cold-start behavior** — week 1 has no verdict. What does planner do? Options:
   - (a) Skip planner on week 1, orchestrator uses default direction (70/100)
   - (b) Planner reads monitor's anomaly baseline + analytics snapshot, outputs "explore broadly" plan (85/100 — my pick)
   - (c) Planner refuses to run, council runs without plan.md context (60/100)

3. **Rollback authority** — can auto-rollback fire without human approval?
   - Yes on strong-negative signal (p<0.01) — **85/100**, my pick. Asymmetric safety net.
   - No, always draft PR for human — 55/100. Defeats the "autonomous" claim at the crisis moment.

4. **Promotion threshold** — what verdict triggers "promote to baseline"?
   - Proxy-improved at p<0.05 for 1 week — 70/100 (fast, but noisy)
   - Proxy-improved at p<0.05 for 2 consecutive weeks — **80/100, my pick**. Matches L9 #46 baseline promoter default.
   - CVR-improved at p<0.05 (4+ weeks) — 60/100. Too slow; blocks experimentation cadence.

5. **Planner overriding critics** — can plan.md tell a critic "don't flag X this week"?
   - Yes, via a `suppressed_findings[]` field in plan.md — 60/100. Risky; silences validation.
   - No, planner only influences direction via `direction_hint` — **80/100, my pick**. Critics remain independent. Plan shapes proposal, not findings.

6. **Partial experiments** — if #39d skips 1 of 3 issues in a PR, what does planner do next week?
   - Treat as full experiment; skipped issue rolls forward to next proposal — 75/100, my pick.
   - Treat as failed experiment; planner directs retry on skipped issues — 60/100. Creates loops.

7. **Silent secondary substrates** — other SMB LPs in the repo for generalization proof. Do they run the same L11 flow, or are they frozen demonstrations?
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
