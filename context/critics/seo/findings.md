# Findings — Week 2026-04-23

## Issues

- [CRITICAL] No JSON-LD structured data present — page source contains no `<script type="application/ld+json">` block; Google cannot surface a rich result for Nicolette Richer (Person / DSocSci credential) or Richer Health (HealthAndBeautyBusiness / LocalBusiness); all schema eligibility is forfeited
- [CRITICAL] Canonical tag absent — no `<link rel="canonical" href="https://certified.richerhealth.ca/">` detected; subdomain LP risks duplicate-content relationship with richerhealth.ca and any staging variants; Googlebot must guess the preferred URL
- [HIGH] All CTA and footer links resolve to `#` placeholder — five "BOOK YOUR FREE CALL" anchors plus four footer nav links (Privacy, Terms, Clinical Standards, Contact) all point to `href="#"`; crawlers see no outbound or internal destination; the Acuity booking URL (`app.acuityscheduling.com/schedule.php?owner=16697295`) is never exposed to Google's link graph
- [HIGH] H1 contains zero keyword signal — `<h1>YOUR PRACTICE. THEIR PLAYBOOK. PATIENTS NOTICE.</h1>` is pure tagline copy; terms a clinic director would search ("N&D team certification", "clinical protocol training", "nutrition certification for clinics", "practitioner alignment program") appear nowhere in the H1
- [HIGH] Meta description absent — no `<meta name="description">` confirmed in page source; Google auto-generates a snippet, typically pulling the first visible text ("Stop Practitioner Roulette | Richer Health"), discarding the 72K-patients-treated authority proof and the specific N&D certification offer
- [MEDIUM] Heading hierarchy skips H3 entirely — page structure is H1 → H2(×4) → H4(×4); the four process steps ("Discovery Call", "Custom Onboarding Plan", "All-In Team Training", "Mastery + Mentorship") are marked `<h4>` with no intervening H3 under "THE PATH TO MASTERY"; violates logical nesting required for accessibility trees and crawler outline parsing
- [MEDIUM] Open Graph and Twitter Card tags absent — no `og:title`, `og:description`, `og:image`, `og:type`, or `twitter:card` meta confirmed; social shares of the LP render without preview card, losing the Tony Robbins quote and Nicolette's authority imagery on every LinkedIn/X share by a clinic director audience
- [MEDIUM] Title tag carries no primary keywords — `<title>Stop Practitioner Roulette | Richer Health</title>` is a tagline; target terms ("N&D certification", "clinical team training", "nutrition protocol for clinics") are absent; title length is acceptable (~47 chars) but keyword value is near-zero
- [LOW] Hero image alt describes the stock photo, not the business — `alt="Lush dark green ferns in a Pacific Northwest forest"` on the above-fold background image contributes no topical relevance; if decorative, `alt=""` is correct; if content, alt should be business-contextual (e.g., "Richer Health N&D team certification — clinical excellence for integrative practices")
- [LOW] No `<link rel="preload">` or `fetchpriority="high"` on hero image — the 1920×1080 Unsplash image is the LCP element with no preload hint in `<head>`; on cold load, browser discovers it only after parsing the full DOM, delaying LCP and Core Web Vitals score

## Patterns observed

- Week 1 baseline: LP is currently a pure marketing shell with no technical SEO instrumentation — no schema, no canonical, no OG, no meaningful meta. The page would be invisible to Google Rich Results and social preview systems. Every subsequent council iteration should verify these foundational tags land before moving to refinement.
- All interactive links use `#` placeholders — this pattern suggests the LP was built for visual review, not production deployment. The booking funnel is entirely disconnected from the live Acuity URL noted in business.md.
- Copy-first, SEO-second architecture: H1/H2/H4 headings are crafted for emotional resonance (which is correct for conversion) but carry zero keyword surface area. A dual-purpose rewrite can thread keywords without sacrificing voice.

## Out of scope

- [fh-compliance] No disclaimer present for Nicolette Richer's DSocSci credential in context of health outcome claims ("reversing chronic disease", "Cancer, diabetes, autoimmune, mental health")
- [conversion] Five identical CTAs reading "BOOK YOUR FREE CALL" with no variation in urgency or specificity across page sections
- [brand-voice] Stat block ("67% of patients leave over inconsistent clinical advice") lacks a visible citation source
- [visual-design] Section rhythm: marquee ticker ("RICHER RICHER RICHER…") and icon-based process steps may benefit from visual-design critic review once that role is instantiated
