# Features

> Canonical task list. Operators mark status transitions here as they work.

## Status legend

- `todo` — not started
- `in-progress` — claimed by an operator
- `done` — shipped, validated, merged
- `blocked` — waiting on external or upstream
- `cut` — pre-committed cut per `webster-open-loops` rules

## Current submission state (2026-04-23)

- **Done**: 49 (incl. #5 live run artifacts, #38 site/ fork shipped session 4, #39b runtime gate, #39c critic rerun gate, #39d PR emission plan, #39e CF preview wiring, #40a visual asset schema, #40b image backend, #40c asset persistence, #40d apply integration, #41a visual reviewer spec, #41b browser-audit skill, #41c proposal-intent verifier, #41d visual-review integration, #42 analytics ingestion, #43 baselines schema, #44 verdict engine, #45 rollback worker, #46 baseline promoter, #47 proposal schema v2, #48 multi-kind routing, #49 constraint verifier, #50 planner agent spec, #51 memory substrate, #54 cold-start planner mode, #56 skip contract shipped)
- **In-progress**: 0
- **Blocked**: 5 (demo video — Richie voice)
- **Cut**: 7 (out of submission scope; rationale inline)
- **Todo**: 7 (1 submission form; all remaining implementation rows shipped or non-implementation blocked/cut)

Hero feature (Critic Genealogy) shipped with live Opus 4.7 validation. All 7 Managed Agents registered. Council fan-out + redesigner + PR automation scripted in `prompts/second-wbs-session.md`. CI green, 29 tests pass. Two scope reassignments below (critic-flow skill renamed; orchestrator moved from TS to bash-in-markdown prompt) — both ship equivalent functionality.

## Stream allocation

See `AGENTS.md` for stream → operator mapping.

---

## Layer 1: Routine + Orchestrator (Stream 1 — Claude Code Opus 4.7)

| #   | Status | Feature                                                                                                                                                         | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | cut    | `routines/weekly-lp-improve.yaml` — Claude Code Routine with weekly cron. Submission uses manual `wbs @prompts/...`                                             | 2     |
| 2   | done   | Orchestrator — shipped as `prompts/second-wbs-session.md` (bash-in-markdown, not `.ts`). Functionally equivalent                                                | 4     |
| 3   | done   | Shared critic skill — shipped as `skills/webster-lp-audit/SKILL.md` (renamed from `critic-flow`)                                                                | 2     |
| 4   | done   | Per-critic context pattern: `context/critics/{name}/findings.md` (5 critics + monitor seeded)                                                                   | 1     |
| 5   | done   | Run-artifact pattern: `history/YYYY-MM-DD/` — live `history/2026-04-23/` artifacts include analytics, proposal, decision, operator decision, and genealogy logs | 2     |
| 6   | done   | Branch + PR automation via `gh pr create` — wired in Step 6 of `second-wbs-session.md`                                                                          | 2     |

## Layer 2: Managed Agent Critics (Stream 2 — Codex heartbeat)

| #   | Status | Feature                                                                                                              | Hours |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------- | ----- |
| 7   | done   | `agents/webster-monitor.json` (Haiku 4.5) — analytics anomaly detection                                              | 1     |
| 8   | done   | 5 specialist critic specs: seo, brand-voice, fh-compliance, conversion, copy (all Sonnet 4.6) — all schema-valid     | 4     |
| 9   | done   | `agents/webster-redesigner.json` (Opus 4.7) — synthesis + proposal generation                                        | 1     |
| 10  | done   | GitHub MCP integration — URL-based, vault-bound (`vault_ids`), no tokens in `user.message`                           | 3     |
| 11  | done   | Environment config — `environments/webster-council-env.json` + `.id` registered                                      | 2     |
| 12  | done   | Parallel fan-out via orchestrator → 6 parallel `/v1/sessions` calls (not `callable_agents`; that's research-preview) | 2     |

## Layer 3: Critic Genealogy (Stream 1 — Claude Code Opus 4.7)

| #   | Status | Feature                                                                              | Hours |
| --- | ------ | ------------------------------------------------------------------------------------ | ----- |
| 13  | done   | Gap detection via two-tool pattern (`report_no_gap` / `report_gap`) — `dcf5726`      | 3     |
| 14  | done   | Spec author — Opus 4.7 drafts scope + focus bullets + severity rubric via `tool_use` | 2     |
| 15  | done   | Runtime registration — `POST /v1/agents` with idempotent `findAgentByName`           | 1     |
| 16  | done   | Immediate invocation — `POST /v1/sessions` with new agent ID + vault                 | 1     |
| 17  | done   | Genealogy trail — spec logged to stderr; spawned critic commits findings to branch   | 1     |

## Layer 4: Onboarding Skill (Stream 3 — Codex heartbeat)

| #   | Status | Feature                                                                                               | Hours |
| --- | ------ | ----------------------------------------------------------------------------------------------------- | ----- |
| 18  | done   | `skills/webster-onboarding/SKILL.md` — universal skill entry (renamed from `onboard-smb`)             | 2     |
| 19  | done   | Business context Q&A flow → writes `context/business.md`                                              | 2     |
| 20  | cut    | Claude Design `.zip` translation to Astro — out of submission scope                                   | 3     |
| 21  | cut    | DNS branch (Cloudflare wrangler / `.workers.dev`) — out of submission scope                           | 2     |
| 22  | cut    | GitHub App install link + Workers Builds API — out of submission scope                                | 2     |
| 23  | done   | Credential flow — macOS keychain (`anthropic-webster` service); `security add-generic-password` shown | 2     |
| 24  | done   | First council run trigger — `wbs @prompts/second-wbs-session.md`                                      | 1     |

## Layer 5: Substrate + Mock History (Stream 5 — Claude Code)

| #   | Status | Feature                                                                                                                                                    | Hours |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 25  | cut    | Fork `certified.richerhealth.ca` Astro source → `site/` — honest scope note in README. Redesigner emits `proposal.md` brief                                | 2     |
| 26  | cut    | Analytics pixel → Cloudflare Worker → KV — not needed; mock seeder + monitor feed the council                                                              | 3     |
| 27  | done   | 10-week mock history seeder — inlined in `prompts/second-wbs-session.md` Step 1 (idempotent, ~2 min)                                                       | 4     |
| 28  | cut    | Silent secondary substrates (original cut) — **superseded by L11 #58**: Pair Alpha (SaaS + local service) brought in-submission per Q7 (session-4 Phase 7) | 2     |

## Layer 6: Meta Video (Stream 4 — Claude Code or Forge)

| #   | Status  | Feature                                                                                | Hours |
| --- | ------- | -------------------------------------------------------------------------------------- | ----- |
| 29  | blocked | Remotion setup + composition template — pending Richie voice record window             | 3     |
| 30  | blocked | 5 animated comps: title, council viz, TAM + 10-week morph, genealogy diagram, end-card | 6     |
| 31  | blocked | Opus-authored narration script `video/script.md`                                       | 1     |
| 32  | blocked | Voice record (Richie) — blocker for the whole video layer                              | 2     |
| 33  | blocked | Final assembly in Descript or CapCut (3-min clean cut)                                 | 3     |

## Layer 7: Polish (Sat-Sun)

| #   | Status | Feature                                                                           | Hours |
| --- | ------ | --------------------------------------------------------------------------------- | ----- |
| 34  | done   | README — submission narrative shipped `0ed6e98` + advisor fixes `d8e76a4`         | 2     |
| 35  | done   | CI green on main — type + lint + format + schema + findings + markdown + 29 tests | 1     |
| 36  | done   | MIT LICENSE — shipped in `0ed6e98`                                                | 1     |
| 37  | todo   | Cerebral Valley submission form — Richie action at submission time                | 1     |

## Layer 8: Apply worker + image generation (pre-submission per session-4 Phase 7)

The "missing last 20%" of Webster's full loop — turning the council's `proposal.md` brief into a reviewed code diff on the live LP. Originally scoped post-submission; moved to pre-submission in session 4 Phase 7 when autoresearch became a council input (see Layer 11 + ADR-0001 + ADR-0002).

Feature #38 shipped session 4 Phase 1; #39 / #40 decomposed by session 4 Phase 2 grill-me (see `context/v2-design.md`); Q8 per-experiment commit discipline added session 4 Phase 7 (see ADR-0002).

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Hours |
| --- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 38  | done   | Fork `certified.richerhealth.ca` → `site/` — shipped session 4 (commit `61cfae4`). `site/before/` is wget mirror of live LP; `site/after/` is `before` + week 2026-04-23 proposal applied by hand. Unblocks apply-worker development + before/after demo.                                                                                                                                                                                                                                                                                                                                 | 2     |
| 39a | done   | **Apply worker core** — Pi worker (Codex gpt-5.4) via Forge workflow with worktree isolation. Reads `history/<week>/proposal.md` + `decision.json`, mutates files per selected issues, runs lint+type+format as hard floor. **Per-experiment commit discipline (Q8, ADR-0002):** one commit per experiment with `Experiment-Id: exp-NN-<slug>` trailer; never co-mingles experiments. Shipped across core branch US-001…US-004 plus CLI v5 US-005/US-006: Bun CLI wrapper and isolated integration tests for mutation, commit trailers, apply-log metadata, and validation-blocked skips. | 4-6   |
| 39b | done   | **Runtime validation gate** — apply worker now runs a pre-commit runtime gate that verifies booking CTAs resolve to canonical Acuity URLs, local scripts exist, and inline scripts do not contain explicit error paths; terminal skips emit `runtime_failure` rows. Directly motivated by the week-1 critic blind-spot on `data-calendly-base`.                                                                                                                                                                                                                                           | 2-3   |
| 39c | done   | **Critic re-run gate** — apply worker supports a `WEBSTER_CRITIC_RERUN_CMD` managed-agent hook after runtime validation and before commit; vetoes on any CRITICAL or more than 2 HIGH findings, restores files, and emits `critic_veto` skip rows. Auto-loop remains deferred to the orchestrator/fix-hint loop.                                                                                                                                                                                                                                                                          | 2     |
| 39d | done   | **Per-cluster PR emission** — apply worker now writes a `pr_emission` plan with union-find clusters on touched files, 1–3 issues per cluster, ≤3 PR clusters/week, `[partial]` labels for skipped experiments, and draft PR metadata when a CRITICAL is skipped.                                                                                                                                                                                                                                                                                                                          | 3     |
| 39e | done   | **CF Pages preview URL wiring** — apply worker writes preview deployment metadata into `apply-log.json`; `scripts/prepare-preview-build.ts` adds `data-preview="1"` to analytics scripts and injects `noindex,nofollow` for preview HTML builds.                                                                                                                                                                                                                                                                                                                                          | 1-2   |
| 40a | done   | **Tool schema + enumerated type list** — `scripts/visual-assets.ts` defines `generate_visual_asset(type, brand_context, dims, prompt)` with `type ∈ {og_card, hero_background, testimonial_headshot, icon, section_illustration}` (5-type enum from Q3). Emits stub-comment if unknown type.                                                                                                                                                                                                                                                                                              | 1     |
| 40b | done   | **Backend wire-up** — `scripts/visual-assets.ts` wires the OpenAI `gpt-image-1` image client with retry, $2/run default cost ceiling, structured rate-limit / NSFW handling, and stub-comment fallback on hard failure.                                                                                                                                                                                                                                                                                                                                                                   | 3     |
| 40c | done   | **Brand-context input + persistence** — `scripts/visual-assets.ts` loads a JSON brand-context blob from `context/business.md` + `context/palette.json`. Assets persist to `site/public/assets/generated/<week>/<type>-<slug>.<ext>` with gitignored dedup cache at `.webster/generated-cache/`.                                                                                                                                                                                                                                                                                           | 2     |
| 40d | done   | **#39 integration pattern** — apply worker materializes `<!-- asset TBD: <type> -->` placeholders during mutation. If image generation is unavailable it keeps a structured stub comment; if available it persists the asset and swaps in the generated URL.                                                                                                                                                                                                                                                                                                                              | 1     |

## Layer 9: Autoresearch loop + post-apply visual review (pre-submission per session-4 Phase 7)

Added session 4 Phase 5 after visual evidence that the static critic re-run in #39c cannot catch rendered-layout regressions. Session 4 manual apply ruined hero spacing at all three breakpoints (1440 / 768 / 375). Phase 7 reshaped the verdict model around **reward + validation gates** (Q4, ADR-0002) and **per-experiment baselines** (Q8, ADR-0002), replacing the prior single-p-value threshold + full-page baseline model. Layer 9 now provides two agents: **visual-reviewer** (rendered-layout verification immediately post-apply) and the **verdict engine** (experiment outcome vs per-experiment baseline, 7 decision lanes).

Key design calls (locked session 4 Phase 7, see ADR-0002):

- **Reward**: unified page-level CTA CTR (maximized number).
- **Gates (independent vetoes)**: brand-voice alignment, bounce ceiling, scroll floor, time-on-page floor, token efficiency, heatmap sanity.
- **7 outcome lanes**: fast-track promote (p<0.01) / fallback promote / gate-win / archive-gate-fail / auto-rollback (p<0.01 negative) / hold / hold-weak-negative.
- **Per-experiment baselines**: each experiment = its own commit + `Experiment-Id:` trailer; rollback = `git revert <experiment-sha>`. Parallel independent-variable experiments ship concurrently with a cross-experiment page-CTR gate to prevent confusion creep.
- **Proxies (scroll depth, CTA visibility, time-on-page) as fast weekly signal**; CVR as slow quarterly confirmation.
- **Visual-reviewer + #39d per-cluster PRs**: smaller PRs tighten attribution for verdicts.

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                            | Hours |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 41a | done   | **Visual-reviewer agent spec** — `agents/webster-visual-reviewer.json` (Opus 4.7 tier). Inputs: preview URL, `history/<week>/proposal.md`, BEFORE URL. Outputs: `history/<week>/visual-review.md` with findings + embedded screenshot refs.                                                                                                                                        | 1     |
| 41b | done   | **Browser-audit skill** — `skills/webster-browser-audit/SKILL.md` wraps `scripts/browser-audit.ts` for Playwright-headless when available, with fallback artifacts when unavailable. Capabilities: 3-breakpoint screenshot (375/768/1440), accessibility-tree text extraction, interaction recording, and console log capture.                                                     | 3     |
| 41c | done   | **Proposal-intent verifier** — `scripts/proposal-intent-verifier.ts` reads each issue in `proposal.md` and verifies visible phrase presence in rendered accessibility text (not source grep). Catches content drops like session-4 "No more patient churn" regression; layout overflow is covered by browser-audit summaries.                                                      | 2     |
| 41d | done   | **#39 integration pattern** — apply worker now runs the visual-reviewer gate after #39c and before #39d PR emission. It retries up to 3 iterations, records `visual_review` in `apply-log.json`, and forces draft/partial PR metadata on CRITICAL visual regressions.                                                                                                              | 1     |
| 42  | done   | **Analytics ingestion** — `scripts/analytics-ingestion.ts` normalizes CF Worker pixel / PostHog / GA4 events to `{version_sha, metric, value, timestamp}` plus metric tier. Emits D1 insert statements with proxy vs CVR classification.                                                                                                                                           | 3     |
| 43  | done   | **Per-experiment baselines schema** — `scripts/baselines.ts` validates and appends `history/baselines.jsonl` rows per experiment: `{exp_id, week, version_sha, experiment_sha, proposal_ref, decision_ref, baseline_window, status}` with `status ∈ {promoted, archived-gate-fail, rolled-back, skipped-<reason>, holding}`. Replaces week-level baselines per Q8 (ADR-0002).      | 2     |
| 44  | done   | **Verdict engine (reward+gates 7-outcome matrix)** — `scripts/verdict-engine.ts` compares analytics windows to per-experiment baselines and emits `{verdict, confidence, reward_delta, gate_status[], lane}` where `lane ∈ {fast-track-promote, fallback-promote, gate-win, archive-gate-fail, auto-rollback, hold, hold-weak-negative}`. Includes cross-experiment page-CTR gate. | 4     |
| 45  | done   | **Per-experiment auto-rollback worker** — `scripts/rollback-worker.ts` plans `git revert <experiment-sha>` for `auto-rollback` lanes, writes `history/<week>/rollback-<exp_id>.md` evidence, and marks rollback PRs as draft so Richie can override. Does not touch co-shipped winners (Q8, ADR-0002).                                                                             | 2     |
| 46  | done   | **Baseline promoter** — `scripts/baselines.ts` plans promotion after sustained promoted windows (default N=2), records promoted/current and archived/superseded SHAs, and writes promotion events so each promotion tightens the next week's bar.                                                                                                                                  | 1     |

## Layer 10: Designer scope expansion (v2.5 — pre-submission)

Added session 4 Phase 7 after Richie's diagnosis that session-4 hero regression was a **designer-scope failure**, not an apply-worker failure. The redesigner had no mechanism to propose "longer copy + reduced hero font-size together" — the proposal schema is text-only by construction. L10 makes the council a design council, not a copy-editor council.

See `context/DOMAIN-MODEL.md` for the full entity + data-flow model.

| #   | Status | Feature                                                                                                                                                                                                                                                                                              | Hours |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 47  | done   | **Proposal schema v2 (kind-aware + constraints)** — `scripts/proposal-schema-v2.ts` defines and validates issues with `kind: text\|css\|component\|asset` plus `constraints: { preserves[], within{} }`. Enables "copy change + font-size reduction, preserving 3-line desktop hero" as ONE unit.    | 2     |
| 48  | done   | **Apply worker multi-kind routing** — `routeProposalIssue()` maps text → find-replace, css → css-token, component → component-structure, and asset → visual-asset. `validateProposalConstraints()` checks preserved rendered text constraints before advancing.                                      | 3     |
| 49  | done   | **Visual-reviewer constraint verifier** — `validateProposalConstraints()` now reads proposal constraint blocks and asserts both preserved rendered text and numeric measurements (for example exact line counts / max heights). Catches proposer/apply mismatches that content-presence checks miss. | 2     |

## Layer 11: Planner + experiment-aware council (v4 — pre-submission)

Added session 4 Phase 7. Autoresearch is **input to the next council run**, not a post-merge back-end loop. New `webster-planner` agent (Opus 4.7 Managed Agent) sits before critics + redesigner, reads last week's verdict + memory substrate, decides experiment direction this week, emits `plan.md` that becomes council context.

Session 4 Phase 7 locked 9 architectural questions (Q1–Q9) — all resolved in `context/DOMAIN-MODEL.md`. Key locks: Q1 Managed Agent + orchestrator-owned memory (ADR-0001), Q2 explore-broadly cold-start + unified `history/memory.jsonl`, Q3 autonomous p<0.01 rollback, Q4 reward+gates 7-outcome matrix (ADR-0002), Q5 planner-requests-new-critic via L3 genealogy (additive-only), Q5.1 four-layer genealogy governance, Q6 skip-is-terminal + structured skip rows, Q7 Pair Alpha (SaaS + local service) substrate pair, Q8 per-experiment baselines + commit trailers (ADR-0002), Q9 4-week demo arc.

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Hours |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 50  | done   | **`agents/webster-planner.json`** (Opus 4.7 Managed Agent, Q1 ADR-0001) — registered via `POST /v1/agents`, invoked per-run via `/v1/sessions` + events + poll (pattern verified in `scripts/critic-genealogy.ts:440-556`). Reads marshaled memory context, outputs `plan.md` with `{classification, next_action, direction_hint, new_critic_request?, rationale}`. `next_action ∈ {promote_and_experiment, hold_baseline, revert_and_retry, explore_broadly}`. _Landed on `forge/task-feat-planner-agent-spec-v5` — PR #3 merged (2026-04-24)._         | 2     |
| 51  | done   | **Memory substrate schema + append helper** (Q2) — `history/memory.jsonl` event log: `{ts, week, actor, event, refs{}, insight}` where `event ∈ {promote, rollback, skip, regression, gap-detected, verdict-ready}`. Append-only. Helper in orchestrator never touched by agents — orchestrator owns all I/O (ADR-0001). _Landed on `forge/task-feat-memory-substrate` — all 4 stories (MemoryEvent types, appendEvent, tailN+filter, unit tests)._                                                                                                      | 2     |
| 52  | done   | **Orchestrator memory marshaling + planner invocation** (Q1, Q2) — new step in `prompts/second-wbs-session.md`: before critics, orchestrator reads `memory.jsonl` tail (last N events) + last 2 weeks' `verdict.json` + `monitor` anomaly report, concatenates to planner's user-message text (step 3 of the 5-step Managed Agent flow), polls until idle, extracts output, writes `history/<week>/plan.md`, appends one `verdict-ready` event row to `memory.jsonl`. _Landed on `forge/task-feat-orch-memory-planner-v2` — PR #6 merged (2026-04-24)._  | 3     |
| 53  | done   | **Plan → council integration (additive-only)** (Q5) — critics + monitor + redesigner now receive `plan.md` body in initial `user.message` context with explicit additive-only/sovereignty language. Planner `new_critic_request` is extracted to `tmp/planner-new-critic-request-<week>.json` and passed into `scripts/critic-genealogy.ts --planner-request` as additive evidence, without bypassing dedup/cap/evidence gates.                                                                                                                          | 3     |
| 54  | done   | **Cold-start explore-broadly mode** (Q2) — planner context now emits `direction_hint="broad exploration, baseline-only analytics"` when memory/verdict/monitor inputs are empty, and `appendColdStartOriginEvent()` writes the origin event row.                                                                                                                                                                                                                                                                                                         | 2     |
| 55  | done   | **Genealogy governance layers 2–4** (Q5.1) — layer 1 is prompt-only (rubric in planner + redesigner instructions: "request only if existing critics cannot cover the concern"). Layer 2: orchestrator-side dedup — reject new-critic spec if ≥60% scope overlap with existing critic (embedding cosine). Layer 3: quarterly cap — max 3 new critics / 13 weeks, soft-override by operator. Layer 4: retire-on-idle — critic with 0 findings-promoted in 8 weeks is archived. _Landed on `forge/task-feat-genealogy-gov-v1` — PR #8 merged (2026-04-24)._ | 3     |
| 56  | done   | **Skip-contract plumbing** (Q6) — apply-worker, critic-rerun gate, and visual-review gate now emit canonical structured skip rows to `history/<week>/skips.jsonl` and append skip events to `history/memory.jsonl` with reasons `{apply-fail, critic-veto, visual-veto}`. Skip is terminal and feeds next-week planner.                                                                                                                                                                                                                                  | 2     |
| 57  | done   | **`scripts/seed-demo-arc.ts`** (Q9) — 4-week primary-substrate mock: 9 experiments + 1 genealogy spawn in W4. Hits 6/7 Q4 outcome lanes (fast-track, fallback, gate-win, archive-gate-fail, auto-rollback, hold). Idempotent; writes to `history/demo-arc/` without touching live history. _Landed on `forge/task-feat-seed-demo-arc-w3w4-v5` — all 4 stories (W1/W2/W3/W4 + genealogy) done, PR #5 merged (2026-04-24)._                                                                                                                                | 3     |
| 58  | done   | **`scripts/seed-secondary-substrates.ts`** (Q7) — Pair Alpha mock: SaaS (B2B) + local service (B2C) synthetic single-file HTMLs + 2-cycle mock runs each (onboard + 2 weeks of experiments). Proves generalization beyond the primary substrate. Demo-safe (no e-commerce — private hold-out per operator decision). _Landed on `forge/task-feat-seed-pair-alpha-v1` — PR #7 merged (2026-04-24)._                                                                                                                                                       | 3     |

## Totals (historical — initial plan)

| Layer                    | # Features | Hours  |
| ------------------------ | ---------- | ------ |
| Routine + Orchestrator   | 6          | 13     |
| Managed Agent Critics    | 6          | 13     |
| Critic Genealogy         | 5          | 8      |
| Onboarding Skill         | 7          | 14     |
| Substrate + Mock History | 4          | 11     |
| Meta video               | 5          | 15     |
| Polish                   | 4          | 5      |
| **TOTAL**                | **37**     | **79** |

## Cut rationale (for judges / auditors)

Four families cut, all with the same rationale: **the council composition does not depend on them**. The hero claim is the 7-agent fan-out + runtime critic genealogy, not the distribution surface.

- **`routines/` cron wiring (#1)**: weekly trigger is operator-manual for this submission. Cron is a wrapper, not the system.
- **Site fork + analytics Worker (#25, #26)**: the redesigner emits `proposal.md` instead of `proposal.diff`. Mock analytics seeder feeds the monitor — same inputs, no live pixel needed.
- **Onboarding infra (#20, #21, #22)**: Claude Design zip translation, DNS branching, GitHub App install are all onboarding polish that only matters to a second operator. The onboarding skill itself ships (#18, #19, #23).
- **Secondary substrates (#28)**: generalization proof without narration. Out of scope for a 3-day build.
