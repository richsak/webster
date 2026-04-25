# Onboarding case study — Empire Asphalt Paving

> Tier 2 hackathon demo asset. 90s case study video showing Richie's dad's paving business installing Webster from scratch via Claude Code Desktop App. Companion artifact to `context/VIDEO-PLAN.md`. Survives compaction.

**Today**: 2026-04-25. **Submission**: 2026-04-28. **3 full work days remain.**

## Mission

Show what installing Webster looks like for a real, non-technical small-business owner — using Empire Asphalt Paving (Richie's dad) as the case study. Output: a 90-second video supplementing the main 3-minute Beats 1–6 demo.

This adds a third real human to the demo chain (Nicolette in Beat 1 + Dad in this case study + Richie as builder/operator). The case study lives as:

- Submission-form supplementary video
- README hero embed
- Linked-to from the main demo (judges who want depth click here)

This is **not** a role-play. Richie narrates from the operator/builder perspective on his dad's behalf, paraphrasing dad's lived constraints — he is not pretending to be his dad.

## What's locked (Q1–Q15)

| #    | decision                                                                                                                 | rationale                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Q1   | asset = case study video, not role-play                                                                                  | dad's domain is real, dad's quote is real (paraphrased), Richie remains himself |
| Q2   | persona dissolved — Richie is Richie, dad is the user                                                                    | no character swap                                                               |
| Q3   | skill v2 = thin shell + scripts                                                                                          | matches Layer 4 architecture; UX layer over orchestration                       |
| Q4   | skill provisions full v2 stack: 9 agents + 6 memory stores + first council                                               | matches video marquee feature                                                   |
| Q5   | skill = brand context + infra wiring only; site code is upstream                                                         | Claude Design zip → Astro is a separate future skill                            |
| Q6   | substrate = Empire Asphalt Paving (`empireasphalt.ca` parked, repo modern but undeployed)                                | strongest narrative — "domain owned, no real site, Webster built it"            |
| Q7   | context capture has 3 sources: URL scrape, file uploads, dynamic Q&A                                                     | fills brand memory from whatever surfaces exist                                 |
| Q7.1 | URL scrape extracts: text + images + palette + fonts + meta                                                              | rich auto-extraction                                                            |
| Q7.2 | file types: pdf, md, txt, jpg, png, csv                                                                                  | covers 95% of dad-style assets                                                  |
| Q7.3 | corpus stored at `context/brand-corpus/` referenced from `context/business.yaml`                                         | clean, agents read by path                                                      |
| Q7.4 | Q&A is dynamic — fills only what's missing from sources 1+2                                                              | efficient                                                                       |
| Q7.5 | URL scrape failure (parked, SPA, 404) → notify user, offer move-on / retry / abandon                                     | user's problem, not Webster's                                                   |
| Q8   | recording length = 90s                                                                                                   | every phase shown, ~15s each                                                    |
| Q9   | machine-checked phase exit gates with both granular checks AND a rollup script                                           | granular = debug-friendly; rollup = UX                                          |
| Q9.2 | gate failure → show specific check that failed + remediation hint + resume from status file                              | preserves user progress                                                         |
| Q10  | recording surface = Claude Code Desktop App (native Mac window)                                                          | dad-friendly UI, real local install, real artifacts                             |
| Q11  | brand corpus = full set (logo + business card + past-jobs photos + service list + reviews + voice notes)                 | rich, realistic drag-drop video                                                 |
| Q12  | Console screenshot plan = 6 PNG total (week 1/5/10 × 2 substrates), full list page captures, week-label + delta callouts | matches Beat 5 needs                                                            |
| Q13  | sim auto-captures at milestone weeks — no human in loop                                                                  | Richie's priority: correctness over speed                                       |
| Q14  | browser skill drives local logged-in browser session — no separate auth setup                                            | uses existing tooling                                                           |
| Q15  | trigger plumbing = stdout JSON event lines parsed by parent process                                                      | clean, debuggable                                                               |
| Q16  | both this file + `prompts/sim-runner.md` written now                                                                     | survive compaction                                                              |

## The 90-second storyboard

| time   | phase              | shot                                                                                                                                                                             | content                                                                                                                                                                                       |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–8s   | P0 Overview        | title card → Mac window opens to Claude Code Desktop App                                                                                                                         | Richie VO: _"My dad runs a paving business. He has a domain. No real site. Watch what Webster does in ninety seconds."_                                                                       |
| 8–33s  | P1 Context capture | drag `logo.png`, `business-card.jpg`, `past-jobs/`, `voice-notes.md` into chat; skill auto-asks 2–3 dynamic gap-fills (voice register, do-not-use list, target customer)         | Richie VO paraphrasing dad: _"Eighteen years paving. Family business. Premium handcraft, not the cheap-truck guys."_                                                                          |
| 33–41s | P2 Prep checklist  | checklist appears in chat: Anthropic key, GitHub access, Cloudflare token                                                                                                        | VO: _"Three keys. He pastes them on his own machine. The skill never sees them."_                                                                                                             |
| 41–56s | P3 Execute         | user pastes keys locally (off-screen disclaimer overlay: _"Keys never typed in chat — pasted into `.env.local` on dad's machine"_); GitHub repo scaffolded; `.env.local` appears | VO: _"Skill writes nothing it can't see. Keys stay local."_                                                                                                                                   |
| 56–68s | P4 Verify          | green checks roll in: env ✓ / repo ✓ / 6 memory stores provisioned ✓ / 9 agents registered ✓                                                                                     | VO: _"Six memory stores. Nine agents. Wired in seconds."_ (deliberately vague — actual install time will be measured at recording and the pacing edited to match what the visuals show)       |
| 68–90s | P5 First council   | session ID flashes; PR URL surfaces; week-1 redesign of dad's site appears in browser tab; cut to Webster wordmark                                                               | VO: _"First council fires. Reads his brand. Proposes week-one redesign. Dad reviews. Merges if he likes it."_ + paraphrased dad quote: _"He told me, 'I don't even need to think about it.'"_ |

**Hard length**: 90s. **Floor**: 60s collapse via the drop priority below.

### Drop priority (if recording exceeds 90s on first cut)

1. Cut P0 title card from 8s → 4s (just Mac window opens; VO carries opener)
2. Cut P2 checklist dwell from 8s → 5s (faster reveal)
3. Cut P3 execute dwell from 15s → 10s (compress paste-and-verify visuals)
4. Cut P4 verify rolls from 12s → 8s (still show all 4 green checks but tighter pacing)
5. Cut P1 corpus dwell from 25s → 18s (drop one drag-drop, keep logo + voice-notes)

Last to drop: P5 first council reveal — that's the payoff.

## Brand corpus (Empire-specific)

Richie supplies these files on dad's behalf during recording. Mirrors the realism of an actual non-technical user gathering their own materials.

```text
context/brand-corpus/
├── logo.png                 ← royal blue circle + yellow crown + cursive "e" (provided by dad)
├── business-card.jpg        ← real if available; mock if not (consistent with logo palette)
├── past-jobs/               ← 3–5 photos of real driveways, parking lots, patches; staged stock acceptable if dad-photos unavailable
│   ├── job-1.jpg
│   ├── job-2.jpg
│   └── job-3.jpg
├── service-list.md          ← typed by Richie from dad's known services (driveway paving, parking lot resurfacing, sealcoat, line-striping, patch repair)
├── reviews.md               ← 2–3 paraphrased real reviews; include star count, customer name, year
└── voice-notes.md           ← Richie-paraphrased dad quotes capturing voice tone, do-not-use list, target customer
```

### Brand identity extracted (driving the v0 site Webster council improves)

| field             | value                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| primary color     | royal blue `#1B47A1` (from logo)                                                  |
| accent color      | bright yellow `#F9D71C` (from logo)                                               |
| voice register    | warm-direct, premium-handcraft, family-business                                   |
| reading level     | 8th–9th grade                                                                     |
| pronouns          | "we"                                                                              |
| do-not-use copy   | "industry-leading", "innovative solutions", emoji, "synergy"                      |
| do-not-use visual | stock photo of CGI trucks, cartoon icons, saturated primaries beyond brand colors |
| trust signals     | 18 years, family-owned, fully insured, real past-job photos                       |

## Recording surface

**Claude Code Desktop App** (native Mac window). Recording captures:

- Mac window chrome (looks credible to dev judges, friendly to non-dev judges)
- Real local filesystem (`Documents/Empire Asphalt/...`) — visible in Finder side
- Real `bash` calls visible in terminal pane (gh, bun)
- Real MCP tool invocations (GitHub MCP, browser skill)

**Why not claude.ai/code (web sandbox)**: sandbox UI text breaks immersion; cloud sandbox writes don't land on dad's actual machine.
**Why not terminal CLI**: too dev-coded for the "non-technical user" frame.

## Skill design — `webster-onboarding` v2

### Phase model

```text
P0 Overview      — what skill does, time budget, expectations
P1 Context       — URL scrape (optional) + file uploads (optional) + dynamic Q&A → context/business.yaml + context/brand-corpus/
P2 Checklist     — gather: Anthropic key, GitHub access, Cloudflare token
P3 Execute       — user pastes keys into .env.local locally; skill scaffolds repo, provisions stores, registers agents
P4 Verify        — bun run onboarding:verify-all (rollup) — green or stop
P5 First council — trigger session, surface PR URL, end
```

### Status file

`context/onboarding-status.json` — JSON: `{phase, completed[], next_action, started_at, brand_corpus_paths[]}`. Skill reads at startup, auto-jumps to next phase, prints one-line `resuming P3` notice.

### Phase exit gates (machine-checked)

| phase | gate        | check                                                                                                                                           |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| P0    | soft        | user typed "ready"                                                                                                                              |
| P1    | hard        | `context/business.yaml` exists + ≥1 source signal recorded                                                                                      |
| P2    | hard        | checklist all `[x]`                                                                                                                             |
| P3    | hard rollup | `bun run onboarding:verify-all` green: `.env.local` exists + `gh repo view` ok + `GET /v1/agents` returns 9 + `GET /v1/memory_stores` returns 6 |
| P4    | hard        | same rollup re-runs green                                                                                                                       |
| P5    | hard        | session_id returned + PR URL surfaced                                                                                                           |

Gate failure → show the specific check that failed + remediation hint + halt with status file preserved. User fixes, re-runs skill, resume from same phase.

### Key handling (security-critical)

- Skill **never** asks user to paste keys into chat
- Disclaimer printed at P2: _"For your safety, do NOT paste API keys into this chat. Open `.env.local` in a text editor on your own computer and paste them there."_
- Skill verifies via running `bun run verify-env` which reads `.env.local` locally + hits each provider's verify endpoint + returns ok/fail without echoing key values
- Console output for verify scripts must redact key values

### Site translation = NOT in scope of this skill

If user has a Claude Design zip → defer to a future `webster-design-import` skill. The onboarding skill stops at "site repo scaffolded with brand identity"; the actual ugly v0 of dad's site is hand-crafted by Richie during T4 (piggybacking on the ugly-site fork script for the sim substrates) and committed to dad's repo before recording.

## Memory Stores capture plan

Tier 2 item #2. Output: 6 PNG (week 1/5/10 × 2 substrates) for VIDEO-PLAN.md Beat 5.

### Architecture

```text
prompts/sim-runner.md          ← session prompt orchestrating sim + capture (NEW, written this session)
scripts/run-simulation-lp.ts   ← T7. emits CAPTURE_TRIGGER at week 1, 5, 10
scripts/run-simulation-site.ts ← T7. emits CAPTURE_TRIGGER at week 1, 5, 10
scripts/capture-mem-stores.ts  ← T11. shells out to the `browser-use` CLI, screenshots Console, saves PNG (NEW)
scripts/simulation-core.ts     ← T7. shared loop, trigger emission helper
```

### Trigger protocol

Sim emits one stdout JSON line per capture event. Parent process (`sim-runner` session) parses and spawns capture subprocess.

```jsonc
{
  "event": "CAPTURE_TRIGGER",
  "substrate": "lp",
  "week": 5,
  "output": "assets/memory-stores-screenshots/lp/week-5.png",
}
```

### Capture subprocess

`scripts/capture-mem-stores.ts` shells out to the `browser-use` CLI (a global command-line tool, not a Claude-session-only skill). The `--profile "Default"` flag attaches to the user's real Chrome profile, reusing the existing authenticated Console session — no separate Playwright auth flow required.

Sequence:

```bash
browser-use --profile "Default" open https://console.anthropic.com/settings/memory-stores
browser-use wait selector "[data-testid='memory-stores-list']" --timeout 15000
browser-use screenshot --full <output_path_from_trigger>
```

If the captured PNG is actually a login page (auth expired): exit non-zero with `AUTH_EXPIRED` on stderr. Sim halts; Richie re-logs in via Chrome; pipeline resumes from the failing week.

### Capture targets per frame

Full Console store list page UI showing all 6 stores for the substrate, byte sizes, and last-modified timestamps visible. No zoom-in on individual stores in v1; can be added later for richer Beat 5 framing.

### Captions at composition time

Composition session (per VIDEO-PLAN.md Beat 5) overlays:

- Top-left: `Week 1` / `Week 5` / `Week 10` label
- Bottom-right delta callout: e.g., `+47KB`, `+3 keys`, `+1 store touched`

## Hard rules / anti-goals

- **Never paste keys in chat.** Skill, recording, screenshots, and committed files all redact secret values.
- **No fabricated brand details.** What dad doesn't say or doesn't have, we mark TBD or skip — never invent a fake certification or stat.
- **No fake sites.** Empire's ugly v0 = real hand-crafted HTML with brand identity. Not a screenshot dressed up to look like code.
- **No claude.ai/chat.** It cannot install Webster. Skill recording fails on that surface.
- **No Playwright auth gymnastics.** Browser skill uses the user's logged-in session. If auth expires, the agent surfaces an error and halts — no silent fabrication.
- **Recording is real.** The 90-second video is one continuous take of an actual install, not a stitched simulation. If retake needed, retry in full.

## Pre-recording checklist

Before pressing record, confirm:

- [ ] `webster-onboarding` v2 skill exists at `skills/webster-onboarding/SKILL.md` with the phase model above (T12)
- [ ] `bun run onboarding:verify-all` script exists and passes against a fresh test environment (T12)
- [ ] Empire's ugly v0 HTML committed to a fresh GitHub repo Richie controls, e.g., `richsak/empire-paving-demo` (T13)
- [ ] `context/brand-corpus/` filled with all corpus files for Empire (T13)
- [ ] **Dad consent**: Richie has a clear yes from his dad on use of business name (Empire Asphalt Paving), logo, past-job photos, and paraphrased quotes in the submission video. A simple recorded "yes" voice memo or a short signed text in iMessage is enough — log the consent artifact at `assets/onboarding-case-study/dad-consent.txt` (do not commit a PII-heavy version; a one-line acknowledgment is enough).
- [ ] Anthropic API key has memory store + managed agent quota
- [ ] Cloudflare API token + GitHub PAT ready (in `.env.local`, never in chat)
- [ ] User's local Chrome "Default" profile logged into Anthropic Console (used by the `browser-use` CLI for the Memory Stores capture pipeline, separate workflow run via `prompts/sim-runner.md`)
- [ ] Mac display set to recording-friendly resolution + screen-recording app ready
- [ ] One dry-run install completed successfully end-to-end (catch issues before live take)

## Output deliverables

| file                                                      | what                                       |
| --------------------------------------------------------- | ------------------------------------------ |
| `assets/onboarding-case-study/final.mp4`                  | 90s case study video, 1080p, H.264, ≤200MB |
| `assets/memory-stores-screenshots/lp/week-{1,5,10}.png`   | 3 PNG for LP substrate                     |
| `assets/memory-stores-screenshots/site/week-{1,5,10}.png` | 3 PNG for site substrate                   |
| `assets/memory-stores-screenshots/manifest.json`          | one-line manifest for composition session  |

## When in doubt

- Skill design ambiguity → re-read this file's "Skill design" section
- Recording timing ambiguity → re-read the 90-second storyboard table
- Memory store capture ambiguity → re-read `prompts/sim-runner.md`
- Anything else → surface `[STUCK]` to Richie

If a decision conflicts with `context/VISION.md` or `context/VIDEO-PLAN.md`, those win. This file is a derivative; if it drifts, fix here, not there.
