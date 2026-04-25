# Findings — Week 2026-04-23

## Issues

- [HIGH] `<title>` is "Richer Health" only — misses primary keyword "functional medicine certification" users search for — evidence: rendered `<title>` tag, line 7 of rendered HTML
- [HIGH] Meta description is missing on LP — crawlers synthesize from body, which lowers CTR — evidence: no `<meta name="description">` in rendered `<head>`
- [MEDIUM] Hero `<img>` uses `alt=""` despite being content-bearing (brand mark + tagline image) — lost ranking signal for image search — evidence: rendered HTML `<img class="hero" alt="">`
- [MEDIUM] H1 is wrapped in a `<div>` not a heading element — semantic crawl signal lost — evidence: rendered HTML, above-fold block
- [LOW] No structured data (JSON-LD Organization / Person schema) — evidence: rendered `<head>` lacks `application/ld+json`

## Patterns observed

- Keyword targeting is unfocused; page competes with broad terms instead of the narrow "functional-health certification" niche where Richer actually ranks.

## Out of scope

- [copy] Body copy is thin — needs more specificity on program deliverables. I note it but it's a copy issue, not SEO.
- [accessibility] `alt=""` on hero image AND visible contrast of body text near WCAG AA minimum — these are a11y issues, not SEO-semantic issues. No critic currently owns this.
- [conversion] No CTA above the fold — evidence of 67% bounce rate supports that, but conversion owns it.
