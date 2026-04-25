# Session 4 screenshot evidence

Hero-section screenshots at 3 breakpoints, before + after. Captured
2026-04-23 via Playwright-headless with 1.5s settle for reveal
animations.

Durable artifacts for the v2 roadmap: these are what the
**visual-reviewer agent** (feature #41, Layer 9 in
`context/FEATURES.md`) will produce automatically on every apply-worker
run. Committed as the motivating evidence for why Layer 9 exists.

## What they show

| File                         | Verdict                                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `before-mobile-hero.png`     | Baseline mobile hero — clean 6-line H1, subhead + CTA above fold.                                                     |
| `before-tablet-hero.png`     | Baseline tablet hero — 3-line H1, subhead + CTA + microcopy above fold.                                               |
| `before-desktop-hero.png`    | Baseline desktop hero — 3-line H1 with sage-accent punchline, CTA + badges + microcopy above fold.                    |
| `after-mobile-hero.png`      | Post-apply mobile — H1 wraps to 10 lines at hero scale, subhead 4 lines, CTA barely visible at bottom of viewport.     |
| `after-tablet-hero.png`      | Post-apply tablet (worst case) — 10-line H1, subhead cropped, CTA completely below fold.                              |
| `after-desktop-hero.png`     | Post-apply desktop — "N&D Team" row off-screen at top; 8-line H1 fills viewport; CTA below fold.                       |

## Re-score (pixel-based)

Initial source-only score of the apply: AFTER 62/100. Pixel-based
re-score after viewing these: **AFTER 50/100.** Hero rhythm was the
dominant regression — 27/100 on that dimension alone.

## Regenerate

Preview server must be running on :8080 (`python3 -m http.server 8080`
from repo root). Then:

```bash
bun /tmp/webster-screenshot.mjs
```

Script is ephemeral but short enough to rewrite. See session 4
advisor checkpoint for the Playwright invocation pattern.
