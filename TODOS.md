# TODOS

> Current next-action list for Webster demo capture and judge-facing polish. Operators should consult this after the standard context files.

## P0 — demo capture path

- [ ] Continue LP simulation one week at a time from accepted week 01.
  - Baselines: `demo-baselines/landing-page/week-00` and `demo-baselines/landing-page/week-01`.
  - Loop: generate one week → inspect screenshots + heatmaps interactively → Richie says keep/drop/adjust → continue.
  - Do not add heavyweight review bureaucracy; use the active GPT/session judgment unless Richie asks to persist detailed notes.
- [ ] Verify the week-by-week continuation runner that is being built separately, then document the exact command once stable.
- [ ] Preserve each kept week in `demo-baselines/landing-page/week-NN/` or an equally obvious accepted-artifact directory.
- [ ] Watch w05+ for a natural underperforming week that can become a separately labeled failure-drill artifact showing how the council diagnoses worse analytics; do not force failure into the accepted main timelapse.
- [ ] Build final LP screenshot set, final sheet, and timelapse only from kept/accepted week artifacts.
- [ ] Add a demo-safe mock booking request popup/section for LP CTAs so the clickable demo does not dead-end or hit a live scheduler.
- [ ] Draft demo video script/storyboard around the accepted LP artifacts before spending more time on the Northwest Reno site substrate.
- [ ] Assemble the first complete demo video from the LP story.
- [ ] If time remains after the LP video is strong, capture Northwest Home Renovations and edit it into the video as a second substrate proof.
- [ ] Capture Memory Store console screenshots if still feasible: week 1/5/10 for LP, and site only if site footage is included.

## P1 — demo correctness / bug fixes

- [ ] Ensure local week continuation ingests prior accepted week analytics, heatmaps, and the current interactive judgment from Richie/operator.
- [ ] Keep synthetic analytics labeled as synthetic everywhere; never imply real visitors.
- [ ] Ensure all accepted weeks pass no-horizontal-overflow gate after w00.
- [ ] Fix visual-asset-director tool-budget issue if it recurs: manifest-first triage, inspect only finalists.
- [ ] Watch for agents claiming file writes without calling Write; artifact validation must catch this.
- [ ] Decide whether to remove/demote `deep_teal` from Richer Health brand context because current local prompt treats blue/teal as brand failure.

## P1 — onboarding v2 / context capture

- [ ] Update onboarding skill v2 to capture landing-page-specific intent:
  - what the LP sells
  - primary audience
  - primary conversion
  - conversion method/mechanism: Calendly, Acuity, embedded form, phone call, email, custom CRM, or demo-safe mock request
  - what not to promote
  - whether it is a single-offer LP vs homepage/site
- [ ] Ensure onboarding writes LP context equivalent to `demo-landing-page/context/landing-page.json`.
- [ ] Keep image/source-site asset capture in onboarding/setup surfaces, not runtime council prompts.

## P2 — judge-facing repo cleanup

- [ ] Organize demo artifacts so judges see the accepted path first.
- [ ] Keep README optimized for the latest truth: accepted LP baseline now, final LP video/timelapse later.
- [ ] Add final README/video polish pass after week-10 LP assets exist.
- [ ] Clearly label local mock stitching vs production Webster contracts.
- [ ] Move or downplay stale salvage artifacts so they do not confuse the submission story.
- [ ] Gut repo noise before final submission: stale tmp paths, obsolete salvage paths in judge-facing docs, duplicate demo outputs, and confusing generated artifacts.
- [ ] After repo cleanup and final accepted artifacts, rewrite `AGENTS.md` (and add `CLAUDE.md` if not present) as a **judge-friendly post-development operator guide**. A judge should be able to clone the repo, point Claude Code / their preferred coding agent at it, and have the agent immediately know:
  - what is real vs simulated
  - where accepted demo baselines live
  - which prompts to run for production vs local capture
  - which scripts to run for validation
  - which docs to read in what order
  - what `bun run validate` proves
  - explicit “do not run these as if they were live” warnings (no real Managed Agent registration, no real API spend, no overwriting accepted baselines)
- [ ] Verify the post-development `AGENTS.md`/`CLAUDE.md` by doing a cold-start dry run with a fresh agent session before submission.
- [ ] Add concise architecture/demo diagrams if they clarify the story.
- [ ] Run full `bun run validate` after cleanup.

## P2 — final submission polish

- [ ] Prepare Cerebral Valley submission form assets.
- [ ] Prepare final README hero narrative.
- [ ] Prepare final commit/hash table for demo artifacts if time permits.
- [ ] Do one final cold read: can a judge understand Webster in under 2 minutes from README + video?
