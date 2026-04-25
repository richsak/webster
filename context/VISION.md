# Webster — Hackathon Vision

> Canonical north-star. Appended to every session. If you're about to write code or make an architectural call, this doc tells you whether you're drifting from the real intent.

## The belief

**A website can improve itself.**

Webster is a council of Claude Managed Agents that runs weekly on an SMB's site, critiques it from multiple angles, proposes changes, applies them, and verifies the result — then does it again next week. The page gets better on its own. The business owner never logs in.

The deeper claim: when the council hits a blind spot no existing critic owns, Claude **authors a new critic**, registers it via the Managed Agents API, and from that week on the council has a new lobe of judgment. The system grows the intelligence it needs as the surface it works on evolves.

## Why this matters

Small businesses — especially blue-collar trades where AI adoption is lowest and website quality is worst — don't have the staff, budget, or expertise to run marketing experiments continuously. A landing page is built once, rarely touched, and quietly loses conversions for years.

Webster replaces that with an autonomous weekly experiment loop. Real work, every week, on brand. For Nicolette Richer (real customer, real pain) this replaces months of her manually A/B testing herself. For a random contractor in the Pacific Northwest it closes a gap no SaaS currently fills.

## The demo arc

The submission is a video. It tells one story in one flow:

1. **Problem** — clip of Nicolette describing her manual A/B testing pain
2. **Solution intro** — Richie voiceover explaining Webster's council, genealogy, and memory, overlaid on an animated UI of the council operating
3. **Landing-page timelapse** — deliberately-ugly version of Nicolette's site, evolving across 10 simulated weeks into something polished. Full-page screenshots at 3 breakpoints. 1 council veto shown mid-arc as a "rejected this week" beat for authenticity.
4. **Full-site timelapse** — fictional contractor "Northwest Home Renovations" 3-page site doing the same
5. **Genealogy reveal** — Anthropic Memory Stores Console screenshots showing the 12 council memory stores filling over time, with the moment a NEW critic spawns organically
6. **Close**

The timelapse IS the story. The council explanation sits on either side.

## Two substrates (not "multi-site support")

- **`demo-landing-page/ugly/`** — Richer Health (1 page, real brand, ugly starting state)
- **`demo-sites/northwest-reno/ugly/`** — Northwest Home Renovations (3 pages: `/`, `/services`, `/free-estimate`; fictional brand; ugly starting state)

The point is not "Webster handles multi-site." The point is **Webster's council judgment generalizes across domains**. Two substrates is enough to prove that. A third is out of scope.

## The ugly-brand decoupling — read this twice

The ugly starting state is **not** the brand. The brand comes from prefilled context files (`business.md` + `personas.json` + `brand.json`) that describe business _intent_. The ugly state is the _current unimproved surface_.

**Webster converges toward the ideal, not away from the ugly.**

Mechanical safeguards:

- Planner's first 2–3 weeks emit `direction_hint: "explore broadly, propose substantive moves not micro-tweaks"`
- Redesigner's user.message prominently includes the brand bible with framing that the current state may be far from the ideal
- Critics judge against brand bible, not against "what's currently on the page"

If an agent produces "this is slightly-better Times New Roman" instead of "replace the entire typographic system," the prompt discipline failed. Fix the prompt. Do not accept the output.

## The Synthetic Analytics Agent — the honest simulator

We mock analytics because we don't have a live traffic pipeline. But we don't mock them **statically** — static data goes stale the moment the page changes.

Each simulated week, the Synthetic Analytics Agent reads the current site state, evaluates it as a 5000-user panel across 3 personas, and emits realistic metrics (bounce, scroll depth, CTA clicks per persona, section engagement). Week-over-week continuity is enforced by hard guardrails (±15% deltas unless justified, fixed cohort, seasonality baked in, realistic traffic events).

If week 1's hero copy improves, week 2's bounce rate reflects it. If week 3 introduces unexpected friction on pricing, week 3's metrics show it. The council reacts to real consequences.

## Pure-organic genealogy

We do NOT pre-commit to which critic will spawn. Hard-coding a target would be reward-hacking the demo. The real gap-detection logic runs on authentic synthetic analytics.

Whatever the system decides to spawn IS the demo. If it picks a sharp critic, that's real proof. If it picks a useless one, that's real signal we need to fix the prompt. If it doesn't spawn in 10 weeks, that's also data — we diagnose, fix, re-run once (budget one day for this).

The video's genealogy beat dramatizes whatever happened, not what we wished.

## Memory architecture — hybrid

- **`history/memory.jsonl`** remains ground truth. Deterministic, inspectable, the substrate the planner and verdict engine already depend on.
- **Anthropic Managed Memory Stores** (public beta, `managed-agents-2026-04-01`) are populated in parallel as demo artifacts. **12 stores total, 6 per substrate**: council, planner, redesigner, genealogy, conversion-critic, visual-reviewer. Orchestrator writes summaries after each week. Planner + redesigner + genealogy attach their stores at session creation and read during work.

The simulation works without memory stores. Memory stores make the showcase real.

**Demo screenshot constraint**: the whole simulation runs in ~45 min, so all store `last_updated` timestamps land within an hour. For the video, show the Console listing with **relative captions** ("Week 1", "Week 5", "Week 10") not absolute timestamps. Or pivot to store contents (paths, file counts, doc previews) for visual variety.

## Two agent sets — additive, never touching production

Existing 9 agents (`webster-monitor`, `webster-{seo,brand-voice,fh-compliance,conversion,copy}-critic`, `webster-redesigner`, `webster-planner`, `webster-visual-reviewer`) are **UNCHANGED**. They run Nicolette's real weekly production council — WebFetch-based, `LP_TARGET=certified.richerhealth.ca` — and stay that way.

**18 new sim agents** are added:

- `webster-lp-sim-*` (9) — scoped to Richer Health simulation, **MCP-native** (read site via `get_file_contents` from demo branch, no WebFetch)
- `webster-site-sim-*` (9) — scoped to Northwest Home Renovations, MCP-native. Fifth critic is `licensing-and-warranty-critic` replacing `fh-compliance-critic`

Registration is idempotent (by name). Production flow untouched.

## State flow — everything in git

Per-week mutations commit to dedicated demo branches (`demo-sim-lp/w<N>` + `demo-sim-site/w<N>`). Sim agents read via GitHub MCP at branch-ref. No localhost, no external deploys, no preview URLs, no WebFetch. Fixed seed + fixed week dates make every run reproducible.

## Orchestrator — fork, don't rewrite

The sim orchestrator is `prompts/sim-council.md` — a parameterized fork of `prompts/second-wbs-session.md` that:

- Takes `SUBSTRATE`, `WEEK_DATE`, `BRANCH`, `AGENT_SET` from env
- Invokes the sim agent IDs (not the production ones)
- Reads site via MCP (not WebFetch)

`scripts/run-simulation.ts` is a thin TS wrapper that spawns `sim-council.md` once per week per substrate, with the Synthetic Analytics Agent generating analytics BEFORE each spawn and screenshot capture + memory-store writes AFTER. No re-implementation of critic fan-out, redesigner, visual reviewer, genealogy — those all stay in the forked markdown orchestrator where they already work.

## The onboarding skill — demo placeholder, not simulation entry

The skill EXISTS as a demo asset showing "how a non-technical user starts Webster." For the actual simulation, we skip onboarding and **prefill context files directly in-repo**. Richie will record the skill in a separate session (role-playing the contractor owner) as a video asset, separately from the simulation.

## Time budget — 4 days, disciplined

- **Day 1**: T0 (Pass-7 review fixes) + T1 (memory provisioning) + T3 (prefilled contexts) + T4 (ugly sites)
- **Day 2**: T2 (18 sim agent specs) + T5 (Synthetic Analytics Agent)
- **Day 3**: T6 (sim-council orchestrator fork) + T7 (simulation wrapper) + T8 (per-substrate invocations) + full dry run of both simulations
- **Day 4**: T9 (manifest + final sheets) + T10 (diagnose / re-run / polish) + handoff to video composition session

The plan as drafted is tight but achievable if we follow the cuts. Drift and we won't ship.

## API cost note

18 new agents × 20 simulated weeks × ~9 sessions per week ≈ 200 sessions. Plus synthetic analytics agent × 20. Estimate: **$150–$500** end-to-end depending on token volume. Consider kicking off sim runs on wall-clock days when Max-sub quota is available rather than burning API credits directly.

## What's locked

- Architecture, substrates, scripts, personas, metrics schema
- Memory design (hybrid file + 12 managed stores)
- Genealogy approach (pure organic, 1-day re-run budget)
- Ugly-brand principle (decoupled)
- State flow (GitHub MCP, demo branches, fixed-seed determinism)
- Scope boundary (two substrates, nothing more)
- Existing 9 agents untouched; 18 new sim agents additive

## What's deferred

- Nicolette video clip recording
- Video runtime target
- Final video composition (separate Claude Code session + Forge Remotion after assets exist)
- Onboarding skill recording
- Council UI animation for solution-explainer

## Out of scope — do not build

- Sitewide coordination (shared nav / header / footer cohesion across pages). Emergent through repeated single-page passes only.
- Third substrate
- Live analytics pipeline (synthetic only)
- Production deploy (demo branches are terminal)
- Multi-critic consensus rework (existing verdict engine handles it)
- Cross-substrate memory sharing (strict isolation per substrate)
- Modifications to the existing 9 production agents or `prompts/second-wbs-session.md`

## Demo risk register

| Risk                                            | Severity | Mitigation                                                                                                    |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| No organic spawn in 10 weeks                    | medium   | 1-day diagnose + re-run budget on Day 4; absolute fallback = restructure video around improvement story alone |
| Synthetic analytics produces unrealistic swings | medium   | Hard continuity guardrails + reasoning log review before committing to video                                  |
| Ugly-bias drift (redesigner anchors to ugly)    | medium   | Brand bible prominent in every session; `explore_broadly` direction hint weeks 1–3                            |
| Visual reviewer vetoes too often mid-sim        | low      | 1–2 vetoes is fine, adds authenticity                                                                         |
| Memory stores API instability                   | medium   | Hybrid design — file-based is authoritative; stores are showcase only                                         |
| Sim runtime overruns                            | low      | Parallelize substrate runs, fixed seed allows partial re-runs from week N                                     |
| API cost overrun                                | low      | Cost estimate inline above; monitor per-substrate before running both                                         |

## Trust contract

If you hit a design call this document doesn't answer, **STOP and ask**. Don't guess. Don't produce composed-looking work that papers over ambiguity. Visible struggle beats invisible corner-cutting.

If you finish a piece and find the result doesn't match the spirit of this vision — even if it matches the letter of the task — flag it. The vision is the real contract. The tasks are implementation scaffolding.
