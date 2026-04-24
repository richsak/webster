# Findings — Week 2026-04-23

## Issues

- [CRITICAL] All CTA buttons route to `href="#"` — Acuity scheduling link is completely unwired. Every "BOOK YOUR FREE CALL" and "BOOK YOUR FREE STRATEGY CALL" anchor dead-ends at a null fragment instead of routing to `app.acuityscheduling.com/schedule.php?owner=16697295`. Booking is impossible from this page. — evidence: rendered HTML shows `[BOOK YOUR FREE CALL](#)` × 4 and `[BOOK YOUR FREE STRATEGY CALL](#)` × 1; zero occurrences of `acuityscheduling` in page source

- [HIGH] No inline Acuity embed and no `target="_blank"` on any CTA — even after the link is corrected, there is no scheduler widget embedded on-page and no new-tab directive, so visitors must navigate away from the LP cold. An inline embed (Acuity's embed script) would eliminate one navigation hop and keep context visible during booking. — evidence: no `<iframe>`, no embed widget, no `target` attribute in rendered HTML

- [HIGH] Only one testimonial visible (Tony Robbins) and it is isolated in its own section with no CTA adjacent — the ICP (clinical group directors, US clinic owners) may not self-identify with a global wellness celebrity endorsement; zero practitioner or clinic-director voices present; the Robbins quote appears at section 2 but no social proof appears near the Steps section CTA or the pre-footer CTA. — evidence: single testimonial block between trust bar and stats section; Steps section and bottom section CTAs have no neighbouring testimonial or quote

- [HIGH] Trust signals are front-loaded and absent near mid-page and bottom CTAs — credential marquee (Forbes, Vogue, TEDx) and Robbins quote appear in sections 2–3 only; the Steps section CTA (`[BOOK YOUR FREE CALL](#)`) and final pre-footer CTA have zero adjacent credential badges, logos, or testimonials. Decision-point reinforcement is missing at the moments of ask. — evidence: rendered HTML shows no trust element between the stats block and the footer

- [MEDIUM] No urgency or scarcity signal anywhere on the page — no cohort-size framing ("Q2 intake open"), no capacity language ("4 spots this quarter"), no time-bound offer. For a high-ticket B2B certification, a credible intake-limit signal materially increases commitment from warm visitors. — evidence: no such language in rendered HTML

- [MEDIUM] CTA label is inconsistent: hero reads "BOOK YOUR FREE STRATEGY CALL" while all other CTAs (nav + 3 body) read "BOOK YOUR FREE CALL" — the word "STRATEGY" appears only once, creating a micro-ambiguity about whether these are the same action; the hero CTA should be the canonical label used everywhere, or vice versa. — evidence: hero `[BOOK YOUR FREE STRATEGY CALL](#)` vs nav/body `[BOOK YOUR FREE CALL](#)` × 4

- [MEDIUM] The N&D Certification product name and its concrete outcome are not stated in proximity to the founder bio CTA — the bio section names Nicolette's credentials and training lineage but the adjacent CTA ("BOOK YOUR FREE CALL") floats without clarifying *what* the call is about; a visitor who scrolled past the hero without reading it wouldn't know they're booking a certification discovery call. — evidence: founder section contains no explicit mention of "N&D Certification" or "Nutrition & Detoxification" near its CTA

- [LOW] Nav CTA appears as plain text link with no button treatment described in the rendered markup — on mobile, a text-style nav link is easily missed; a visually distinct pill/button in the nav (contrasting colour, border) would raise click-through on mobile above-fold. — evidence: nav link rendered as `[BOOK YOUR FREE CALL](#)` inline with brand name, no button class or wrapper visible

- [LOW] No secondary micro-conversion for visitors not ready to book — there is no email capture, lead magnet ("Download a sample protocol"), or newsletter opt-in; the page is single-channel (book now or leave), which may waste warm traffic that needs a nurture step. — evidence: no form, no secondary CTA in rendered HTML

- [LOW] Stats (3×, 67%, $240K) carry no source citation or attribution — unsourced statistics undermine credibility for a skeptical B2B buyer comparing certifications; even "internal cohort data" or "based on X clients" would satisfy due-diligence objectors. — evidence: stats block presents bare numbers with descriptors only

## Patterns observed

- Week 1 baseline: All-broken booking links is the single dominant pattern; the page is functionally a brochure with no conversion path. Every other CRO improvement is moot until `href="#"` is replaced with the live Acuity URL.
- Trust signal concentration in upper sections and absence at decision points is a recurring structural risk to watch in future redesigns.

## Out of scope

- [fh-compliance] "MASTER CLINICIAN" title and clinical outcome claims ("reversing chronic disease," "Cancer, diabetes, autoimmune, mental health") appear without a disclaimer that Nicolette Richer is not a medical doctor — required per business.md
- [brand-voice] Hero uses ALL-CAPS throughout; section subheadings use mixed case — casing inconsistency is a brand-voice concern
- [copy-critic] Single testimonial source (Tony Robbins) — diversity and quantity of social proof voices is a copy/content decision
- [genealogy] Visual layout of stats block, step cards, and trust-signal distribution across breakpoints — layout architecture concern
