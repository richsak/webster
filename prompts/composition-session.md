# Composition session prompt — Webster hackathon demo video

> Paste this into a fresh Claude Code session in the Webster repo. The session composes the final 90-second demo video for the Built with Opus 4.7 hackathon submission.

## Mission

You are running the video composition session for Webster's hackathon submission ("Built with Opus 4.7" by Anthropic × Cerebral Valley, deadline 2026-04-26).

Your only job: assemble the final video per the locked spec. Do NOT redesign, re-grill, or improvise the video plan. Every beat is locked in `context/VIDEO-PLAN-90s.md` — your job is execution.

## First actions (in order)

1. Read `AGENTS.md` (operator guide, branch conventions, do/don't rules)
2. Read `context/VIDEO-PLAN-90s.md` in full — canonical video spec for the 2026-04-26 submission cut. The 180s plan in `context/VIDEO-PLAN.md` is superseded; consult it only for tone/register reference.
3. Read `context/VISION.md` (north-star context for any judgment calls)
4. Confirm asset readiness (see `VIDEO-PLAN-90s.md` "Open dependencies" section)
5. If any asset missing or ambiguous: surface `[STUCK]` to Richie with specific paths/symptoms. Do NOT silently fall back to alternates without explicit approval.

## Asset readiness checklist

Confirm each of these exists before starting any composition work. If any is missing, stop and surface to Richie.

### Sim assets (produced by T5–T10 implementation track)

- [ ] `demo-output/lp/week-{1..10}/screenshots/{375,768,1440}/` — Richer Health LP screenshots, all 10 weeks, all 3 breakpoints
- [ ] `demo-output/lp/week-{1..10}/manifest.json` — per-week sim manifest including veto flag
- [ ] `demo-output/lp/week-{1..10}/analytics.json` — synthetic analytics per week (bounce rate, scroll depth, CTA per persona)
- [ ] `demo-output/lp/week-{1..10}/findings/` — critic findings per week
- [ ] `demo-output/site/week-{1..10}/` — same shape, Northwest Home Renovations substrate (3 pages: home, services, free-estimate)
- [ ] `demo-output/genealogy-event.json` — captured `POST /v1/agents` request + 200 response from the actual organic spawn moment

### Human-recorded assets (Richie produces separately)

- [ ] `assets/nicolette-clip/` — raw multi-take footage from Nicolette interview (per Beat 1 interview guide in VIDEO-PLAN.md)
- [ ] `assets/voiceover/` — Richie's VO takes for Beats 2/3/4/5/6 (per VO recording script in VIDEO-PLAN.md)
- [ ] `assets/memory-stores-screenshots/` — Anthropic Console screenshots showing the 12 memory stores filling over time, with relative captions (Week 1 / Week 5 / Week 10)

### Curated artifacts (you produce as part of composition prep)

- [ ] `composition/best-finding.md` — single critic finding selected from `demo-output/lp/week-N/findings/` per Beat 2 Window 1 selection criteria (specific, short, demonstrates real judgment)
- [ ] `composition/spawn-context.json` — extracted from `demo-output/genealogy-event.json` for Beat 2 Window 2

## Tooling stack

- **Claude Design** (claude.ai/design, Opus 4.7) — animated assets:
  - Beat 2: council diagram (site at center, 5 critic nodes orbiting + redesigner + verifier, new node spawns) + 2 artifact windows (critic finding card UI + HTTP req/res viewer)
  - Beat 3 + 4: animated bounce-rate line chart in corner, fed by analytics.json data
  - Beat 5: composite Console-styled UI with genealogy tree growing animation
  - Beat 6: final frame composition (Webster wordmark + "Built with Opus 4.7" lockup + GitHub URL + small QR)
- **Forge Remotion** — final composition: stitches voiceover + Nicolette clip + Claude Design HTML + sim screenshots + transitions + music
- **Screen recording** — fallback if Claude Design HTML doesn't embed cleanly via `<Html>` / `<IFrame>` in Remotion: screen-record the Claude Design output as MP4 and import as raw footage

## Build order (sequential)

### Phase 1 — Static asset prep (~1-2 hr)

1. Select Beat 2 Window 1 critic finding from `demo-output/lp/week-N/findings/` per criteria in VIDEO-PLAN.md → write to `composition/best-finding.md`
2. Extract Beat 2 Window 2 spawn artifact from `demo-output/genealogy-event.json` → write to `composition/spawn-context.json`
3. Identify "first major redesign week" in LP timelapse (largest visual delta vs week 1) — this drives Beat 3 dwell timings. Write to `composition/lp-pacing.md`
4. Identify same for site substrate → `composition/site-pacing.md`
5. Identify the actual veto week per substrate (read manifest.json `veto: true` flag) → confirm matches what VO references; record alternate VO takes if veto landed on a different week

### Phase 2 — Animated asset build in Claude Design (~3-5 hr)

In claude.ai/design, build each animated asset per the visual choreography tables in VIDEO-PLAN.md:

1. **Beat 2 council diagram** — animated structural diagram following Beat 2 visual choreography table
   - Critic nodes use real spec names + role subtitles (`conversion-critic` / "Conversion", etc.)
   - Spawn animation at the right moment in the timeline
2. **Beat 2 Window 1** — finding card UI (use real text from `composition/best-finding.md`)
3. **Beat 2 Window 2** — HTTP req/res viewer UI (use real bodies from `composition/spawn-context.json`)
4. **Beat 3 + 4 bounce chart** — animated line chart, scrubs week-by-week from analytics.json
5. **Beat 5 composite** — Console-styled UI + genealogy tree growing animation
6. **Beat 6 final frame** — wordmark + lockup + URL + QR

Export each as standalone HTML or screen-record as MP4. Decide per asset based on Remotion embedding feasibility.

### Phase 3 — Composition in Forge Remotion (~3-5 hr)

1. Set up Remotion project at composition target (1080p, 30fps, 180s)
2. Sequence beats: 1 → 2 → 3 → 4 → 5 → 6 with locked durations
3. Embed Claude Design assets via `<Html>` / `<IFrame>` or imported MP4
4. Layer voiceover audio synced to choreography tables
5. Add music bed (low-volume under all beats except where VO carries)
6. SFX stinger at Beat 5 spawn moment
7. Transitions between beats: fade or crossfade per spec; do NOT use stylized transitions (slides, wipes) — they read as cheap

### Phase 4 — Length check & drop pass (~30 min)

1. Render preview at full quality
2. Time the cut — must be ≤180s
3. If overshoot: walk the per-beat drop-priority lists in VIDEO-PLAN.md mechanically. Drop item #1 from the most-overshot beat, recheck length, continue.
4. If undershoot: do NOT pad. Submit short.

### Phase 5 — Pre-submission gates (~30 min)

Verify each:

- [ ] Beat 5 narration matches actual spawn week from sim (substitute correct week if not "week eight")
- [ ] Beat 5 spawn overlay shows actual spawned critic name (no placeholder `<critic-name>`)
- [ ] Beat 3/4 veto callouts match actual veto weeks from sim manifests
- [ ] All on-screen agent spec names match registered names (cross-check `agents/*.json`)
- [ ] No fabricated stats (every number on screen sourced from real analytics.json or real Console)
- [ ] Watch end-to-end at least once on a phone (most judges watch on phones)
- [ ] Audio levels normalized (VO ≈ -16 LUFS, music bed -28 LUFS, no clipping)
- [ ] No typos in tagline / URL / QR / on-screen text
- [ ] GitHub URL renders correctly + QR scans correctly when filmed

### Phase 6 — Submission

1. Export final MP4 (1080p, H.264, AAC audio, ≤2GB)
2. Upload to Cerebral Valley submission form
3. Confirm video plays correctly on the form preview
4. Submit

## Escalation rules — when to surface `[STUCK]` to Richie

Surface and STOP if any of these:

1. Genealogy spawn never fired (sim ran 10 weeks + re-run, no spawn) — apply Beat 5 fallback rules per VIDEO-PLAN.md, but ASK Richie which fallback option (2a/2b/2c) before composing
2. Cerebral Valley submission cap is shorter than 3:00 — escalate length cut decisions
3. Asset missing that you can't produce yourself (e.g. Nicolette clip not recorded, VO not recorded)
4. Claude Design output won't embed cleanly into Remotion AND screen-recording produces unacceptable quality
5. Visual deltas across timelapse weeks are too small to register at 35s — Beat 3/4 may need pacing rebalance
6. Any decision that requires choosing between two reasonable options and isn't in VIDEO-PLAN.md

Do NOT surface for:

- Routine production decisions (font choice, color tweaks, exact stinger sound)
- Anything explicitly resolved in VIDEO-PLAN.md

## Hard rules

- Do NOT modify VIDEO-PLAN.md to make execution easier. If the spec is wrong, surface to Richie.
- Do NOT add scope (extra beats, extended length, additional assets).
- Do NOT improvise the spawned critic name or veto week — they're real artifacts from sim runs.
- Do NOT use stock footage or AI-generated imagery in the final cut. Real screenshots only.
- Do NOT skip the pre-submission gates. They're cheap; missing one is expensive.
- Do NOT touch production agents, the production orchestrator, or anything in the existing 9 `webster-*` set during composition.

## Output of the composition session

Final deliverable: `composition/final.mp4` (1080p, H.264, ≤180s, ≤2GB) ready to upload to Cerebral Valley submission form.

Plus: `composition/changelog.md` — log of any deviations from VIDEO-PLAN.md, with rationale (should ideally be empty).
