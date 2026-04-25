# Demo Video Plan — 90-second cut (genealogy spine)

> Active spec for the 2026-04-26 hackathon submission. Supersedes `context/VIDEO-PLAN.md` for this submission. The 180s plan in `VIDEO-PLAN.md` is preserved as historical artifact for any post-submission re-cut.

## Why 90s, not 180s

Submission deadline is 2026-04-26 (one calendar day from 2026-04-25). Nicolette interview window is post-deadline, so Beat 1 of the original 180s plan is unavailable. Without Beat 1 the 180s arc loses its emotional opener. Recasting around the genealogy moment — the only capability that strictly requires Opus 4.7 reasoning — produces a tighter, harder-hitting submission than a degraded 3-min cut.

## Hard constraints

- **Deadline**: 2026-04-26
- **Length target**: 90s (acceptable floor: 80s)
- **Voice**: Richie records; no AI voice; no Nicolette clip
- **Composition stack**: Forge Remotion (per locked decision in `VIDEO-PLAN.md`)
- **Real artifacts only**: every on-screen artifact is a real file path / commit / agent name from the Webster repo. No fabrication.
- **Spine**: runtime agent genealogy — Webster spawned `visual-design-critic` in the live `history/2026-04-23/` council run

## 5-beat structure

| #   | Beat       | Time      | Spoken (~) | Hero visual                                                               | Asset source                                                |
| --- | ---------- | --------- | ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Hook       | 0:00–0:10 | 17 words   | Black → "Webster" text card → council diagram zoom                        | Forge-Remotion-authored title card                          |
| 2   | Setup      | 0:10–0:25 | 29 words   | 7-node council fan-out animation                                          | Forge Remotion comp from `agents/*.json` registry           |
| 3   | The Moment | 0:25–0:55 | 61 words   | Cursor scrolling `spec.json` → terminal `POST /v1/agents` → first finding | `history/2026-04-23/genealogy/spec.json` + screen recording |
| 4   | Receipt    | 0:55–1:15 | 35 words   | Genealogy log on screen → before/after LP morph                           | `history/2026-04-23/genealogy/` + sim `final-sheet.png`     |
| 5   | Frame      | 1:15–1:30 | 27 words   | Feature grid page scroll → end card                                       | `assets/feature-grid/index.html` (Tier 3 item #1 output)    |

Total spoken: ~169 words at ~130 wpm = ~78s. Buffer: 12s of silence/visual breathing, distributed unevenly (most at end of Beat 3 and Beat 5).

## VO recording script (Richie reads top to bottom)

Read at ~130 wpm. Record per-line takes; 3-5 takes minimum per line. Pauses between sentences are fine — they get cut at edit. Save raw takes to `assets/voiceover/raw/<beat>-<line>.wav` (or `.mp3`). External mic only — laptop mic kills credibility.

### Beat 1 — Hook (~7s spoken)

**Take 1** (declarative, intimate, set the tone for the whole video):

> "I taught a website to improve itself."

**Take 2** (matter-of-fact, slightly faster):

> "Every week, a council of Claude agents debates it."

### Beat 2 — Setup (~12s spoken)

**Take 1** (factual, clipped):

> "Seven Managed Agents — five critics, a planner, a redesigner."

**Take 2** (slightly slower, give "audit" weight):

> "Each owns one slice of the audit."

**Take 3** (three-beat rhythm, slight pause between):

> "They propose. Apply. Verify."

### Beat 3 — The Moment (~26s spoken — the hero beat)

Slow ~10% on this beat. The phrase "they wrote a new agent" is the emotional pivot — let it breathe.

**Take 1** (date-stamp opener, factual):

> "April twenty-third — they hit a problem nothing could solve."

**Take 2** (recite the three categories with slight pauses between, mirroring the visual cut):

> "Three critics flagged the same kind of issue. Hero imagery. Layout rhythm. Visual hierarchy."

**Take 3** (declarative, slight resignation in tone):

> "All three said it was outside their scope."

**Take 4** (the punchline — slow down, lean in):

> "So they wrote a new agent. With code. From scratch."

### Beat 4 — Receipt (~16s spoken)

**Take 1** (clipped, technical, receipts-energy):

> "Visual-design-critic. Sonnet four-point-six."

**Take 2** (factual, even):

> "Registered through the Managed Agents API. Same session."

**Take 3** (declarative, slight pride):

> "Six critics now. Append-only. Every spawn auditable."

**Take 4** (warmth — the only soft moment in the video, slow it down):

> "Like growing a new sense."

### Beat 5 — Frame (~12s spoken)

**Take 1** (bookend energy, mirrors Beat 1 opener):

> "A website that improves itself."

**Take 2** (declarative, hackathon claim — slight smile in voice):

> "Built with Opus four-point-seven."

**Take 3** (read the URL in natural English: "github" + "dot com" as words, not letters):

> "Receipts at github dot com slash richsak slash webster."

## Recording order recommendation

Record in this order to warm up your voice:

1. **Beat 4 takes** (technical, low stakes, easy warm-up)
2. **Beat 5 takes** (3 short lines, closer energy)
3. **Beat 2 takes** (mid-stakes, three-beat rhythm)
4. **Beat 1 takes** (set the tone — your voice should be warm here, not stiff)
5. **Beat 3 takes** (highest stakes — save your best vocal energy for the hero beat, do these last when you're warmest)

Total session length target: 30-45 min including retakes.

## Anti-goals

- Don't try to "sound like a podcast voiceover." That's the AI-slop voice. Sound like you.
- Don't rush Beat 3 punchlines. "From scratch." needs air around it.
- Don't add words. Read the locked script verbatim. Tone variation only.
- Don't pronounce "github.com" as "github-dot-com." Read "dot com" as natural words.
- Don't go up at the end of Beat 5. Land flat.
- Don't try one continuous take. Per-line takes give the editor (or composition session) room.

## Forge Remotion composition handoff brief

The video composition session reads this doc and assembles in Forge Remotion. Order:

### 1. Asset readiness check (composition session blocks until all green)

- [ ] `assets/voiceover/raw/` populated with per-line takes per the 5-beat script above
- [ ] `history/2026-04-23/genealogy/spec.json` — exists (verified 2026-04-25)
- [ ] `history/2026-04-23/genealogy/rationale.md` — exists (verified 2026-04-25)
- [ ] `demo-output/lp/week-{1,10}/screenshots/1440/index.png` — for Beat 4 before/after morph (T8 sim run output)
- [ ] `assets/feature-grid/index.html` — for Beat 5 scroll (Tier 3 item #1 output)
- [ ] Council fan-out diagram source — Forge Remotion authors from scratch using `agents/*.json` names

### 2. Composition phases

1. **Beat 1**: Title card (Forge Remotion text comp). Black → white "Webster" lockup → quick scale-zoom into council diagram (transition into Beat 2). VO Take 1 + Take 2 layered.
2. **Beat 2**: Council fan-out animation. 7 nodes appearing in sequence (planner → 5 critics → redesigner). Use real agent names from `agents/*.json` as node labels. VO Takes 1-3 layered with the node-appearance choreography.
3. **Beat 3**: Cursor-scrolling-`spec.json` screen recording → cut to terminal showing `POST /v1/agents` (mocked from real session record at `history/2026-04-23/genealogy/session.json`) → cut to first finding rendering. VO Takes 1-4 layered with cuts. SFX stinger optional on "they wrote a new agent."
4. **Beat 4**: Genealogy folder structure on screen (real `history/2026-04-23/genealogy/` listing) → before/after morph of Richer Health LP at week 0 vs week 10 (sim outputs). VO Takes 1-4 layered. Soften visual energy for Take 4 ("Like growing a new sense").
5. **Beat 5**: Quick scroll-through of `assets/feature-grid/index.html` → end card with "Built with Opus 4.7" lockup + GitHub URL + small QR code linking to repo. VO Takes 1-3 layered.

### 3. Length check

- Target: 90s. Floor: 80s.
- If overshoot: trim Beat 2 first (drop "They propose. Apply. Verify." — saves ~3s) → trim Beat 4 by removing "Append-only. Every spawn auditable." (saves ~3s) → only trim Beat 3 if absolutely required.
- If undershoot: do NOT pad. Submit short.

### 4. Output format

- 1080p MP4
- Confirm Cerebral Valley submission format requirements before bake.

### 5. Pre-submission gates

- Verify Beat 3 narration matches what actually spawned: `visual-design-critic` (NOT visual-reviewer or visual-critic — exact name from `history/2026-04-23/genealogy/spec.json`)
- Verify Beat 2 agent count matches reality at the time of the demonstrated council run (5 critics + planner + redesigner = 7, before the spawn)
- Verify Beat 4 post-spawn count: 6 critics
- Watch end-to-end at least once on a phone (most judges watch on phones)

### 6. Submit

- Cerebral Valley form
- GitHub repo link
- DM if relevant

## Open dependencies before composition can run

| Asset                                                | Status                          | Owner                  | Blocks       |
| ---------------------------------------------------- | ------------------------------- | ---------------------- | ------------ |
| Voiceover takes                                      | not recorded                    | Richie                 | Beats 1-5    |
| Sim outputs (`demo-output/lp/week-{1,10}/`)          | not run                         | T0-T13 finishing track | Beat 4 morph |
| Feature grid HTML (`assets/feature-grid/index.html`) | not built                       | Tier 3 item #1 session | Beat 5       |
| Genealogy artifacts                                  | available (verified 2026-04-25) | n/a                    | n/a          |

## When in doubt

- Tone questions: read the existing VO script in `VIDEO-PLAN.md` for register reference (warm, first-person, conversational; not declamatory).
- Asset ambiguity: surface `[STUCK]` to Richie. Do not silently improvise.
- Anything else: the spine is genealogy. If a composition decision pulls focus away from the genealogy moment (Beat 3), reject it.
