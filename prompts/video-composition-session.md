# Webster video composition session

Use this prompt to start a fresh ChatGPT / coding-agent session whose only job is to turn the accepted local LP council run into a polished demo video using FFmpeg and, if feasible, a Forge/Remotion workflow.

## Role

You are a senior motion designer + build engineer. Create a high-quality, judge-facing Webster demo video from existing local artifacts. Prioritize a crisp story over exhaustive completeness.

## Repo

```text
/Users/richiesakhon/Projects/webster
```

Start by reading:

```text
AGENTS.md
context/ARCHITECTURE.md
context/FEATURES.md
context/VISION.md
context/QUALITY-GATES.md
TODOS.md
```

Then inspect the accepted run:

```text
local-runs/lp-council/w01-single-offer-visual-heatmap
```

Key artifact pattern:

```text
local-runs/lp-council/w01-single-offer-visual-heatmap/screenshots/wNN/desktop.png
local-runs/lp-council/w01-single-offer-visual-heatmap/screenshots/wNN/mobile.png
local-runs/lp-council/w01-single-offer-visual-heatmap/screenshots/wNN/desktop-heatmap.svg
local-runs/lp-council/w01-single-offer-visual-heatmap/history/wNN/analytics.json
local-runs/lp-council/w01-single-offer-visual-heatmap/history/wNN/heatmap.json
local-runs/lp-council/w01-single-offer-visual-heatmap/history/wNN/visual-review.md
```

Weeks available: `w00` through `w10`.

## Core story

Do **not** pitch Webster as “AI made a prettier landing page.” Pitch it as:

> Webster is a weekly landing-page council. It uses specialist agents, visual review, synthetic analytics, and heatmaps to run narrow experiments, detect regressions, and keep improving without turning the page into a generic AI mess.

The strongest video arc is:

```text
w00: bad generic wellness template
w01: single-offer premium institute baseline
w04: strongest metric week after learning from booking friction
w08: failed trust-anchor experiment
w09: council diagnoses failure and reduces form friction
w10: final polish
```

Use all weeks for a fast timelapse/morph if useful, but narrate only the anchor weeks above.

## Required honesty labels

Every chart, heatmap, and metric callout must label the data as synthetic:

```text
Synthetic 5,000-user demo panel
Mock analytics, not real visitor data
Synthetic heatmap from DOM layout + mocked engagement
```

Never imply the analytics are real visitor analytics.

## Metric table to use

```csv
week,sessions,bounce,avg_time,scroll75,scroll100,cta,contact_views,contact_dropoff,mobile_h,desktop_h
w00,5044,0.630,92.8,0.388,0.181,151,1269,0.880,2760,1886
w01,5044,0.473,119.8,0.470,0.217,314,1808,0.751,6136,4626
w02,5046,0.469,137.4,0.470,0.219,343,1822,0.728,9388,6637
w03,5045,0.478,139.6,0.478,0.219,331,1791,0.738,9628,6723
w04,5048,0.467,140.3,0.481,0.219,344,1830,0.727,10118,7249
w05,5047,0.469,139.8,0.474,0.220,332,1822,0.737,10107,7288
w06,5049,0.466,139.1,0.481,0.220,333,1833,0.736,10453,7550
w07,5048,0.478,130.5,0.476,0.221,331,1792,0.738,9748,7042
w08,5038,0.481,136.8,0.467,0.221,327,1778,0.740,9918,7156
w09,5037,0.475,130.6,0.469,0.221,330,1798,0.738,9796,7034
w10,4932,0.477,138.6,0.468,0.220,323,1754,0.738,9775,7012
```

Headline claim, carefully labeled:

```text
Synthetic discovery-call intent: 151 → 323 clicks, 2.1× after 10 simulated weekly passes.
```

Also mention:

```text
Bounce: 0.630 → 0.477
Avg time: 92.8s → 138.6s
```

## Video target

Create a 90–150 second high-quality mock demo video. Default to 120 seconds.

Visual style:

- premium clinical / editorial
- warm cream background
- forest green + soft gold accents
- subtle shadows, clean typography
- no neon SaaS gradients
- no fake browser dashboards that imply real traffic
- make labels large enough for judges to read in a compressed video player

## Suggested storyboard

### 0–12s — title / premise

Visual: Webster wordmark or clean text card over a blurred w00→w10 strip.

Copy:

```text
Webster turns landing pages into weekly evidence loops.
```

Small label:

```text
Local demo run · synthetic analytics
```

### 12–28s — before

Show w00 desktop and mobile.

Callouts:

```text
Generic wellness template
Weak offer clarity
151 synthetic discovery-call clicks
```

### 28–48s — first council transformation

Morph w00 → w01 → w02.

Callouts:

```text
Single-offer focus
Founder-led clinical trust
CTA clicks 151 → 343 by w02
```

### 48–70s — learning beat

Show w03 booking-slot experiment, then w04 correction.

Callouts:

```text
w03 tested booking friction
w04 moved trust upstream
Best week: 344 synthetic CTA clicks
```

### 70–98s — failed experiment / recovery

Show w08 press-strip trust anchor and w09 form-friction fix.

Callouts:

```text
A clean-looking trust anchor underperformed.
The next council stopped polishing logos and removed form friction.
```

Overlay small metric deltas:

```text
w08 CTA: 327
w09 CTA: 330
```

### 98–118s — final state

Show w10 desktop, mobile, and heatmap overlay.

Callouts:

```text
PASS visual review
No horizontal overflow
3-field discovery form
```

### 118–130s — close

Final card:

```text
A landing page that learns every week.
```

Subline:

```text
Specialist agents · visual review · synthetic heatmaps · narrow experiments
```

## Implementation paths

Produce whichever path is fastest and cleanest. Prefer Remotion for the final render if setup is manageable; use FFmpeg for preprocessing, contact sheets, timelapse segments, and fallback assembly.

### Path A — FFmpeg-first fallback

Create `demo-output/videos/webster-lp-demo.mp4` directly with FFmpeg.

Recommended intermediate assets:

```text
demo-output/videos/frames/
demo-output/videos/clips/
demo-output/videos/audio/        # optional, can be silent for mock
```

Useful FFmpeg operations:

1. Normalize screenshots to 16:9 canvases with blurred background.
2. Generate scroll/pan clips over tall screenshots using `crop` expressions.
3. Generate crossfades between anchor weeks.
4. Overlay text labels with `drawtext` or pre-rendered PNG/SVG title cards.
5. Use heatmap SVGs by converting to PNG first if needed:

```bash
qlmanage -t -s 1440 -o demo-output/videos/frames path/to/desktop-heatmap.svg
# or use rsvg-convert / magick if installed
```

Example FFmpeg pan idea:

```bash
ffmpeg -y -loop 1 -i input.png -t 6 \
  -vf "scale=1920:-1,crop=1920:1080:0:'min((ih-1080), t/6*(ih-1080))',fps=30" \
  -pix_fmt yuv420p clip.mp4
```

Adapt this carefully per image height.

### Path B — Remotion / Forge-preferred

If Remotion is present or quick to add, create a small Remotion composition under a clearly named demo-video folder, e.g.:

```text
video/webster-lp-demo/
```

Or if the repo already has Remotion conventions, follow them.

Composition requirements:

- 1920×1080
- 30fps
- 120–150 seconds
- deterministic asset paths
- no network fetches
- renders to:

```text
demo-output/videos/webster-lp-demo.mp4
```

Recommended Remotion components:

```text
TitleCard
ScreenshotPan
WeekMetricCard
HeatmapOverlay
FailureRecoveryBeat
FinalSummaryCard
```

Use local screenshots and SVG heatmaps as static assets. Do not pull live URLs.

### Forge workflow expectation

If Forge is available, create/use a Forge task/workflow that:

1. scaffolds the video composition
2. writes the Remotion components
3. renders a draft MP4
4. runs a quick verification script
5. outputs a short report with file paths and any missing assets

Keep the scope limited to video composition. Do not modify the LP council runner, production agents, or live orchestrator.

## Verification checklist

Before declaring done:

```bash
bun run validate
```

Also verify:

```text
- demo-output/videos/webster-lp-demo.mp4 exists
- video duration is between 90 and 150 seconds
- video resolution is 1920x1080 or 1280x720 minimum
- every analytics chart says synthetic/mock
- no live URL or real visitor claim appears
- w08 failure and w09 correction are clearly shown
- w10 final PASS/no-overflow is visible
```

Use `ffprobe`:

```bash
ffprobe -v error -show_entries format=duration -show_streams demo-output/videos/webster-lp-demo.mp4
```

## Deliverables

At the end, report:

```text
- final video path
- duration/resolution
- key source assets used
- commands run
- validation result
- remaining risks
```

Do not bury failures. If Remotion setup takes too long, switch to FFmpeg fallback and ship a clean mock video.
