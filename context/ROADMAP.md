# Webster Roadmap — the map

> Single source of truth for "where am I, what's next, what did I sign up for."
> Read top-to-bottom when lost. Regenerate from `context/FEATURES.md` if it drifts.

## The one-paragraph map

Webster is a **Council of Claude Managed Agents** that autonomously redesigns a small-business landing page, week after week, with **Opus 4.7 spawning new critics at runtime** when it spots patterns existing critics miss. The novel mechanic is **Critic Genealogy** — agents creating agents. The hackathon submission for Anthropic × Cerebral Valley "Built with Opus 4.7" is due **Sunday April 26 2026, 8PM EST** (~70h from now). Target prize lanes: Managed Agents $5K (62-72/100) + Creative Exploration $5K (48-58/100) + Grand $50K (18-25/100).

## North-star invariant

**Validate before human approval.** Every change passes the full validation stack — static critics → runtime gate → visual reviewer → autoresearch verdict — before it reaches a PR in Richie's inbox. Human is the last ratchet, not the first debugger. If a feature doesn't connect to this principle, it's out of scope.

## Where we are right now (2026-04-23)

- **Branch**: `main`, 5 commits ahead of `origin/main` (push-blocked by permission policy — Richie's action)
- **Submission runway**: ~70 hours to deadline
- **Shipped**: Layers 1–4 + 7 — 24 features in ~12 hours of focus-work
- **In-progress**: 1 (Layer 1 live-artifact pattern)
- **Blocked**: Layer 6 video (5 features, Richie voice record)
- **Open loops**: 3 deadline-critical + 4 scope-expansion layers (see below)
- **Full submission scope** (updated): Layers 1–11 — everything ships before 4/26

## Timeline correction (my estimation bias)

My earlier estimates assumed calendar-hours. Actual tempo: **24 features in 12 hours** with Forge + Pi workers dispatched in parallel. The remaining 4 layers (L8 + L9 + L10 + L11) total ~55 focus-hours of feature work, which at your tempo compresses to ~18–25h of your wall time. Fits in 70h runway with room for the video, form, and a voice-surgery polish pass.

Operating assumption from here forward: **every feature you name is in pre-submission scope unless you explicitly say otherwise.**

## Layer-by-layer truth

| Layer | Theme                                      | Status                                 | Features                                 |
| ----- | ------------------------------------------ | -------------------------------------- | ---------------------------------------- |
| L1    | Routine + Orchestrator                     | shipped                                | #2–6 done; #1 cut; #5 in-progress        |
| L2    | 7 Managed Agent Critics                    | shipped                                | #7–#12 done                              |
| L3    | **Critic Genealogy (HERO)**                | shipped, live-validated                | #13–#17 done                             |
| L4    | Onboarding Skill                           | shipped                                | #18, #19, #23, #24 done; #20–#22 cut     |
| L5    | Substrate + Mock History                   | core shipped                           | #27 done; #25, #26, #28 cut              |
| L6    | Meta Video                                 | blocked                                | #29–#33 waiting on voice record          |
| L7    | Polish                                     | mostly shipped                         | #34–#36 done; #37 todo (Richie action)   |
| L8    | **v2: Apply worker, text-only**            | planned — ships FIRST                  | #38 done; #39a–e, #40a–d todo            |
| L10   | **v2.5: Designer scope expansion**         | planned — ships SECOND                 | #47–#49 todo (kind+constraints+verifier) |
| L9    | **v3: Visual review + Autoresearch**       | planned — ships THIRD (0bb9db2)        | #41a–d, #42–#46 todo                     |
| L11   | **v4: Planner + experiment-aware council** | planned — ships LAST (closes the loop) | #50–#53 todo (NEW this session)          |

## What's new THIS session (session 4)

- `61cfae4` — `site/before/` + `site/after/` forked from live `certified.richerhealth.ca`; 5-issue proposal applied by hand to `after/`
- `475e129` — `context/v2-design.md` grill-me answers; Layer 8 decomposed into #39a-e + #40a-d
- `a1cb0e5` — advisor-caught regression fix: "No more patient churn" restored in Issue 4 hero
- `0bb9db2` — Layer 9 added (9 sub-features: visual-reviewer chain + autoresearch chain) + 6 hero screenshots as motivating evidence
- `f34858d` — `context/ROADMAP.md` — single source of truth for roadmap + narrative
- **PENDING (this phase)**: `context/DOMAIN-MODEL.md` (NEW) + Layer 10 + Layer 11 added to FEATURES.md

All commits local-only. Push permission policy blocks direct push to main; Richie-action item.

## Architectural shift locked this session

Autoresearch is NOT a back-end post-merge feedback loop. It's the **input** to the next council run. A **planning agent** sits before the 5 critics + redesigner, reads last week's verdict + what-changed, decides experiment direction for this week, then the council runs with `plan.md` as context.

This is the shift from **autonomous weekly redesigner** → **autonomous experiment agent**. See `context/DOMAIN-MODEL.md` for the formal model + week lifecycle + grill-me questions on the 7 remaining architectural decisions.

## Deadline-critical loops for 4/26

**Human-only actions** (no Claude can do these):

1. **Cerebral Valley submission form** (#37; ~15 min; Richie-only)
2. **Demo video voice record** (Layer 6 blocker; ~1h record + Saturday assembly)
3. **Push local commits to origin/main** (1-min terminal action, required before submission)

**Scope-expansion layers that ALSO ship pre-submission** (Claude+worker parallelizable):

4. **Layer 8** — apply worker text-only (~18h feature work)
5. **Layer 10** — designer scope expansion (~7h feature work)
6. **Layer 9** — visual review + autoresearch measurement (~18h feature work)
7. **Layer 11** — planner agent + experiment-aware council (~12h feature work, NEW)

Ordering: 1–3 anytime. 4–7 in dependency order (L8 → L10 → L9 → L11). Grill-me on DOMAIN-MODEL.md open questions unblocks L11 implementation.

## Pre-submission roadmap — L8 → L10 → L9 → L11 (dependency order)

All three layers exist to make Webster **genuinely autonomous**, not just autonomously-change-producing. Build order matters:

### L8 (v2) — Apply worker, text-only | ~18h total

**Why it exists**: today the council emits `proposal.md`. No code changes. L8 turns proposal into PR diffs. Text-level only — council says "change X to Y", apply runs find-replace, runs lint/type/format, emits a PR.

| #      | Feature                                                                   | Hours |
| ------ | ------------------------------------------------------------------------- | ----- |
| #38    | site/ fork — DONE session 4                                               | ✅    |
| #39a   | Apply worker core (Pi worker via Forge, worktree-isolated)                | 4–6   |
| #39b   | Runtime validation gate (Playwright: CTAs resolve, no JS errors)          | 2–3   |
| #39c   | Critic re-run gate (0 new CRITICAL, ≤2 new HIGH; 3-iter fix loop)         | 2     |
| #39d   | Per-cluster PR emission (1–3 issues/PR, max 3 PRs/week)                   | 3     |
| #39e   | CF Pages preview URL wiring                                               | 1–2   |
| #40a–d | Image-gen tool (tool schema, backend, brand persistence, #39 integration) | 7     |

**Testable when**: `wbs @prompts/fifth-wbs-session.md` produces a PR with real code diffs, not just `proposal.md`.

### L10 (v2.5) — Designer scope expansion | ~7h total

**Why it exists**: session-4 proved text-only proposals aren't enough. Longer copy needs smaller font-size to keep hero rhythm. Without L10, the council is a **copy-editor council**, not a **design council**. L10 lets the designer propose CSS/layout/component changes as first-class issues.

| #   | Feature                                                                               | Hours |
| --- | ------------------------------------------------------------------------------------- | ----- |
| #47 | Proposal schema v2 (kind-aware: text/css/component/asset + constraints block)         | 2     |
| #48 | Apply worker multi-kind routing (tool per kind)                                       | 3     |
| #49 | Visual-reviewer constraint verifier (asserts declared constraints in rendered output) | 2     |

**Testable when**: council proposes "shorter subhead + 0.75× hero font-size + 3-line desktop H1 constraint" as ONE atomic issue; apply worker executes all three together; visual-reviewer confirms constraint met.

### L9 (v3) — Visual review + Autoresearch | ~18h total

**Why it exists**: L8 and L10 ship changes. L9 **verifies they work**. Two halves:

**Visual reviewer** (runs immediately post-apply, pre-PR):

| #    | Feature                                                                                             | Hours |
| ---- | --------------------------------------------------------------------------------------------------- | ----- |
| #41a | `agents/webster-visual-reviewer.json` spec (Opus 4.7)                                               | 1     |
| #41b | `skills/webster-browser-audit/SKILL.md` (Playwright screenshot + a11y tree + interaction recording) | 3     |
| #41c | Proposal-intent verifier (content presence + overflow detection)                                    | 2     |
| #41d | #39 integration (3-iteration fix-hint loop back to apply worker)                                    | 1     |

**Autoresearch** (runs post-merge, week+ cycles):

| #   | Feature                                                                               | Hours |
| --- | ------------------------------------------------------------------------------------- | ----- |
| #42 | Analytics ingestion (CF Worker pixel → D1 or PostHog/GA4 webhook)                     | 3     |
| #43 | Baseline tracker + change log                                                         | 2     |
| #44 | Verdict engine (proxy-first fast signal + CVR slow confirm; asymmetric rollback gate) | 3     |
| #45 | Auto-rollback worker (git revert → CF preview → draft PR for override)                | 2     |
| #46 | Baseline promoter (2-week sustained improvement → new baseline)                       | 1     |

**Testable when**: visual-reviewer blocks a known-bad session-4-style regression; autoresearch rolls back a week that hurts proxy metrics; baseline promoter advances after 2 good weeks.

### L11 (v4) — Planner + experiment-aware council | ~12h total | NEW

**Why it exists**: L9 measures last week's experiment. But measurement without decision is half a loop. L11 adds a **planning agent** that sits BEFORE the 5 critics + redesigner, reads last week's verdict + what-changed, decides direction for this week (promote / hold / rollback), and feeds `plan.md` as context to the council run. Closes the autonomy loop — Webster becomes an **experiment agent**, not a weekly redesigner.

| #   | Feature                                                                                                           | Hours |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----- |
| #50 | `agents/webster-planner.json` (Opus 4.7) — reads verdict + what-changed, decides next-experiment direction        | 2     |
| #51 | Verdict → plan pipeline — orchestrator invokes planner with verdict.json + proposal.md + apply-log + monitor data | 3     |
| #52 | Plan → council integration — critics + redesigner read plan.md as input context                                   | 3     |
| #53 | Cold-start behavior — week 1 with no prev verdict; planner outputs "explore broadly" default plan                 | 2     |

**Testable when**: week N+1 council run reads week N verdict automatically; planner outputs plan.md before critics spawn; critics + redesigner have plan.md in context; end-to-end cycle (propose → apply → review → merge → measure → verdict → plan → propose) runs in simulator without human touch between measure and plan.

**Grill-me questions blocking L11**: 7 open decisions listed in `context/DOMAIN-MODEL.md`. Richie answers → implementation unblocks.

## Decisions waiting on you

Ranked by blast radius:

1. **Push path for 5 local commits** — direct push to main, OR PR branch? (blocks submission)
2. **Cerebral Valley submission form** (#37) — Richie-only 15-min task
3. **Voice record scheduling** — Sat AM? blocks Layer 6 video (~3h cleanup after)
4. **L11 grill-me answers** — 7 open questions in `context/DOMAIN-MODEL.md` unblock planner implementation
5. **Session-4 hero voice-surgery** — revert copy to BEFORE wording (85/100), or trim line 3 (75/100), or keep as cautionary-tale artifact (45/100)? My pick: option 1 after v2 apply worker lands, as the first-ever apply-worker PR demo
6. **`[R-confirm]` in `context/v2-design.md`** (3 items): visual-regression cost threshold, `gpt-image-1` as image backend default, PR `summary.json` alongside markdown

## Three things to hold in your head

Everything else is noise until these land:

1. **Submit by 4/26** — form + video + push origin (human-only actions)
2. **Answer L11 grill-me** — 7 questions in `context/DOMAIN-MODEL.md` unblock the planner agent and the full-cycle autonomous claim
3. **Kick off L8 #39a** — apply worker core. First real PR with mutated code. Everything downstream (L10 → L9 → L11) layers on top

The rest exists. Those three are the **bottleneck path**. Full submission scope is now all 11 layers — ~18–25h wall time at your tempo, fits in 70h runway.

## How this doc relates to the rest

- `context/FEATURES.md` — canonical per-row status. This doc quotes it; FEATURES.md is authoritative for "what's `todo` vs `done`."
- `context/ARCHITECTURE.md` — system diagram + layer breakdown. This doc is the narrative overlay.
- `context/v2-design.md` — grill-me answers + rationale for Layer 8 decomposition. This doc summarizes; v2-design.md is the detailed record.
- `~/Vault/Projects/webster/Webster.md` — cross-session hub + pitch.
- `~/Vault/Projects/webster/webster-open-loops.md` — action queue (vault-scoped, broader than this doc's 3 open loops).

## How to use this doc

- **Lost** → read top to bottom in 5 min
- **Before a session** → skim "what's new this session" + "three things to hold in your head"
- **After a decision** → update "decisions waiting on you" or ask me to
- **On a pull request** → cross-check "Layer-by-layer truth" table

This doc is the truth-source for roadmap questions. If `context/FEATURES.md` contradicts this about per-row state, FEATURES.md wins. If anything contradicts this about layer-narrative or ordering, this wins.

---

Last regenerated: 2026-04-23 (session 4 Phase 5, after Layer 9 commit + Layer 10 proposal).
