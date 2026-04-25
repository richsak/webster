# Webster Expansion Tasks

> Topologically ordered. Implement in sequence. Do NOT skip T0. Read `context/VISION.md` before each task and re-read it before marking any task done.

## Session start protocol

When a new session starts on this repo with a prompt like "Go" or "start" or "continue":

1. **Read the first-actions list in `AGENTS.md`** in full (including `context/VISION.md` and this file) before writing any code
2. **Start T0 immediately** — no confirmation needed to begin work
3. **Stop after T0 completes** (validate green + committed). Report completion to Richie in 3–5 lines: what changed, test results, commit hash. Wait for his green-light before starting T1.
4. **From T1 onward, proceed task-by-task without waiting for approval** BUT before starting each new task, post a 2-line announcement:
   - Line 1: `Starting T<n>: <one-line-summary>`
   - Line 2: `Files I'll touch: <comma-separated-paths>`

   This gives Richie visibility to interrupt if the approach is drifting without blocking the default path.

5. **At any point**, if ambiguity exceeds what VISION.md + this file answer: stop and surface `[STUCK]` with a concrete question. Do not compose around it.

## Per-task loop

1. Re-read the task's acceptance criteria here
2. Read the files the task touches before editing them
3. Implement minimally — no scope expansion, no drive-by refactors, no "while I'm here"
4. Write the tests listed in acceptance criteria
5. `bun run validate` must be green
6. Conventional commit (`fix:` for T0, `feat:` for expansion tasks). One task = one commit (or one small series)
7. Before marking done, re-read VISION.md's "what's locked" + the task's acceptance criteria. If anything drifted, revisit.

## Day-by-day target

- **Day 1**: T0, T1, T3, T4 (infrastructure + assets, parallel-friendly)
- **Day 2**: T2, T5 (agent specs + synthetic analytics)
- **Day 3**: T6, T7, T8 + first dry run
- **Day 4**: T9, T10 + diagnose/re-run if needed + handoff

---

## T0 — Pass-7 review fixes

**Status**: blocking. 4 of 5 fixes touch simulation-path code; skipping T0 risks contaminating the demo with known bugs.

**Files**:

- `scripts/apply-worker-cli.ts:142` — og_card dims 1200x630 → 1536x1024 (or closest supported)
- `scripts/apply-worker.ts:733-739` — `runtime_failure` drops from visual-veto branch, falls through to `apply-fail`
- `.husky/pre-commit:13-15` — add `chomp;` + `print "$_\0"` in perl pipeline
- `scripts/critic-genealogy.ts` — wrap `fetchSessionSnapshot` call in `main()` with try/catch; persist spec.json + snapshot-error sentinel + agent JSON on failure; exit non-zero after commitArtifacts
- Extract shared paginated `findAgentByName` helper, import from both `scripts/planner-invoke.ts` and `scripts/critic-genealogy.ts`

**Accept**:

- `bun run validate` green
- New/updated unit tests: `runtime_failure → apply-fail`, snapshot-fetch-fail still writes spec.json, pagination helper finds name on page 2
- `printf 'foo.ts\0bar.md\0baz.txt\0' | perl -0ne 'chomp; print "$_\0" if /\.(ts|js|json|md|jsonc)$/;' | wc -c` returns 13
- Conventional commits (one per fix, or one bundled `fix: apply pass 7 review items`)

---

## T1 — Memory store provisioning

**Depends on**: T0

Create `scripts/provision-memory-stores.ts` — idempotent provisioner that creates 12 memory stores via `POST /v1/memory_stores` (beta header `managed-agents-2026-04-01`).

**Stores** (6 per substrate):

| Store name                            | Writer                        | Readers                       |
| ------------------------------------- | ----------------------------- | ----------------------------- |
| `webster-council-memory-lp`           | orchestrator (RW)             | all LP sim agents (read_only) |
| `webster-planner-memory-lp`           | planner (RW)                  | planner (RW)                  |
| `webster-redesigner-memory-lp`        | redesigner (RW)               | redesigner (RW)               |
| `webster-genealogy-memory-lp`         | orchestrator (RW)             | genealogy logic (read_only)   |
| `webster-conversion-critic-memory-lp` | conversion-critic (RW)        | conversion-critic (RW)        |
| `webster-visual-reviewer-memory-lp`   | visual-reviewer (RW)          | visual-reviewer (RW)          |
| (same 6 names with `-site` suffix)    | (parallel for site substrate) | (parallel)                    |

**Output**: `context/memory-stores.json`:

```json
{
  "lp": {
    "council": "memstore_01...",
    "planner": "memstore_01...",
    "redesigner": "memstore_01...",
    "genealogy": "memstore_01...",
    "conversion-critic": "memstore_01...",
    "visual-reviewer": "memstore_01..."
  },
  "site": { ... }
}
```

**Accept**:

- Running script twice produces identical output (idempotent by name lookup — if store with `name` already exists, reuse its ID)
- `context/memory-stores.json` contains 12 entries keyed by substrate + role
- Unit test mocks the API, verifies idempotency + error handling (network fail + partial completion resume)
- Script is safe to re-run after partial failure

---

## T2 — 18 new sim-specific agent specs

**Depends on**: T0

Create 18 new MCP-native agent specs. **Existing 9 `webster-*` agents are NOT modified.**

**LP sim set** (9 files under `agents/`):

- `webster-lp-sim-monitor.json` (Haiku 4.5)
- `webster-lp-sim-seo-critic.json` (Sonnet 4.6)
- `webster-lp-sim-brand-voice-critic.json` (Sonnet 4.6)
- `webster-lp-sim-fh-compliance-critic.json` (Sonnet 4.6)
- `webster-lp-sim-conversion-critic.json` (Sonnet 4.6)
- `webster-lp-sim-copy-critic.json` (Sonnet 4.6)
- `webster-lp-sim-redesigner.json` (Opus 4.7)
- `webster-lp-sim-planner.json` (Opus 4.7)
- `webster-lp-sim-visual-reviewer.json` (Opus 4.7)

**Site sim set** (9 files under `agents/`):

- `webster-site-sim-monitor.json`
- `webster-site-sim-seo-critic.json`
- `webster-site-sim-brand-voice-critic.json`
- `webster-site-sim-licensing-and-warranty-critic.json` (replaces fh-compliance slot, Sonnet 4.6)
- `webster-site-sim-conversion-critic.json`
- `webster-site-sim-copy-critic.json`
- `webster-site-sim-redesigner.json`
- `webster-site-sim-planner.json`
- `webster-site-sim-visual-reviewer.json`

**System prompt differences from existing `webster-*` agents**:

- **No WebFetch**. All site reads via `get_file_contents` (GitHub MCP) at the demo branch ref passed in user.message (e.g. `ref: demo-sim-lp/w03`)
- **No LP_TARGET URL** reference. Replace with substrate-appropriate context block
- **Context paths substrate-specific**: LP agents read `demo-landing-page/context/business.md`; site agents read `demo-sites/northwest-reno/context/business.md`
- **Site pages (site set only)**: redesigner + critics reference the 3-page structure (`/`, `/services`, `/free-estimate`)
- **licensing-and-warranty-critic**: scoped to contractor licensing number display, insurance claims, warranty terms, service-area clarity
- **Brand-voice critic**: reads `brand.json` + `business.md`, enforces voice + do_not_use

**Registration**: via idempotent `POST /v1/agents` (by-name lookup before POST). Wrap in `scripts/register-sim-agents.ts` or extend existing registration script.

**Accept**:

- All 18 specs validate against existing JSON schema
- `scripts/register-sim-agents.ts` idempotent: re-running doesn't duplicate
- Spec schema tests cover both sets
- No reference to `LP_TARGET` or WebFetch anywhere in the 18 new specs
- Existing 9 `webster-*` agents unchanged (diff check)

---

## T3 — Prefilled contexts

**Depends on**: T0. Can run in parallel with T2.

### 3a — Richer Health (LP)

Directory: `demo-landing-page/context/`

- `business.md` — copy from existing `context/business.md` (already Richer-Health-scoped)
- `personas.json` — 3 personas extracted from `.claude/skills/nicolette-richer/references/brand-bible.md`. Each persona: `{id, name, archetype, goals, anxieties, conversion_triggers, behavior_hints}`. Suggested: "credentials-conscious-executive" / "curious-self-starter" / "skeptical-researcher".
- `brand.json` — structured: `{voice, tone, palette, typography, signature_phrases, do_not_use}`. Extract from brand bible.

### 3b — Northwest Home Renovations (site)

Directory: `demo-sites/northwest-reno/context/`

- `business.md` — invent from scratch. Fields: business name, owner ("Sam Reyes"), location (Pacific Northwest, non-specific town), services (kitchen / bath / deck renovation), license number (fictional, e.g. WA-CONTR-NWR-2024), warranty terms ("5-year workmanship, 10-year structural"), insurance ("$2M liability"), tone ("competent, direct, trust-heavy").
- `personas.json` — 3 B2C homeowner personas: "first-time-homeowner-anxious" (scared of being scammed), "price-comparing-pragmatist" (getting 3 quotes), "warranty-conscious-veteran" (has been burned before).
- `brand.json` — palette (navy/white/safety-orange OR forest-green/cream/brass — pick one, document choice), typography (clear sans-serif + utility), voice (direct + trust-heavy), do_not_use (no superlatives, no "world-class", no generic "quality").

**Accept**:

- Both contexts validate against a shared schema you define in the task (even a simple Zod schema in `scripts/context-schema.ts` is fine)
- Both brand extracts are rich enough to give the brand-voice critic concrete rules to enforce (at least 5 do_not_use items, palette with hex codes, typography with font families)
- No cross-contamination (contractor context never references Richer Health; LP context never references Northwest Reno)

---

## T4 — Ugly sites

**Depends on**: T3 (needs brand.json to know what the ideal is, so we can deliberately violate it). Can run in parallel with T2.

### 4a — Richer Health ugly

Directory: `demo-landing-page/ugly/`

- `index.html` — single file, intentionally unpolished
- `style.css` — inline acceptable; keep minimal
- `README.md` — "Intentionally ugly. Do NOT improve outside simulation."

**Characteristics** (each is something a specific critic should flag):

- Generic stock hero image (not Nicolette's actual photo) — conversion / brand-voice / SEO ding
- Vague headline "Health & Wellness Coaching" — copy / conversion ding
- No credentials anywhere — fh-compliance / brand-voice ding
- Weak CTA "Learn More" — conversion ding
- Times New Roman everywhere — brand-voice / visual-review ding
- Center-aligned body text, no hierarchy — visual-review / copy ding
- No testimonials / social proof — conversion ding

Reference (human-read only, not committed to repo references): existing `site/before/index.html` for layout structure. Do NOT copy — derive an intentionally-worse version.

### 4b — Contractor ugly (3 pages)

Directory: `demo-sites/northwest-reno/ugly/`

- `index.html` (home) + `style.css`
- `services.html`
- `free-estimate.html`
- `README.md`

**Characteristics**:

- Home: Times New Roman, clip-art header, no photos of real work, generic phrases ("Best in the business!"), CTA is bare text link "Contact us"
- Services: a bulleted list with no descriptions, no prices, no warranties mentioned
- Free-estimate: unlabeled form inputs, no required-field markers, no phone number option, no expected-response-time
- Cross-page: inconsistent nav, no footer, no license number anywhere, no insurance mention, no before/after photos

**Accept**:

- Both ugly states commit to dedicated demo branches (`demo-sim-lp/w00`, `demo-sim-site/w00`)
- No JavaScript, no external network resources (self-contained HTML/CSS)
- Loaded in a browser they render (no broken markup); they're ugly, not broken
- Diff against `brand.json` shows broad violation — every persona and every brand rule has something to attack

---

## T5 — Synthetic Analytics Agent

**Depends on**: T3

Build `scripts/synthetic-analytics.ts` — generates per-week analytics reacting to current site state.

**Inputs** (JSON file passed via CLI or stdin):

```ts
{
  substrate: "lp" | "site",
  week: number,                   // 0-indexed, 0 = baseline
  weekDate: string,               // ISO, for seasonality
  sitePath: string,               // absolute path to site dir for current week
  contextPath: string,            // absolute path to context dir
  previousAnalytics?: AnalyticsJson, // week N-1, absent on week 0
  seed: string                    // determinism
}
```

**Output**:

- `analytics.json` — schema matches existing `scripts/analytics-ingestion.ts` (`sessions`, `bounce_rate`, `avg_time_s`, `scroll_depth_{25,50,75,100}`, `cta_clicks` per CTA, `section_engagement[]`)
- `analytics-reasoning.md` — per-persona narrative of why metrics moved (3–5 sentences each)

**Agent invocation**:

- Uses `/v1/messages` (not Managed Agents) for simplicity — synthetic analytics is one-shot, no memory needed
- Model: Opus 4.7 (judgment-heavy)
- System prompt includes: persona distribution (5000 users × 3 personas, fixed), hard continuity (±15% per metric unless justified), seasonality hints, realistic event variance, no bias toward specific gaps

**Accept**:

- Golden-file test: given fixed seed + fixed week-0 HTML + personas, produces identical analytics.json on re-run
- Continuity test: given week-0 output as previousAnalytics + SAME site (unchanged), week-1 deltas stay within ±5% per metric (no change = no reason to swing)
- Continuity test: given week-0 output + MUTATED site (hero copy improved), week-1 bounce_rate drops by 5–20%, justification in reasoning.md
- Schema-compatibility test: output `analytics.json` parses cleanly via existing `analytics-ingestion.ts` normalizer

---

## T6 — Sim orchestrator fork

**Depends on**: T2, T3, T4

Fork `prompts/second-wbs-session.md` → `prompts/sim-council.md`. Parameterize the hardcoded values.

**Changes from source**:

- Header block takes env vars: `SUBSTRATE` (`lp`|`site`), `WEEK_DATE`, `BRANCH` (e.g. `demo-sim-lp/w03`), `AGENT_SET` (`webster-lp-sim`|`webster-site-sim`), `CONTEXT_PATH`, `SITE_PATH`, `MEMORY_STORES_JSON`
- Drop the `LP_TARGET=https://certified.richerhealth.ca` line and remove all WebFetch-based critic instructions (sim agents already read via MCP)
- Drop the 10-week mock-history seeder (Step 1) — simulation wrapper generates fresh analytics per week via T5
- Agent IDs sourced from `context/sim-agents.json` (produced by T2's registration script), keyed by `$AGENT_SET`
- Memory-store attachment in every `POST /v1/sessions` call — attach the role-appropriate store from `$MEMORY_STORES_JSON`

**Accept**:

- `sim-council.md` validates shellcheck on its bash blocks
- Running with `SUBSTRATE=lp WEEK_DATE=2026-02-01 BRANCH=demo-sim-lp/w00 ... wbs @prompts/sim-council.md` produces a week-0 council run with all agents invoked via sim IDs
- Production `prompts/second-wbs-session.md` untouched (diff check)

---

## T7 — Simulation wrapper

**Depends on**: T5, T6

Build `scripts/run-simulation.ts` — library + CLI that loops N weeks for one substrate.

**Flow per week**:

1. Checkout/create demo branch `demo-sim-<substrate>/w<NN>`
2. If week 0: commit the ugly site; else use previous week's branch as base
3. Call Synthetic Analytics Agent (T5) → write `history/<substrate-demo>/w<NN>/analytics.json`
4. Spawn `prompts/sim-council.md` with env vars for this week
5. After orchestrator completes: capture screenshots at 3 breakpoints × all pages using Playwright on the local file (no deploy needed — Playwright can open file:// URLs)
6. Write memory-store summaries via REST API (council + planner + redesigner insights)
7. Bundle week artifacts into `demo-output/<substrate>/week-NN/`

**Accept**:

- Config-driven (substrate specifier, week count, paths) — not substrate-hardcoded
- Unit test with mock council (no real API calls) runs 2-week loop end-to-end
- Screenshot capture works with Playwright headless on `demo-landing-page/ugly/index.html` (file://)
- Fixed seed → identical demo branch HEAD after N weeks

---

## T8 — Per-substrate invocations

**Depends on**: T7

Thin entry scripts:

- `scripts/run-simulation-lp.ts` — calls `run-simulation.ts` with `substrate=lp` + LP paths + 10 weeks
- `scripts/run-simulation-site.ts` — calls `run-simulation.ts` with `substrate=site` + site paths + 10 weeks

**Accept**:

- `bun scripts/run-simulation-lp.ts` runs 10 weeks end-to-end, ~30–45 min
- `bun scripts/run-simulation-site.ts` same
- Output directories `demo-output/landing-page/` and `demo-output/northwest-reno/` both populated with week-00 through week-10 artifacts
- Memory Stores Console shows 12 entries populated

---

## T9 — Demo manifest + final sheets

**Depends on**: T8

Build `scripts/build-demo-manifest.ts` — aggregates simulation output.

**Per-substrate outputs**:

- `demo-output/<substrate>/demo-manifest.json` — machine-parseable index of all weeks, screenshots, council artifacts, genealogy events, memory-store references
- `demo-output/<substrate>/final-sheet.png` — side-by-side week-0 vs week-10 desktop hero shot (ffmpeg or ImageMagick)

**Accept**:

- Manifest validates against a schema you define
- Final sheet is visually compelling (real improvement visible)
- Manifest includes absolute paths the downstream video-composition session can feed to Remotion

---

## T10 — End-to-end dry run + handoff

**Depends on**: T7, T8, T9

Run both simulations. Inspect outputs. Decide.

**Accept — all must be true before handoff to video composition**:

- Both `demo-output/` substrates contain full 10-week progressions
- Screenshots visually coherent (no blank pages, no JS errors, layouts render at all 3 breakpoints)
- Memory Stores Console shows 12 stores with content (open one, verify it contains meaningful summaries)
- Genealogy log shows what happened (a spawn, or a diagnosed-then-fixed non-spawn, or an explicit "no spawn in 10 weeks" with investigation notes)
- If no spawn and no budget to re-run: accept outcome, update VISION.md risk section with the finding, proceed to video composition with improvement-only narrative

**Handoff deliverable** (for fresh Claude Code session to compose video):

- `demo-output/<substrate>/demo-manifest.json` × 2
- `demo-output/<substrate>/final-sheet.png` × 2
- Memory-Stores-Console screenshots (captured manually by Richie)
- Nicolette clip (recorded separately by Richie)
- Onboarding skill recording (recorded separately by Richie)
- Brand bible content for copy/narration reference

---

## Validation checkpoints

Before moving to the next task, verify:

1. `bun run validate` green
2. Committed (conventional commit message)
3. Re-read VISION.md's "what's locked" section — did you drift?
4. Flag anything unexpected with `[STUCK]` prefix before continuing

## When genuinely stuck

- Re-read VISION.md. The vision is the real contract.
- Surface the block to Richie. Don't produce composed-looking workarounds.
- Visible struggle > invisible corner-cutting.

---

## Tier 2 implementation tasks (case-study + auto-capture support)

> Added 2026-04-25. These tasks support the Tier 2 demo asset (Empire Asphalt onboarding case study video + automated Anthropic Console screenshot capture for Beat 5). Specced in `context/ONBOARDING-CASE-STUDY.md` and `prompts/sim-runner.md`. T11 is **blocking** T8/T10 because the sim must emit capture triggers and the bridge must consume them; T12 and T13 are case-study-only and can run parallel to T8–T10.

## T11 — Auto-capture infrastructure

**Depends on**: T7 (sim wrapper)
**Blocks**: T8 (sim invocations should emit capture triggers from the start), T10 handoff (Memory Stores screenshots are part of the deliverable)

Wire capture-trigger emission into the sim wrapper, build the bridge process that reads triggers and spawns captures, and build the capture script that drives the `browser-use` CLI.

**Before writing any T11 code (5-min pre-flight):** manually drive `browser-use` once against the real Anthropic Console memory stores page and capture the actual selectors:

```bash
browser-use --profile "Default" open https://console.anthropic.com  # navigate to memory stores via the UI
browser-use state                                                    # dump real selectors and URL
```

Copy the real list-page URL and a real container selector from the `state` output into `scripts/capture-mem-stores.ts`. The `[data-testid='memory-stores-list']` selector and `/settings/memory-stores` path used in design docs are intuition, not verified — replacing them with what `browser-use state` actually returns prevents a silent hang in the capture script.

**Code:**

- Modify `scripts/simulation-core.ts` to emit `CAPTURE_TRIGGER` JSON lines on stdout at weeks 1, 5, and 10 (exact format spec in `prompts/sim-runner.md` "Trigger protocol")
- Add `scripts/capture-mem-stores.ts` — accepts `{substrate, week, output}` from a trigger payload, shells out to `browser-use --profile "Default"` for navigation + screenshot, verifies the captured PNG is not a login page (size + text heuristic), exits 0 on success or non-zero with `AUTH_EXPIRED` on stderr if logged out
- Add `scripts/sim-capture-bridge.ts` — reads stdin line-by-line, passes through unchanged to its own stdout, parses lines that match `{"event":"CAPTURE_TRIGGER",...}`, spawns the capture script for each, halts the pipe on capture failure
- Add `bun run sim:preflight` script — checks: 18 sim agents registered, 12 memory stores provisioned, `console.anthropic.com` reachable via `browser-use`, `bun run` for sim scripts compiles
- Add `bun run sim:emit-manifest` script — at end of sim, walks `assets/memory-stores-screenshots/` and writes `manifest.json` consolidating the 6 PNG paths and per-week sizes

**Accept:**

- `bun run sim:preflight` returns 0 against a fully-provisioned environment
- A 1-week dry run (force `CAPTURE_TRIGGER` at week 1) writes a real authenticated Anthropic Console screenshot to `assets/memory-stores-screenshots/lp/week-1.png` — file > 100KB, visibly contains the memory stores list page (not a login screen)
- An auth-expired dry run (intentionally signed out of Console) makes the capture script exit non-zero with `AUTH_EXPIRED` on stderr, and the bridge halts the pipe rather than silently continuing
- Trigger protocol JSON format exactly matches `prompts/sim-runner.md` "Trigger protocol" section

## T12 — `webster-onboarding` v2 skill + verify-all script

**Depends on**: T1 (memory provisioning script), T2 (production agent specs already registered)
**Blocks**: case-study video recording

Rewrite the onboarding skill from the b3fd05f baseline to fit the v2 phase model and v2 stack. Build the rollup verify script the skill drives at P3/P4 gates.

**Code:**

- `skills/webster-onboarding/SKILL.md` — phase model (P0–P5), status file at `context/onboarding-status.json`, dynamic Q&A in P1, key-safety disclaimer at P2, machine-checked gates at each phase boundary, resume-from-status-file at startup. Full spec in `context/ONBOARDING-CASE-STUDY.md` "Skill design — webster-onboarding v2"
- `scripts/onboarding/verify-env.ts` — reads `.env.local`, hits each provider's verify endpoint, returns ok/fail without echoing key values
- `scripts/onboarding/verify-all.ts` — runs all P3 + P4 checks (env + repo + memory stores + agents) as a single rollup; supports `--phase {p3,p4}` flag
- `scripts/onboarding/scaffold-repo.ts` — creates a fresh GitHub repo under the user's account, scaffolds an Astro starter using brand identity from `context/business.yaml`

**Accept:**

- `bun run onboarding:verify-all` exits 0 only when all of: `.env.local` has the 3 keys verified live, target GitHub repo is reachable via the user's PAT, `GET /v1/agents` returns ≥9 production agents, `GET /v1/memory_stores` returns ≥6 stores
- Skill, run twice on a fresh environment, produces identical state (idempotent)
- A test run on a clean environment, with all gates failing intentionally, reports the specific failing check + remediation hint, persists the status file, and resumes correctly when re-run after fixes
- No key values appear in stdout, stderr, or any committed file at any point

## T13 — Empire Asphalt Paving substrate prep

**Depends on**: dad consent (logged at `assets/onboarding-case-study/dad-consent.txt`)
**Blocks**: case-study video recording

Hand-craft the ugly v0 of dad's site, fill the brand corpus, and create a fresh GitHub repo for the case study install to land into.

**Code + assets:**

- `context/brand-corpus/` populated with: logo.png, business-card.jpg, past-jobs/{1..3}.jpg, service-list.md, reviews.md, voice-notes.md (full spec in `context/ONBOARDING-CASE-STUDY.md` "Brand corpus")
- Fresh GitHub repo `richsak/empire-paving-demo` (private) containing a hand-crafted ugly v0 — single Astro page with the brand colors (`#1B47A1` royal blue, `#F9D71C` yellow), bad layout, missing trust signals, no responsive breakpoints. Acceptable to piggyback on T4's ugly-site fork script if it generalizes cleanly.
- `assets/onboarding-case-study/dad-consent.txt` — one-line acknowledgment confirming dad has agreed to use of business name, logo, and paraphrased quotes in the submission video. Do not commit a PII-heavy version.

**Accept:**

- `git clone richsak/empire-paving-demo` succeeds and the cloned site builds (`bun run build`) without errors
- The ugly v0 visibly uses the Empire palette and identity (not generic gray)
- Dad consent artifact exists in `assets/onboarding-case-study/`
- Brand corpus directory contains all 6 corpus categories, with at least placeholder contents for any items dad doesn't have real assets for (e.g. reviews paraphrased from real reviews if Google reviews are sparse)
