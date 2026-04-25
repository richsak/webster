# Sim runner session prompt — automated sim + Console capture pipeline

> Paste this into a fresh Pi (Forge worker) or Claude Code session ready to run the Webster simulation across both substrates with auto-capture of Anthropic Console memory store states. The output of this session is the asset bundle that the composition session and Beat 5 of the demo video depend on.

## Mission

You are running the simulation + capture pipeline for the Webster hackathon demo (deadline 2026-04-28).

Your job: execute the full 10-week simulation across both substrates (Richer Health LP + Northwest Home Renovations site) and auto-capture Anthropic Console memory store screenshots at week 1, 5, and 10 for each substrate.

**Do NOT** improvise, redesign critic specs, alter the council orchestrator, or modify the simulation scripts. Every parameter is locked in `context/VISION.md`, `context/EXPANSION-TASKS.md` (T7 + T8), and `context/ONBOARDING-CASE-STUDY.md` (Memory Stores capture plan).

## First actions (in order)

1. Read `AGENTS.md` (operator guide, branch conventions, do/don't rules)
2. Read `context/EXPANSION-TASKS.md` — confirm T7 (sim wrapper) and T8 (per-substrate invocations) acceptance criteria
3. Read `context/ONBOARDING-CASE-STUDY.md` "Memory Stores capture plan" section — capture protocol and targets
4. Read `context/VIDEO-PLAN.md` Beat 5 section — confirm what the captures feed
5. Confirm asset readiness checklist below
6. Run pre-flight gate
7. If anything is missing or ambiguous: surface `[STUCK]` to Richie with specific paths/symptoms. Do NOT silently fall back.

## Asset readiness checklist

Confirm each before kicking off the pipeline:

### Code

- [ ] `scripts/run-simulation-lp.ts` exists, builds, emits `CAPTURE_TRIGGER` events at weeks 1/5/10
- [ ] `scripts/run-simulation-site.ts` exists, builds, emits `CAPTURE_TRIGGER` events at weeks 1/5/10
- [ ] `scripts/capture-mem-stores.ts` exists, builds, accepts `{substrate, week, output}` arguments
- [ ] `scripts/simulation-core.ts` exists with shared loop + trigger emission helper
- [ ] All 18 sim agents registered in workspace (`webster-lp-sim-*` × 9, `webster-site-sim-*` × 9) — verify via `GET /v1/agents`
- [ ] All 12 memory stores provisioned per `context/memory-stores.json` — verify via `GET /v1/memory_stores`

### Auth + tooling

- [ ] Anthropic API key with managed-agent + memory-store quota present in `.env.local`
- [ ] GitHub PAT with repo scope present
- [ ] `browser-use` CLI installed (`browser-use doctor` passes)
- [ ] User's local Chrome "Default" profile logged into `console.anthropic.com` — `browser-use --profile "Default"` will reuse this session, no separate auth setup needed
- [ ] One manual dry run: `browser-use --profile "Default" open https://console.anthropic.com/settings/memory-stores && browser-use screenshot /tmp/dryrun.png` — confirm the captured PNG shows the authenticated store list, not a login page

### Output dirs

- [ ] `assets/memory-stores-screenshots/lp/` (created on first run)
- [ ] `assets/memory-stores-screenshots/site/` (created on first run)
- [ ] `demo-output/lp/week-{1..10}/` (sim outputs land here)
- [ ] `demo-output/site/week-{1..10}/` (sim outputs land here)

## Pre-flight gate

Before running either sim:

```bash
bun run sim:preflight
# checks: agent count = 18, memory store count = 12, Console reachable, scripts compile
```

If preflight fails: stop. Surface the failure to Richie. Do not run the sim.

## Pipeline phases

### Phase 1 — LP substrate (Richer Health)

```bash
bun run sim:lp 2>&1 | bun run sim:capture-bridge
```

`sim:lp` runs `scripts/run-simulation-lp.ts`. The bridge script reads stdout JSON lines, spots `CAPTURE_TRIGGER` events, and spawns `scripts/capture-mem-stores.ts` for each.

Expected sequence per week (1 through 10):

1. Synthetic analytics agent fires (week N analytics generated)
2. Sim spawns council session via `prompts/sim-council.md` for week N
3. Council completes, screenshots/findings/manifests written to `demo-output/lp/week-N/`
4. **At weeks 1, 5, 10 only**: sim emits a `CAPTURE_TRIGGER` JSON line to stdout
5. Bridge reads trigger, spawns capture subprocess, waits for exit 0
6. Sim moves to week N+1

Total expected duration: 30–60 min per substrate (depends on session token volume).

### Phase 2 — Site substrate (Northwest Home Renovations)

Same shape:

```bash
bun run sim:site 2>&1 | bun run sim:capture-bridge
```

### Phase 3 — Manifest emit

```bash
bun run sim:emit-manifest
# writes assets/memory-stores-screenshots/manifest.json
# writes demo-output/lp/manifest.json (consolidating per-week manifests)
# writes demo-output/site/manifest.json (consolidating per-week manifests)
```

The manifest is what the composition session reads to drive Beat 5 of the demo video.

## Trigger protocol (the contract between sim and capture)

Sim emits exactly one stdout JSON line per capture event:

```jsonc
{
  "event": "CAPTURE_TRIGGER",
  "substrate": "lp", // or "site"
  "week": 5, // 1, 5, or 10
  "output": "assets/memory-stores-screenshots/lp/week-5.png",
  "console_url": "https://console.anthropic.com/settings/memory-stores",
}
```

Bridge script behavior:

- Reads stdin line-by-line; pipes through unchanged to its own stdout (so sim logs flow visible)
- For lines parseable as `{"event":"CAPTURE_TRIGGER",...}`: spawn `scripts/capture-mem-stores.ts` with the trigger payload, wait for exit
- If capture exits non-zero: print the failure, do not advance, halt the pipe (sim stalls — better than corrupt screenshots)

## Capture subprocess (`scripts/capture-mem-stores.ts`)

The TS script shells out to the `browser-use` CLI (it does NOT call any Claude-session-only skill). Sequence:

```bash
browser-use --profile "Default" open <console_url_from_trigger>
browser-use wait selector "[data-testid='memory-stores-list']" --timeout 15000
browser-use screenshot --full <output_path_from_trigger>
```

The `--profile "Default"` flag points `browser-use` at the user's real Chrome profile, so the existing logged-in Anthropic Console session is reused. No separate auth setup is needed.

After the screenshot is written:

1. Verify the file exists and is non-empty (`stat <output>`)
2. Verify it doesn't appear to be a login page — quick heuristic: file size > 100KB AND `browser-use get text` for the page contains the word "Memory Stores"
3. Exit 0 if both checks pass

If the screenshot turns out to be a login page (auth expired): exit non-zero with a clear `AUTH_EXPIRED` marker on stderr. Bridge surfaces this; pipeline halts; user re-logs in via Chrome (no special tooling — just visit `console.anthropic.com` and sign in); pipeline resumed via the resume hook. Phases 1 + 2 are idempotent on per-week granularity — check `demo-output/{substrate}/week-N/manifest.json` exists; skip if so.

## Escalation rules — when to surface `[STUCK]`

Stop and surface if any of these:

1. Preflight fails (agent or memory store count mismatch, scripts don't compile, Console unreachable)
2. Any sim week's session fails repeatedly (3+ retry attempts) — diagnose root cause; do not paper over
3. Capture subprocess fails with `AUTH_EXPIRED` — pause, ask Richie to re-login, then resume
4. Capture subprocess fails for any other reason after 2 retries — surface immediately
5. Sim completes but a milestone screenshot is missing — pipeline failed silently somewhere; surface
6. Decision required that isn't covered by `context/VISION.md`, `EXPANSION-TASKS.md`, or `ONBOARDING-CASE-STUDY.md`

Do NOT surface for:

- Routine session retries within the council orchestrator (its own retry policy handles those)
- Non-milestone weeks (no capture expected at weeks 2, 3, 4, 6, 7, 8, 9 — by design)

## Hard rules

- Do NOT modify the sim scripts, council orchestrator, or critic specs to "fix" issues mid-run. If something is broken, surface and stop.
- Do NOT skip a milestone capture. If week 5 capture fails, halt — week 5 is required for Beat 5.
- Do NOT manually screenshot Console as a fallback during the run. If auto-capture fails, the pipeline must be fixed and re-run from the failing week, not patched up.
- Do NOT touch production agents, the production orchestrator (`prompts/second-wbs-session.md`), or anything in the existing 9 `webster-*` set.
- Do NOT run both substrates in parallel. The browser skill drives a single browser context; concurrent captures will collide.

## Output of the pipeline

| path                                                      | contents                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `demo-output/lp/week-{1..10}/`                            | per-week sim outputs (screenshots, findings, manifests, analytics, council reasoning)                                               |
| `demo-output/site/week-{1..10}/`                          | same for site substrate                                                                                                             |
| `assets/memory-stores-screenshots/lp/week-{1,5,10}.png`   | 3 PNG for LP Console captures                                                                                                       |
| `assets/memory-stores-screenshots/site/week-{1,5,10}.png` | 3 PNG for site Console captures                                                                                                     |
| `assets/memory-stores-screenshots/manifest.json`          | one-line manifest for composition                                                                                                   |
| `demo-output/lp/manifest.json`                            | consolidated per-week manifest for LP                                                                                               |
| `demo-output/site/manifest.json`                          | consolidated per-week manifest for site                                                                                             |
| `demo-output/genealogy-event.json`                        | captured POST /v1/agents request + 200 response from the organic spawn moment (whichever substrate fires; if both fire, both saved) |

These are the inputs the composition session (`prompts/composition-session.md`) consumes.

## When in doubt

- Sim semantics → `context/VISION.md` + `context/EXPANSION-TASKS.md` T7/T8
- Capture protocol → this file's "Trigger protocol" + "Capture subprocess" sections
- Beat 5 target → `context/VIDEO-PLAN.md` Beat 5
- Onboarding skill ↔ this pipeline relationship → `context/ONBOARDING-CASE-STUDY.md` "Memory Stores capture plan"
- Anything else → surface `[STUCK]` to Richie. Do not guess.
