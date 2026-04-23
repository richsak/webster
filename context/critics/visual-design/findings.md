# Findings — Week 2026-04-23

## Issues identified

- [CRITICAL] Hero background image (Pacific Northwest forest ferns, Unsplash `photo-1624616802182`) actively contradicts the clinical-team certification offer — a B2B visitor's first frame is wilderness nature photography, signalling lifestyle/wellness rather than clinical authority or team unity — rendered HTML: `![Lush dark green ferns in a Pacific Northwest forest](https://images.unsplash.com/photo-1624616802182-57737fa83971…)`

- [HIGH] Step-card icons appear as raw Material Icons ligature text strings ("analytics", "map", "groups\_3", "verified") in the DOM; if the Google Fonts icon stylesheet fails to load (network error, ad-blocker, slow 3G) all four step cards show plain words instead of icons, collapsing the visual process section — rendered HTML: `analytics STEP 01 … map STEP 02 … groups_3 STEP 03 … verified STEP 04`

- [HIGH] Trust signals (Tony Robbins quote + Forbes/Vogue marquee) are clustered entirely in the first third of the page; the step-card section, founder stat block, and bottom CTA section each carry zero visual trust reinforcement — for a high-ticket B2B offer, absence of trust signals at decision points materially weakens persuasion at the exact moments a visitor needs reassurance

- [HIGH] Stat block visual hierarchy is unverifiable from source but the rendered text shows the three key metrics ("3×", "67%", "$240K") embedded in list flow with their descriptor copy at the same visual weight — stat numerals must be typographically dominant (large, bold, contrasting colour) over descriptor text to register instantly on scroll; if current CSS does not enforce a 3–4× size ratio, this is a structural hierarchy failure — rendered HTML: `3× more patients retained … 67% of patients leave … $240K avg revenue lost`

- [HIGH] Nav CTA ("BOOK YOUR FREE CALL") visual button weight is indeterminate from rendered HTML — if it renders as a plain text link (no background fill, no contrast border) rather than a filled button on mobile, it disappears against the hero overlay and fails the above-fold CTA visibility test — rendered HTML: `[BOOK YOUR FREE CALL](#)` with no surrounding button element observed

- [MEDIUM] "RICHER RICHER RICHER RICHER RICHER RICHER RICHER RICHER" marquee/ticker placed directly above the final CTA section is pure decorative noise — it adds zero signal (no credential, no social proof, no benefit), creates visual buzz that competes with the CTA, and dilutes the brand word by repetition — rendered HTML: `RICHER RICHER RICHER RICHER RICHER RICHER RICHER RICHER`

- [MEDIUM] Media-logo marquee ("Forbes • Vogue • Tony Robbins • TEDx Talks •") is rendered as bullet-separated plain text with one photographic image (tony-robbins-v1.jpg) but no actual publication masthead logos — Forbes and Vogue in particular carry instant visual recognition through their wordmark lockups; plain text at marquee scale reads as self-assertion, not verified credibility — rendered HTML: `Forbes • Vogue • Tony Robbins • TEDx Talks •`

- [MEDIUM] Founder photo (nicolette.webp) first appears in the mid-page founder section, well below the hero, stat block, and trust-signal band — for a personal-brand-led B2B offer, the founder face should appear in or adjacent to the hero to anchor human trust immediately above the fold; its current placement delays the personal connection until after the visitor has already decided whether to scroll

- [MEDIUM] "RICHER HEALTH" wordmark appears twice inside the hero viewport — once as the nav logo and a second time as a large typographic hero element — the duplication wastes above-fold real estate that could extend the sub-headline or surface a secondary trust cue, and creates visual redundancy with no hierarchy benefit

- [LOW] Hero `<img>` carries a descriptive alt attribute ("Lush dark green ferns in a Pacific Northwest forest") appropriate for a content image; if this image is purely decorative (background atmosphere) it should be implemented as a CSS `background-image` with no alt, or as `alt=""`, to prevent screen-readers from announcing irrelevant scenery mid-headline — rendered HTML: `![Lush dark green ferns in a Pacific Northwest forest](…)`

## Patterns observed

- Week 1 baseline: no prior findings to pattern-match against. Establishing baseline: hero imagery is misaligned with offer, trust signals are front-loaded rather than distributed, icon implementation carries a single-point-of-failure dependency on a web font.

## Out of scope

- [copy-critic] Headline "YOUR PRACTICE. THEIR PLAYBOOK. PATIENTS NOTICE." — clarity and benefit framing of the hero H1
- [conversion-critic] All CTA anchor hrefs resolve to `#` (no booking path wired) — dead links on a live page
- [fh-compliance-critic] Stat sourcing: "67% of patients leave over inconsistent clinical advice" and "3× more patients retained" require cited studies or disclosed methodology
- [seo-critic] Hero `<img>` rendered via `<img>` tag vs. CSS background — LCP candidate and preload eligibility
- [brand-voice-critic] "THEORY KILLS. PROTOCOLS HEAL." — register and tone alignment with warm-authoritative brand voice
