# Findings — Week 2026-04-23

## Issues

- [CRITICAL] No CTA above the fold — user must scroll 1.8 viewports before hitting "Book a call" — evidence: rendered hero block has 0 `<button>` and 0 link styled as CTA
- [HIGH] Primary CTA ("Book a call") and secondary CTA ("Learn more") are equal-weight visually — decision paralysis — evidence: both buttons same size, same color treatment in features section
- [HIGH] CTA button tap target is 28px tall on mobile — below 44px Apple/Google guideline — evidence: rendered `<button class="cta">` height in mobile viewport
- [MEDIUM] No social proof near primary CTA — testimonial block is 3 viewports below — evidence: CTA in Program section, testimonials in section 5
- [MEDIUM] Form fields (if program enrollment lives behind CTA) not visible — unknown friction behind the click — evidence: CTA links to `/apply` (not inspected this audit)
- [LOW] Booking CTA reads "Learn more" in features section — vague verb, no commitment framing — evidence: features CTA text

## Patterns observed

- CTA placement is reactive ("put one near each section") rather than calibrated to funnel stage. High-intent CTAs ("Book a call") appear next to low-intent CTAs ("Learn more") without hierarchy.

## Out of scope

- [copy] CTA copy quality ("Book a call" vs "Claim your spot") — copy-critic owns wording.
- [accessibility] 28px tap targets on mobile are also an a11y issue (motor-impairment users). I flag it from CRO angle but a11y scope is unowned.
- [seo] Internal linking between CTA destinations — seo-critic's domain.
