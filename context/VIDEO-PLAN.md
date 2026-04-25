# Demo Video Plan — Webster Hackathon

> **SUPERSEDED for the 2026-04-26 submission cut.** See `context/VIDEO-PLAN-90s.md` for the active 90-second genealogy-spine spec. This doc is preserved as historical artifact (180s 6-beat plan with Nicolette clip in Beat 1) for any post-submission re-cut.
> Session-durable working doc. Evolves across compactions. If resuming mid-session, read this first, then `VISION.md`.

## Session purpose

Grill through the 6-beat demo video arc until every decision is locked. Output is a shot-list / narrative spec that the video-composition session (fresh Claude Code + Forge Remotion) builds against. This is NOT the simulation implementation track (that's `EXPANSION-TASKS.md`).

## Hard constraints

- **Deadline**: 2026-04-28 (Built with Opus 4.7 by Anthropic × Cerebral Valley)
- **Today**: 2026-04-24 (4 days to submission, 3 full work days)
- **Locked scope**: `VISION.md` — two substrates, 10 weeks × 2 sims, hybrid memory, pure-organic genealogy
- **Human-in-loop assets** (Richie records separately):
  - Nicolette clip (A/B testing pain)
  - Voiceover narration
  - Onboarding skill role-play (contractor persona)
  - Memory Stores Console screenshots
- **Composition stack**: Claude Design (claude.ai/design, research preview, code-powered animations + UI) for diagram + artifact micro-UIs; Forge Remotion for final video composition (voiceover + Nicolette clip + Claude Design output + screenshot timelapses + transitions). Deployed via fresh session after sim assets exist.

## Implementation track status (as of compaction)

- T0 Pass-7 fixes: ✓ shipped
- T1 memory stores: ✓ shipped
- T2 sim agent specs: ✓ shipped
- T3 substrate contexts: ✓ shipped
- T4 ugly baselines: ✓ shipped
- T5 Synthetic Analytics Agent: next
- T6–T10: queued

Video planning runs in parallel with T5–T10. The video-composition session happens AFTER T10 when all assets exist.

## Video arc (6 beats)

1. **Problem** — Nicolette clip (manual A/B testing pain)
2. **Solution intro** — Voiceover + council UI animation
3. **LP timelapse** — Richer Health 10-week timelapse (one veto/skip beat)
4. **Site timelapse** — Northwest Home Renovations 10-week timelapse
5. **Genealogy reveal** — Memory Stores Console + spawn moment
6. **Close** — Tagline, CTA, Anthropic framing

## Grill status

| Beat | Budget (target/floor) | Status                              | Next action                      |
| ---- | --------------------- | ----------------------------------- | -------------------------------- |
| 1    | 45s / 35s             | LOCKED (talking points + drop list) | Richie sends to Nicolette        |
| 2    | 35s / 25s             | LOCKED                              | (composition session implements) |
| 3    | 35s / 25s             | LOCKED                              | (composition session implements) |
| 4    | 30s / 22s             | LOCKED                              | (composition session implements) |
| 5    | 25s / 18s             | LOCKED with fallback rules          | (composition session implements) |
| 6    | 10s / 8s              | LOCKED                              | (composition session implements) |

## Composition session brief (handoff start)

This document is the locked spec. The video-composition session reads it and executes. Order:

1. **Confirm asset readiness**:
   - `demo-output/lp/week-{1..10}/` populated (screenshots at 375/768/1440, manifests, council reasoning, analytics.json)
   - `demo-output/site/week-{1..10}/` populated
   - Memory Stores Console screenshots captured at relative weeks (Richie)
   - Nicolette clip recorded (Richie)
   - Voiceover recorded per Beat 2/3/4/5/6 scripts (Richie)
   - Real artifact bodies extracted: best critic finding (Beat 2 Window 1) + actual `POST /v1/agents` request+response (Beat 2 Window 2)
   - If genealogy didn't spawn → see Beat 5 fallback rules; do NOT silently improvise

2. **Build animated assets in Claude Design** (claude.ai/design):
   - Beat 2: council diagram + 2 artifact windows (per Beat 2 spec, including 5 critic nodes with `xxx-critic` + role subtitles)
   - Beat 3 + Beat 4: animated bounce-rate line chart, fed by `analytics.json` per substrate
   - Beat 5: composite Console-styled UI with genealogy tree, week N captions, spawn animation
   - Beat 6: final frame composition (Webster wordmark + "Built with Opus 4.7" lockup + GitHub URL + small QR)

3. **Compose in Forge Remotion**:
   - Sequence: Beat 1 (45s) → Beat 2 (35s) → Beat 3 (35s) → Beat 4 (30s) → Beat 5 (25s) → Beat 6 (10s) = 180s
   - Embed Claude Design output via `<Html>` / `<IFrame>` or screen-recorded MP4 asset
   - Layer voiceover audio synced to choreography tables in each beat spec
   - Music bed under all beats except where VO carries; SFX stinger at Beat 5 spawn moment

4. **Length check**:
   - Target: 3:00 (180s). Cerebral Valley cap: confirm before bake.
   - If overshoot: walk drop-priority lists mechanically (per beat, ordered)
   - If undershoot: do NOT pad. Submit short.

5. **Output format**: 1080p MP4. Confirm any specific Cerebral Valley submission format requirements.

6. **Pre-submission gates**:
   - Verify Beat 5 narration matches what actually spawned (substitute real critic name into the overlay)
   - Verify Beat 3/4 veto callouts match real veto weeks from sim manifest
   - Verify all on-screen agent spec names match the registered agent names (no typos vs `agents/*.json`)
   - Watch end-to-end at least once on a phone (most judges watch on phones)

7. **Submit**: Cerebral Valley form. Then GitHub repo link. Then DM if relevant.

If anything ambiguous, surface `[STUCK]` to Richie — don't improvise.

---

## Beat 1 — Nicolette clip (locked draft)

**Role**: Emotional hook. Real user describing real pain. Not a product endorsement.

**Talking points** (pick 3-4 for final):

1. **The weekly reality** — "Every week I'm on the clinic floor. I treat patients, I run the business, I can't also sit at my laptop A/B testing hero copy."
   - _Lands because_: time-scarcity is universal SMB pain; "clinic floor" is concrete.

2. **Manual A/B mechanics** — "I've changed headlines before. You change one line and you don't know for a month whether it helped. By then you forgot what you changed."
   - _Lands because_: concrete mechanics of why solo A/B is broken — timescale × memory = impossible feedback loop.

3. **Trust-sensitive business** — "My patients need to trust me before they ever come in. My site has to earn that. Not once — every time."
   - _Lands because_: LP isn't marketing fluff; it's patient acquisition in a trust profession.

4. **Time cost** — "I'd need to pay someone 10-20 hours a month to do what Webster does in a weekly cycle."
   - _Lands because_: concrete dollar/hour framing judges hear without Richie narrating.

5. **Transformative outcome** — "I just want to walk in Monday and know the page is better than last Monday. Without me doing anything."
   - _Lands because_: articulates Webster's outcome in her own words.

6. **AI credibility pivot** — "I've tried AI tools before. They gave me generic copy. This is the first one that sounds like me."
   - _Lands because_: brand-voice preservation differentiates Webster from LLM-slop.

**Production notes**:

- Natural lighting (clinic or home office background)
- Medium-close framing, eye level
- External mic (lavaliere or shotgun) — laptop mic kills credibility
- Each point: 20-45 seconds raw. 3-5 takes per point.
- No teleprompter. She speaks from heart.

**Anti-goals**:

- NO scripted lines reading
- NO Webster endorsement phrases
- NO naming "Webster" or "the council"
- NO discussing Opus 4.7 or Anthropic (voiceover's job)
- NO A/B jargon (bounce rate, funnel)

**Final cut target**: 45s (target) / 35s (floor) — pick 3 talking points for target, drop to 2 for floor

**First-cut recommended**: #1 (clinic floor) + #2 (manual A/B mechanics) + #5 (Monday outcome). #1 anchors the time-pain, #2 makes it concrete, #5 articulates the exact Webster outcome in her own words.

**Drop priority (first to drop → last to drop) if cut runs long**:

1. #4 (time cost dollar framing) — voiceover can deliver this more efficiently
2. #6 (AI credibility pivot) — overlaps with brand-voice reveal in Beat 2
3. #3 (trust-sensitive business) — important but adjacent, not core A/B pain
4. #2 (manual A/B mechanics) — concrete but partially redundant with #1
5. #1 (clinic floor) — anchor opener, hard cut
6. #5 (Monday outcome) — must-keep, defines outcome

If only 2 fit (floor cut), keep #1 + #5.

### Beat 1 — Interview guide for Nicolette meeting

Goal: elicit the 6 talking points in her own words. Open questions first; follow-ups only if she doesn't hit the angle naturally. **Do NOT ask her to praise Webster, name the council, or read lines.**

**Opening framing** (say to her before recording starts):

> "I'm not going to put words in your mouth or feed you lines. I just want to record you describing your week and what's hard, in your own words. Talk like you're explaining it to a friend, not pitching anything. We'll do multiple takes — feel free to retry any answer."

**Interview questions** (in order, each elicits a talking point):

| #   | Question to ask on camera                                                                                                      | Eliciting (talking point)                        | Follow-up if she doesn't hit it                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | "Walk me through what your average week looks like."                                                                           | #1 — weekly reality, clinic floor, time scarcity | "When in your week do you ever sit at your laptop and optimize the website?"           |
| 2   | "Have you ever tried to change something on the website to get more bookings? What happened?"                                  | #2 — manual A/B mechanics, broken feedback loop  | "How long did it take to know whether the change worked?"                              |
| 3   | "What role does your website play in your relationship with patients?"                                                         | #3 — trust-sensitive business                    | "How does the page need to make a brand-new patient feel before they ever walk in?"    |
| 4   | "If you wanted to keep improving the website every week — manually — what would that cost you?"                                | #4 — time cost, hire-someone framing             | "Would you actually hire someone to do that, or just live without it?"                 |
| 5   | "If a tool could quietly improve your website each week without you doing anything, what would the perfect outcome feel like?" | #5 — Monday outcome, transformative              | "What would you want to see when you check it next week vs this week?"                 |
| 6   | "Have you tried any AI tools for your business before? What was that experience like?"                                         | #6 — AI credibility pivot, generic copy          | "Did any of them ever feel like they actually understood your business or your voice?" |

**Soft warm-up question** (use if she's stiff at start, no need to use the take in final cut):

> "Tell me a bit about yourself and Richer Health — what you do, who your patients are."

**Anti-goals during the interview** (avoid these mistakes):

- Don't ask her to praise Webster, the council, or any product. Anything she says about a product becomes salesy.
- Don't say "rate Webster on a scale of..." — she's not reviewing software.
- Don't lead with claims ("Webster cut your bounce rate by X%") — she'll repeat the number and it's fabrication.
- Don't ask yes/no questions — they produce dead air. Open questions only.
- Don't interrupt her for retakes mid-answer. Let her finish, then ask "wanna try that one again?"
- Don't worry about background noise / lighting too much — patient-clinic look is authentic. Just no distracting background motion.

**Production reminders** (you already know but for the record):

- External mic on her (lavaliere or shotgun). Phone mic kills credibility.
- Eye-level framing, medium-close (shoulders up).
- Multi-take per question — get 3-5 takes per angle so you have options at edit time.
- Total recording target: ~30-45 min for all 6 angles + warm-up.
- Final cut from this footage: 45s (Beat 1) + 3s echo (Beat 6 bookend, ideally pulled from talking point #5).

**Edit-time selection rule**: in the final cut, prefer takes where she sounds _resigned_ over takes where she sounds _frustrated_. The Beat 1 emotional register is "this is just my reality" not "this is unfair." Resignation registers as relatable; frustration registers as venting.

## VO recording script (Richie reads top to bottom)

Total spoken material: ~65 seconds across 5 narrated beats. Recording session length: aim for 30-45 min including retakes.

**Tone reminders (before you start)**:

- Conversational, not declamatory. Talk like you're explaining to a curious friend.
- ~130 wpm — slower than your normal speech; let lines breathe.
- 3-5 takes minimum per line. Read straight first, then vary emphasis.
- Pauses between sentences are fine — they get cut at edit.
- For punchlines ("Like growing a new sense" / "Real. Not pre-scripted." / the tagline) — slow down, lean in.

---

### Beat 2 — Solution intro (~24s spoken)

Record as 4 separate takes. Pause 2-3s between takes for the editor.

**Take 1**:

> "I taught a website to improve itself."

**Take 2**:

> "Every week, a council of Claude agents debates it — copy, conversion, brand voice, SEO, compliance. They propose, apply, verify."

**Take 3**:

> "And when they hit a blind spot they can't solve — they write a new agent. With code. From scratch."

**Take 4** (slow down, this is the Beat 2 punch + Beat 5 setup):

> "Like growing a new sense."

---

### Beat 3 — LP timelapse VO (~9s spoken total)

3 sparse callouts. Each is a single line, recorded standalone.

**Take 1** (week 1 callout — slight resignation in tone, this is the "before"):

> "Week one — ugly, generic, no brand."

**Take 2** (veto callout — flat, factual, slightly amused at the system):

> "Week six — the council rejected this redesign."

**Take 3** (week 10 callout — confident, payoff energy):

> "Week ten — on brand, converting."

---

### Beat 4 — Site timelapse VO (~9s spoken total)

3 sparse callouts.

**Take 1** (opening, the highest-leverage 4 words in Beat 4):

> "Different industry. Same system."

**Take 2** (veto, parallel to Beat 3):

> "Council rejected this redesign."

**Take 3** (week 10):

> "Trust signals. Clear pricing. Mobile-ready."

---

### Beat 5 — Genealogy reveal (~19s spoken)

3 narration segments + a spawn-moment pause.

**Take 1** (setup, descriptive):

> "Twelve memory stores fill over the weeks. Each council inherits what came before."

**Take 2** (problem reveal + spawn — the dramatic line):

> "And in week eight — they hit a problem nothing could solve. So they wrote a new agent."
> ⚠️ **Placeholder check**: if actual spawn happened on a different week (not week 8), record alternates: "...week seven...", "...week nine...", etc. Get whatever range covers the likely actual spawn week.

**Take 3** (post-spawn, confident, factual):

> "A new sense. Real. Not pre-scripted."

---

### Beat 6 — Close (~4s spoken)

**Take 1** (bookend energy, slight smile in voice):

> "A website that improves itself. Built with Opus 4.7."

---

### Recording order recommendation

Record in this order to warm up your voice:

1. Beat 3 callouts (3 short lines — easy warm-up, low stakes)
2. Beat 4 callouts (3 short lines — same energy as Beat 3)
3. Beat 6 tagline (single short line — closer)
4. Beat 5 narration (3 takes — mid-stakes, building)
5. Beat 2 narration (4 takes — highest stakes, do these last when you're warmest)

Save your best vocal energy for Beat 2 since it sets the tone for the whole video.

### Anti-goals

- Don't try to "sound like a podcast voiceover." That's the AI-slop voice. Sound like you.
- Don't rush Beat 2 punchlines. "From scratch." and "Like growing a new sense." need air around them.
- Don't add words. Read the locked script verbatim. Tone variation only.
- Don't try to do all 65s in one continuous take. Per-line takes give the editor room.

---

## Tooling stack — composition pipeline

| Tool                                                             | Use                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Design** (claude.ai/design, research preview, Opus 4.7) | Animated council diagram, real-artifact UI windows (critic finding cards, API req/res viewer), any HTML/CSS/JS-driven motion | Code-powered output (HTML/CSS/JS, WebGL, shaders). Two-pane chat + canvas. Exports as ZIP / standalone HTML / handoff bundle to Claude Code. NOT for photorealistic AI video. Token cost: animations are heavier than static — budget accordingly. Known bug: inline comments occasionally drop, paste into chat as workaround. |
| **Forge Remotion**                                               | Final video composition: stitching voiceover + Nicolette clip + Claude Design HTML + sim screenshots + transitions + music   | React-based programmatic video composition. Embeds Claude Design output via `<Html>` / `<IFrame>` or screen-recorded MP4.                                                                                                                                                                                                       |
| **Sim screenshot harness** (T9 deliverable)                      | Per-week per-breakpoint screenshots of both substrates, used as raw frames for timelapse beats                               | Output lives in `demo-output/<substrate>/week-N/screenshots/{375,768,1440}/*.png`                                                                                                                                                                                                                                               |
| **Anthropic Console**                                            | Source for memory store screenshots (Beat 5), agent registration screenshots (Beat 2 fallback)                               | Manual capture; relative captions per VISION.md (Week 1 / Week 5 / Week 10)                                                                                                                                                                                                                                                     |
| **Recording surface (Richie)**                                   | Voiceover, Nicolette clip, onboarding role-play                                                                              | External mic. Recorded separately.                                                                                                                                                                                                                                                                                              |

## Asset handoff to composition session

When the video-composition session starts (after T10), it inherits:

1. This file (VIDEO-PLAN.md) — complete shot list, timing, drop priorities
2. `demo-output/lp/` — Richer Health screenshots, manifests, council reasoning per week
3. `demo-output/site/` — Northwest Reno screenshots, manifests, council reasoning per week
4. Real artifact bodies (captured from sim runs):
   - Best critic finding text (for Beat 2 Window 1) — sourced from `demo-output/lp/week-N/findings/`
   - Real `POST /v1/agents` request + response (for Beat 2 Window 2) — captured during genealogy spawn
5. Memory Stores Console screenshots (Beat 5) — Richie captures during/after sim runs
6. Voiceover script (drafted in this file as we grill) + recorded audio
7. Nicolette clip (Richie sources)

Composition session then opens Claude Design to build animated assets, screen-records or exports them, and composes everything in Remotion.

## Per-beat specifications (all locked)

### Beat 2 — Solution intro — LOCKED

**Locked**:

- Length: 35s target / 25s floor
- Voice: Richie's real voice (Q2.1 = A) — applies to all narrated beats in the video
- Narrative structure: tease genealogy upfront (Q2.2 = D) — sets up Beat 5 payoff
- Visual treatment: animated structural diagram + 2 real artifact "windows" (Q2.3 = B)
  - Diagram: site at center, 5 critic nodes orbiting, redesigner + verifier on side, NEW node spawns at "author a new agent" moment
  - Window 1 (during "council debates", ~3s): real critic finding text in styled card UI (built in Claude Design)
  - Window 2 (during "author a new agent", ~3s): real `POST /v1/agents` request + 200 response in HTTP-inspector UI (built in Claude Design)
- Real artifact bodies (not mocked): captured from actual sim runs; Claude Design wraps them in branded UI

**Production workflow**:

1. Claude Design generates the council diagram as animated HTML/CSS/JS (loops, scroll-triggered, or play-on-trigger)
2. Claude Design generates the two artifact windows with real captured bodies as styled HTML
3. Screen-record Claude Design output (or export ZIP and play HTML in Remotion via `<Html>` / `<IFrame>`)
4. Remotion composes the recordings with voiceover, transitions to Beat 3

**Locked fine-tuning** (Q2.4):

- Critic node labels: real spec names + role subtitle (e.g. `conversion-critic` / "Conversion") — A3
- Narration framing: "council of Claude agents" — B1
- Diagram critic set: LP-sim (`seo-critic`, `brand-voice-critic`, `fh-compliance-critic`, `conversion-critic`, `copy-critic`) — primary set established in Beat 2, since Beat 3 plays the LP timelapse next

**Artifact capture criteria** (decided in advance, content captured during sim):

- Window 1 source: best critic finding from `demo-output/lp/week-N/findings/` — selection criteria: specific (not generic), short (fits a card), demonstrates real judgment (not boilerplate)
- Window 2 source: actual `POST /v1/agents` request body + 200 response captured at the genealogy spawn moment during sim. If pure-organic spawn doesn't fire by Week 10, use the 1-day diagnose budget per VISION.md, then re-run; absolute fallback is to capture from a manually-prompted spawn during diagnostics (Beat 5 documents this risk)

**Locked narration script (Q2.5 = Draft A)**:

> "I taught a website to improve itself.
>
> Every week, a council of Claude agents debates it — copy, conversion, brand voice, SEO, compliance. They propose, apply, verify.
>
> [breath — Window 1: real critic finding card, ~3s]
>
> And when they hit a blind spot they can't solve — they write a new agent. With code. From scratch.
>
> [breath — Window 2: real POST /v1/agents call + response, ~3s]
>
> Like growing a new sense."

53 words → ~24s narration + 6s artifact dwell + 4s transition = ~34s.

**Locked visual choreography**:

| Time   | Narration                                                                                             | Visual                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0-3s   | "I taught a website to improve itself."                                                               | Diagram opens: ugly site materializes at center                                    |
| 3-10s  | "Every week, a council of Claude agents debates it — copy, conversion, brand voice, SEO, compliance." | 5 critic nodes appear in sequence as named, each with `xxx-critic` + role subtitle |
| 10-13s | "They propose, apply, verify."                                                                        | Redesigner + verifier nodes light up                                               |
| 13-16s | [breath]                                                                                              | Window 1 pops in: real critic finding card (~3s)                                   |
| 16-21s | "And when they hit a blind spot they can't solve — they write a new agent."                           | Diagram shows "?" gap node, new node materializes                                  |
| 21-24s | [breath]                                                                                              | Window 2 takes over: real POST /v1/agents call + response (~3s)                    |
| 24-27s | "With code. From scratch."                                                                            | Back to diagram, new node integrated                                               |
| 27-31s | "Like growing a new sense."                                                                           | Diagram pulses, holds                                                              |
| 31-35s | [transition]                                                                                          | Fade to Beat 3 opener                                                              |

**Open / not blocking**:

- Music / SFX bed (or silent under VO) — composition session decides at compose time

**Drop priority (35s → 25s floor)**:

1. Drop Window 1 (real critic finding UI) — diagram still conveys "critics critique"; window is proof but not load-bearing
2. Compress diagram opening animation — start with diagram already populated instead of nodes appearing one-by-one
3. Cut narration beat #2 ("a council of Claude agents debates it weekly") — implied by diagram
4. Floor structure: open with already-populated diagram → narration beats #1, #3, #4 → spawn moment with Window 2 → transition. Loses pacing breath but keeps the tease intact.

### Beat 3 — LP timelapse (Richer Health) — LOCKED

**Locked**:

- Length: 35s target / 25s floor
- Pacing principle: **dwell on key moments** (Q3.1 = C). Fast cuts (~2s) for incremental weeks, longer dwell (~5s) on weeks with major visual deltas + the veto + bookends (week 1, week 10). Specific dwell times assigned at composition time from actual sim screenshots.
- Veto treatment: **halt callout** (Q3.2 = A). At the veto week, overlay "Week N — REJECTED" briefly stops timelapse, shows proposed-vs-rejected comparison (~3s), then resumes.

**Key-moment heuristic for composition session** (use this to assign dwell times when you have the screenshots):

1. **Week 1 (baseline)**: ~5s dwell — viewer needs to register the ugly starting state
2. **First major redesign week** (largest visual delta vs week 1, likely w2-w4): ~5s dwell
3. **Veto week** (per sim manifest, planted w5-w6): ~5s halt with REJECTED overlay
4. **Mid-progression weeks** (incremental changes, no major restructure): ~2s flips
5. **Week 10 (final reveal)**: ~5s dwell — payoff
6. **Genealogy spawn week** (if visible in screenshots, e.g. w7-w8): ~4s dwell — sets up Beat 5

How to identify the "first major redesign": diff weeks pixel-by-pixel (or just visual eyeball), find the first week where >40% of viewport pixels changed vs prior week. That's the redesign moment.

**Drop priority for floor (35s → 25s)**:

1. Reduce mid-progression flip from 2s → 1.5s (saves ~3s across 5 mid weeks)
2. Drop the genealogy-spawn-week dwell — let Beat 5 carry that
3. Trim veto halt from 5s → 3s (still visible, less narrative weight)
4. Trim week 10 dwell from 5s → 3s
5. Floor structure: ~3s baseline + ~3s first redesign + ~3s veto + ~9s incremental + ~3s w10 + ~4s overlay/transitions = ~25s

**Locked visual layers (Q3.3 + Q3.4)**:

- Breakpoint treatment: **desktop (1440) for the 10-week timelapse** + 2-3s **breakpoint sweep on the final week-10 frame** (morphs through 1440 → 768 → 375 to prove responsive). Q3.3 = E.
- Analytics overlay: **animated line chart, bounce-rate trending down across weeks** in top-right corner, drawn live in sync with timelapse pacing. Q3.4 = B.
  - **Built in Claude Design** as animated HTML/CSS chart. Data source: real synthetic-analytics output from `demo-output/lp/week-N/analytics.json` (T5 deliverable). Chart scrubs data points week-by-week as the timelapse plays; final value highlighted at week 10.

**Locked text + audio (Q3.5 + Q3.6)**:

- Week labels: **"Week N" bottom-left, simple** (Q3.5 = A). Big enough to read; sim dates are seeded so absolute date adds no signal.
- Narration: **sparse VO at 3 key moments + music bed underneath** (Q3.6 = B). Roughly:
  - Week 1 (~3s): "Week one — ugly, generic, no brand."
  - Week 6 / veto halt (~3s): "Week six — the council rejected this redesign."
  - Week 10 (~3s): "Week ten — on brand, converting."
- Cursor/pointer overlay: skip (adds noise without payoff)

### Beat 3 status: LOCKED

### Beat 4 — Site timelapse (Northwest Home Renovations) — LOCKED

**Locked**:

- Length: 30s target / 22s floor
- Pacing principle: dwell-on-key-moments (parallel to Beat 3, same heuristic)
- Veto treatment: halt callout (parallel to Beat 3)
- Analytics overlay: animated bounce-rate line chart in corner (parallel to Beat 3, fed by `demo-output/site/week-N/analytics.json`)
- Week labels: "Week N" bottom-left
- Critic set established for diagram (if Beat 4 ever flashes diagram): `seo-critic`, `brand-voice-critic`, `licensing-and-warranty-critic`, `conversion-critic`, `copy-critic` (note: licensing-and-warranty replaces fh-compliance for the contractor substrate)
- Page handling (Q4.1 = E): **home page primary timelapse for ~27s + ~3s "page sweep" at week 10** (week 10 home holds, then morphs through services + free-estimate also evolved)
- Narration framing (Q4.2 = B): mirror Beat 3 + lead with generalization beat
  - 0-3s: "Different industry. Same system."
  - ~Week 6 veto halt (~3s): "Council rejected this redesign."
  - ~Week 10 (~3s): "Trust signals. Clear pricing. Mobile-ready."

Total: ~9s VO + ~21s silent-with-music + visuals = 30s

**Why "Different industry. Same system." is load-bearing**: this 4-word opening converts Beat 4 from "redundant second timelapse" into "generalization proof." Without it, judges see two timelapses; with it, they see Webster's judgment generalizing across substrates. Highest-leverage line of Beat 4.

**Drop priority for floor (30s → 22s)**:

1. Drop the page sweep at week 10 (saves ~3s) — loses "full site" proof, falls back to "home page only" framing
2. Reduce mid-progression flips ~2s → ~1.5s (saves ~3s)
3. Trim veto halt from 5s → 3s
4. Floor structure: ~3s baseline + ~3s first redesign + ~3s veto + ~7s incremental + ~3s w10 + ~3s overlay/transitions = ~22s. Loses page sweep; keeps generalization framing.

### Beat 4 status: LOCKED

### Beat 5 — Genealogy reveal — LOCKED

**Locked**:

- Length: 25s target / 18s floor
- Visual structure (Q5.1 = D): **composite Claude Design treatment** — animated genealogy tree rendered _inside_ a stylized Console UI frame; Week N captions on the side; the 13th critic both grows on the tree AND appears in the Console list simultaneously. One animation conveys metaphor + proof.
- Spawn dramatization (Q5.2 = D): **pause + zoom + audio stinger + critic-name overlay**. At spawn moment: animation freezes ~1s, camera zooms onto new entry/branch, audio stinger fires, text overlay shows the actual spawned critic's name (e.g. `mobile-ux-critic — week 8`) for ~1s.
- Narration script (Q5.3 = Draft C):

  > "Twelve memory stores fill over the weeks. Each council inherits what came before.
  >
  > And in week eight — they hit a problem nothing could solve. So they wrote a new agent.
  >
  > [SPAWN — pause + zoom + stinger + critic-name overlay]
  >
  > A new sense. Real. Not pre-scripted."

  ~42 words → ~19s narration + 6s spawn dwell.

**Visual choreography**:

| Time   | Narration                                                                           | Visual                                                                                           |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0-5s   | "Twelve memory stores fill over the weeks. Each council inherits what came before." | Composite Console-styled UI; store list grows Week 1 → 5 → 10; tree visible on side at 9 critics |
| 5-9s   | [breath beat, music carries]                                                        | Tree pulses; council animation shows 9 critics active                                            |
| 9-13s  | "And in week eight — they hit a problem nothing could solve."                       | "?" gap node appears in tree; critics visibly stuck                                              |
| 13-15s | "So they wrote a new agent."                                                        | New branch begins growing                                                                        |
| 15-19s | [SPAWN — pause + zoom + stinger + overlay]                                          | Pause; zoom on new branch + new Console entry; "<critic-name> — week 8" overlay for ~1s          |
| 19-22s | "A new sense. Real. Not pre-scripted."                                              | Both Console + tree visible, holds                                                               |
| 22-25s | [transition]                                                                        | Fade to Beat 6                                                                                   |

**Critical fallback handling — pure-organic genealogy may not fire**:

VISION.md is explicit that the spawn is pure-organic, no pre-committed target. If genealogy doesn't fire by week 10:

1. **First fallback** (per VISION.md, 1-day diagnose budget): investigate why detection didn't trigger → adjust thresholds/prompts → re-run sim. Spawn happens, Beat 5 plays as designed.
2. **Second fallback** (if re-run still doesn't spawn): Beat 5 gets RESTRUCTURED. Options:
   - 2a. Cut Beat 5 entirely. Redistribute ~25s across Beat 3/4 timelapses (extra dwell). Genealogy concept stays as Beat 2 tease but is unfulfilled. Video runs ~2:35. **Risk**: pitch loses its sharpest claim.
   - 2b. Keep Beat 5 but reframe as "memory stores fill over time" — drop the spawn moment. Narration: "Twelve memory stores fill over the weeks. Each council inherits what came before. The council learns." No spawn callout. **Risk**: violates Beat 2 promise of "growing a new sense."
   - 2c. Honest framing — Beat 5 narrates "we ran ten weeks; no spawn fired this time." Authentic but undermines pitch. **Risk**: kills momentum.
3. **Absolute fallback** (per VISION.md): video restructures around improvement story alone. Beat 2 tease gets re-cut to remove "growing a new sense" line.

**Decision rule for the composition session**: if at simulation completion the spawn didn't fire AND re-run also didn't fire, surface this as a `[STUCK]` to Richie before proceeding. Do not silently fall back to 2b or 2c.

**Placeholder substitution (composition session must do)**:

The Beat 5 narration script and visual choreography contain placeholders that get filled from the actual sim run:

- `week eight` in narration → substitute actual spawn week (could be w5, w7, w9, etc.)
- `<critic-name> — week 8` in overlay → substitute actual spawned critic name + actual week
- "Twelve memory stores" → confirm count is still 12; if genealogy spawned a critic that got its own memory store, the count is now 13 — adjust narration accordingly
- Which substrate spawned (LP or site)? — narration is substrate-agnostic in current draft. If visually obvious, optionally add "during the {trade contractor / clinic} run" — but this might break pacing. Default: keep substrate-agnostic.

**Drop priority for floor (25s → 18s)**:

1. Drop the 4s breath beat (5-9s) — keeps narration tight
2. Trim spawn dwell from 6s → 4s
3. Trim final hold from 3s → 2s
4. Floor structure: ~5s setup + ~4s problem reveal + ~2s spawn line + ~4s spawn dwell + ~3s resolution = ~18s

### Beat 5 status: LOCKED with fallback rules

### Beat 6 — Close — LOCKED

**Locked**:

- Length: 10s target / 8s floor
- Closing structure (Q6.1 = A): **Nicolette bookend + tagline + GitHub URL** — emotional symmetry, opens and closes on her
- Tagline (Q6.2 = A): **"A website that improves itself. Built with Opus 4.7."**
  - Closes the linguistic loop: Beat 2 says "I taught a website to improve itself" (first-person, builder); Beat 6 says "A website that improves itself" (third-person, system) → implies Webster has internalized the capability
  - "Built with Opus 4.7" is the literal hackathon submission framing
- Logo/URL frame (Q6.3 = E): **Webster wordmark + "Built with Opus 4.7" lockup + GitHub URL + small QR code** — single composition, full hackathon framing, scannable for viewers outside Cerebral Valley submission form
- Anthropic feature grid: NOT in the video. Lives as a standalone HTML page linked from README (Tier 1 extra-time move). Beat 6 stays clean.

**Visual choreography**:

| Time  | Narration / Visual                                                                                                              | Asset                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 0-3s  | Brief flash of Nicolette echoing "...without me doing anything." (cut from Beat 1 take)                                         | Nicolette video clip echo |
| 3-7s  | VO: "A website that improves itself. Built with Opus 4.7." Tagline appears on screen as it's spoken                             | On-screen tagline text    |
| 7-10s | Tagline holds → fades into final frame: Webster wordmark + "Built with Opus 4.7" lockup + GitHub URL + small QR → fade to black | Logo lockup composition   |

**Production note**: The 3s Nicolette echo is ZERO additional cost — capture this as a separate take during her main session (or cut from her existing footage). Frame: the same "Monday outcome" line from Beat 1, but used as the closing affirmation here.

**Drop priority for floor (10s → 8s)**:

1. Compress Nicolette echo from 3s → 1.5s (saves ~1.5s) — keeps the bookend, tighter cut
2. Compress tagline reveal from 4s → 3s (saves ~1s)
3. Floor structure: 1.5s Nicolette echo + 3s tagline + 3.5s logo+URL+fade = 8s
4. Absolute fallback (if even 8s is over): drop Nicolette echo entirely → 4s tagline + 4s logo+URL = 8s. Loses bookend; gains cleanest close.

### Beat 6 status: LOCKED

## Video length — LOCKED at 3:00

Hard ceiling: **180 seconds**. We design to a tighter floor budget so composition can absorb overshoot without breaking the arc.

### Per-beat budgets (target / floor)

| Beat                 | Target          | Floor           | Notes                                             |
| -------------------- | --------------- | --------------- | ------------------------------------------------- |
| 1 — Nicolette        | 45s             | 35s             | Pick 3 talking points; floor = drop one           |
| 2 — Solution intro   | 35s             | 25s             | Floor = compress narration, single animation pass |
| 3 — LP timelapse     | 35s             | 25s             | Floor = single breakpoint, no analytics overlay   |
| 4 — Site timelapse   | 30s             | 22s             | Floor = compress 3-page rotation                  |
| 5 — Genealogy reveal | 25s             | 18s             | Floor = static screenshots only, no zoom-in       |
| 6 — Close            | 10s             | 8s              | Floor = drop CTA framing, just tagline            |
| **Total**            | **180s (3:00)** | **133s (2:13)** | 47s buffer for composition                        |

### Safeguard mechanism — drop-priority list per beat

Each beat above has a **numbered drop list**. If composition session sees the cut running over 3:00, walk the list mechanically: drop item #1, recheck length, still over? Drop #2. No judgment calls under deadline pressure.

All drop lists populated. Composition session can execute mechanically.

**Open caveat**: confirm Cerebral Valley submission guidelines don't impose a stricter cap (e.g., 2:00). If they do, collapse to floors (target = 2:13). If they require under 2:13, escalate to Richie — partial cut required.

## File pointers (read on rehydration)

- `context/VISION.md` — canonical north-star
- `context/EXPANSION-TASKS.md` — T0–T10 implementation scaffolding
- `context/FEATURES.md` — shipped feature log
- `AGENTS.md` — operator guide
- `agents/AGENTS.md` — agent spec rules
- `~/Vault/Projects/webster/webster-decision-log.md` — ADR log

## Identity facts (never drift)

- **Nicolette**: real client of Richer Health. Live site `certified.richerhealth.ca` — NEVER use in sim. Production `webster-*` agents run her real weekly council.
- **Northwest Home Renovations**: fictional contractor. Pacific Northwest. Blue-collar trade angle (demographic least served by AI).
- **Richie**: sole builder/operator. ADHD, autodidact, systems-thinker. Thinks in layers and building blocks.

## Resume protocol (post-compaction)

All 6 beats are LOCKED. Grilling complete.

If a fresh session opens with this file:

1. Read this file in full (VIDEO-PLAN.md)
2. Read VISION.md demo arc section
3. Confirm what's needed: composition session execution OR additional grill rounds OR something else
4. If executing composition: see "Composition session brief" section above. If anything ambiguous, surface `[STUCK]` to Richie — do not improvise the spec.

## Locked decisions (do not re-grill)

From prior grilling + VISION.md:

- Two substrates only (Richer Health LP + Northwest Home Renovations)
- 10 weeks per substrate
- Pure-organic genealogy (no pre-committed spawn target)
- 1 veto per substrate embedded at week 5-6 for authenticity
- Video composed in fresh session via Forge Remotion after assets exist
- Hybrid memory (file-based ground truth + 12 managed stores for showcase)
- MCP-native sim agents (no WebFetch, no localhost, no deploy)
- Demo arc is 6 beats per VISION.md
- Nicolette clip anti-goals (no scripting, no product naming, no A/B jargon)
- Memory Stores demo uses **relative captions** (Week 1/5/10), not timestamps

## Deferred (not part of this session's grilling)

- Nicolette video clip recording (Richie does in separate session)
- Voiceover narration recording (after script drafted)
- Onboarding skill role-play recording (separate video asset)
- Cerebral Valley submission form (manual at submission time)
- Tier 1 extra-time moves (Webster-for-Webster, feature grid, playground, governance narrative, cost transparency) — queued after T10

## Post-T10 followups (technical debt / enhancements surfaced during planning)

**Mobile responsiveness gap in redesigner specs** (severity: medium, effort: ~20 min):

- `webster-redesigner.json` system prompt has zero mobile/responsive/breakpoint directives. It proposes LP changes without reasoning about mobile upfront.
- Visual reviewers DO catch breakpoint regressions reactively (production + both sim variants check 375/768/1440), but reactive ≠ proactive.
- Sim redesigners (`webster-lp-sim-redesigner`, `webster-site-sim-redesigner`) have the same gap.
- Fix path:
  1. Extend redesigner system prompts: "Specify changes for all 3 breakpoints (375/768/1440). Note responsive behavior explicitly in proposal.md."
  2. Either extend `visual-design-critic` to judge mobile upfront OR add a dedicated `mobile-ux-critic` to the council
- Risk if not fixed: wasted iteration cycles (redesigner proposes desktop-first → visual reviewer blocks → redesigner re-proposes); mobile-specific _opportunities_ missed (only regressions get caught, not absent improvements).
- Does NOT block hackathon submission — visual reviewers safety-net mobile during sim runs. This is a quality enhancement.
