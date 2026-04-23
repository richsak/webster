# Redesign proposal — Week 2026-04-23

## Issues selected (top 5)

### 1. [CRITICAL] Wire every booking CTA to the live Acuity URL — conversion

**Target file(s):** `site/src/pages/index.astro` (hero + body CTAs), `site/src/components/Nav.astro` (nav CTA), `site/src/components/FinalCTA.astro` (bottom CTA)

**Change:**

Before (all five CTA anchors):
```html
<a href="#" class="cta-primary">BOOK YOUR FREE STRATEGY CALL</a>
<!-- and × 4 in nav + body + steps + final: -->
<a href="#" class="cta-primary">BOOK YOUR FREE CALL</a>
```

After (standardise label and point at Acuity):
```html
<a
  href="https://app.acuityscheduling.com/schedule.php?owner=16697295"
  class="cta-primary"
  target="_blank"
  rel="noopener"
  data-cta="book-strategy-call"
>BOOK YOUR FREE STRATEGY CALL</a>
```

**Rationale:** This is the direct, first-order fix for the -40% WoW conversion drop flagged in `context/monitor/alerts.md`. Conversion critic: *"zero occurrences of `acuityscheduling` in page source … Booking is impossible from this page."* (CRITICAL). SEO critic independently flagged the same `href="#"` pattern as a crawler dead-end (HIGH). Five edits, one canonical label ("BOOK YOUR FREE STRATEGY CALL") also closes the brand-voice LOW finding on inconsistent CTA copy and the conversion MEDIUM finding on label ambiguity. `target="_blank"` preserves LP context during booking (addresses conversion HIGH on no-embed/no-new-tab). Every other CRO and SEO improvement is moot until this lands.

---

### 2. [CRITICAL] Add DSocSci / non-MD disclaimer adjacent to health-outcome claims + medical-advice disclaimer in footer — fh-compliance / brand-voice

**Target file(s):** `site/src/components/FounderSection.astro`, `site/src/components/Footer.astro`

**Change A** — Founder section byline (replace the existing title block):

Before:
```html
<p class="founder-eyebrow">FOUNDER &amp; MASTER CLINICIAN</p>
<h3 class="founder-name">Dr. Nicolette Richer</h3>
```

After:
```html
<p class="founder-eyebrow">FOUNDER, RICHER HEALTH</p>
<h3 class="founder-name">Dr. Nicolette Richer, DSocSci</h3>
<p class="founder-scope-note">
  Dr. Nicolette Richer holds a Doctorate in Social Sciences (Royal Roads
  University). She is not a licensed medical doctor and does not diagnose,
  treat, or prescribe. Her practice is health education and lifestyle
  coaching — always complementary to, never a replacement for, care from
  your licensed physician.
</p>
```

**Change B** — Footer (append disclaimer block above the existing nav row):

Before:
```html
<footer>
  <nav class="footer-nav">
    <a href="#">Privacy</a> · <a href="#">Terms</a> ·
    <a href="#">Clinical Standards</a> · <a href="#">Contact</a>
  </nav>
  <p class="copy">© 2026 Richer Health</p>
</footer>
```

After:
```html
<footer>
  <p class="medical-disclaimer">
    This website is for educational purposes only and does not constitute
    medical advice. Consult your physician before making any changes to
    your health regimen. Dr. Nicolette Richer, DSocSci, is not a licensed
    medical doctor. Individual results vary.
  </p>
  <nav class="footer-nav">
    <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·
    <a href="/clinical-standards">Clinical Standards</a> ·
    <a href="mailto:hello@richerhealth.ca">Contact</a>
  </nav>
  <p class="copy">© 2026 Richer Health</p>
</footer>
```

**Rationale:** fh-compliance CRITICAL: *"DSocSci / non-MD disclaimer is entirely absent from the page … Required wherever health outcomes are discussed"* and *"Medical-advice disclaimer absent from footer and page body"*. Brand-voice CRITICAL echoes the same gap. `business.md` explicitly lists "Disclaimer required wherever health outcomes are discussed" as a standing identity rule. This is a standing legal-risk issue that should not ship another week unfixed; the changes are two localised inserts and introduce zero layout churn. Replacing `#`-placeholder footer links with real routes is bundled because the footer is being rewritten anyway.

---

### 3. [CRITICAL] Scrub unhedged clinical-authority language in the founder section — fh-compliance

**Target file(s):** `site/src/components/FounderSection.astro`, `site/src/components/StatsRow.astro`

**Change A** — Founder bio opening line (hedge the disease-reversal verb):

Before:
```html
<p class="founder-lede">
  25 years reversing chronic disease.
  Cancer, diabetes, autoimmune, mental health.
</p>
```

After:
```html
<p class="founder-lede">
  25 years of nutrition-and-lifestyle education that has helped clients
  reduce the burden of chronic conditions — including metabolic disease,
  autoimmune conditions, and mental-health presentations — alongside
  their physicians' care.
</p>
```

**Change B** — "Patients Treated" stat label (remove the implied medical-treatment relationship):

Before:
```html
<div class="stat">
  <span class="stat-number">72K+</span>
  <span class="stat-label">Patients Treated</span>
</div>
```

After:
```html
<div class="stat">
  <span class="stat-number">72K+</span>
  <span class="stat-label">Clients Served</span>
</div>
```

**Change C** — "MASTER CLINICIAN" already removed via Issue 2; training-lineage sentence in the bio gains a scope clip:

Before:
```html
<p>Trained under Charlotte Gerson, Dr. T. Colin Campbell, and Dr. Neal Barnard.</p>
```

After:
```html
<p>I trained under Charlotte Gerson, Dr. T. Colin Campbell, and Dr. Neal
Barnard — educators in the nutrition-and-lifestyle tradition, not
medical-treatment protocols.</p>
```

**Rationale:** fh-compliance CRITICAL × 2: *"Disease-reversal claim, unhedged — … constitutes a therapeutic cure/treatment claim that requires Rx-drug-style substantiation"* and *"'72K+ Patients Treated' — the word 'Treated' … implies a licensed medical treatment relationship. DSocSci practitioners see clients, not patients, and do not 'treat'"*. fh-compliance LOW on the Gerson/Campbell/Barnard line is cheap to clip in the same pass ("deepens the impression that Nicolette practises licensed cancer/disease treatment"). Copy critic MEDIUM on the passive "Trained under…" ("Should read 'I trained under…'") is closed by the same rewrite. Three string replacements in two components; no layout impact. This de-risks the page before it is promoted to paid traffic.

---

### 4. [CRITICAL+HIGH] Rewrite hero H1 + subhead for one-read clarity AND keyword surface — copy / seo

**Target file(s):** `site/src/components/Hero.astro`

**Change:**

Before:
```html
<h1 class="hero-h1">
  YOUR PRACTICE. THEIR PLAYBOOK. PATIENTS NOTICE.
</h1>
<p class="hero-sub">
  One clinical framework so every patient gets the same standard of care,
  no matter who they see.
</p>
```

After:
```html
<h1 class="hero-h1">
  N&amp;D Team Certification for Multi-Practitioner Clinics.<br />
  One protocol. Every practitioner. No more patient churn.
</h1>
<p class="hero-sub">
  Built for clinical group directors: unify your team on a single
  evidence-based nutrition &amp; detoxification protocol — so patients
  get the same answer from every practitioner, and stop walking out
  the door.
</p>
```

**Rationale:** Copy critic CRITICAL: *"'THEIR' has no clear referent on a cold read … The three fragments resolve only after reading the subheadline, violating the one-read test"*. SEO critic HIGH: *"H1 contains zero keyword signal … terms a clinic director would search ('N&D team certification', 'clinical protocol training', 'nutrition certification for clinics', 'practitioner alignment program') appear nowhere in the H1"*. Copy critic HIGH: subhead is feature-framed not outcome-framed, and MEDIUM: ICP qualifier ("Built for multi-practitioner clinics") appears only in the final CTA — the rewritten subhead front-loads the ICP on first scroll. A single hero edit closes four findings across two critics and materially helps organic share (monitor HIGH: -8pp WoW) by surfacing the primary keyword cluster. Stays inside brand-voice calibration (warm-authoritative; no all-caps shouting fragments).

---

### 5. [CRITICAL+HIGH] Ship the head-tag foundation: JSON-LD, canonical, meta description, OpenGraph, rewritten title — seo

**Target file(s):** `site/src/layouts/Layout.astro` (or equivalent root layout with `<head>`)

**Change** — add the following inside `<head>`, replacing the existing `<title>`:

Before:
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stop Practitioner Roulette | Richer Health</title>
</head>
```

After:
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>N&amp;D Team Certification for Clinics | Richer Health</title>
  <meta
    name="description"
    content="Certify your clinical team on one unified Nutrition &amp; Detoxification protocol. Built for multi-practitioner clinics who are losing patients to inconsistent advice. Led by Dr. Nicolette Richer, DSocSci."
  />
  <link rel="canonical" href="https://certified.richerhealth.ca/" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://certified.richerhealth.ca/" />
  <meta
    property="og:title"
    content="N&amp;D Team Certification for Clinics | Richer Health"
  />
  <meta
    property="og:description"
    content="One protocol. Every practitioner. No more patient churn. Team certification from Dr. Nicolette Richer, DSocSci."
  />
  <meta property="og:image" content="https://certified.richerhealth.ca/og-card.jpg" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta
    name="twitter:title"
    content="N&amp;D Team Certification for Clinics | Richer Health"
  />
  <meta
    name="twitter:description"
    content="One protocol. Every practitioner. No more patient churn."
  />
  <meta name="twitter:image" content="https://certified.richerhealth.ca/og-card.jpg" />

  <!-- JSON-LD: Person + Organization -->
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": "https://richerhealth.ca/#nicolette",
          "name": "Dr. Nicolette Richer",
          "honorificPrefix": "Dr.",
          "honorificSuffix": "DSocSci",
          "jobTitle": "Founder, Richer Health",
          "alumniOf": "Royal Roads University",
          "description": "Doctorate in Social Sciences; founder of Richer Health and the N&D Certification program. Not a licensed medical doctor.",
          "url": "https://richerhealth.ca/",
          "sameAs": [
            "https://certified.richerhealth.ca/",
            "https://richeratwork.com/"
          ]
        },
        {
          "@type": "Organization",
          "@id": "https://richerhealth.ca/#org",
          "name": "Richer Health",
          "url": "https://richerhealth.ca/",
          "founder": { "@id": "https://richerhealth.ca/#nicolette" },
          "areaServed": ["CA", "US"],
          "address": {
            "@type": "PostalAddress",
            "addressRegion": "BC",
            "addressCountry": "CA"
          }
        },
        {
          "@type": "WebPage",
          "@id": "https://certified.richerhealth.ca/#webpage",
          "url": "https://certified.richerhealth.ca/",
          "name": "N&D Team Certification for Clinics | Richer Health",
          "about": { "@id": "https://richerhealth.ca/#org" },
          "primaryImageOfPage": "https://certified.richerhealth.ca/og-card.jpg"
        }
      ]
    }
  </script>
</head>
```

**Rationale:** SEO critic flagged four CRITICAL/HIGH issues on head-tag instrumentation — *"no `<script type=application/ld+json>` block"*, *"Canonical tag absent"*, *"Meta description absent"*, *"Title tag carries no primary keywords"* — plus MEDIUM on OG/Twitter cards. The LP is currently *"invisible to Google Rich Results and social preview systems"*. This is one file edit that closes five findings and directly addresses the -8pp organic-share monitor signal. The JSON-LD Person block also encodes the DSocSci credential for structured-data consumers, which reinforces the Issue 2 disclaimer work. An `og-card.jpg` asset (1200×630) is a prerequisite for this edit — flag as a dependency for the apply session.

---

## Deferred (not selected)

- [HIGH] (conversion) Inline Acuity embed widget — nice-to-have after Issue 1 ships; wiring is the bottleneck, embed UX is the polish.
- [HIGH] (conversion) Trust signals / testimonials missing near mid-page and bottom CTAs — layout restructure; needs new testimonial assets beyond Tony Robbins and a visual-design critic pass on placement.
- [HIGH] (copy) Offer stack entirely absent (delivery format, cohort size, timeline, investment) — requires business-side input on current cohort configuration; not a surgical text swap.
- [HIGH] (copy) Stats block ("67% / 3× / $240K") carries no source, sample size, or baseline — same blocker: need attributable data from the client before publishing revised copy. fh-compliance MEDIUM on the same strings rides along.
- [HIGH] (brand-voice) Signature phrase *"Your body's ability to heal is greater than anyone has permitted you to believe"* absent from page — adding it well requires a new placement block and visual treatment; worthy of its own proposal slot next week.
- [HIGH] (brand-voice) Hero register is all-caps confrontational B2B — largely resolved by the Issue 4 H1 rewrite; any residual tonal work is a follow-up.
- [MEDIUM] (brand-voice, fh-compliance) "THEORY KILLS. PROTOCOLS HEAL." section header — editorial judgement call; fh-compliance flags regulatory-scrutiny risk but it is MEDIUM, below the CRITICAL cluster this week.
- [MEDIUM] (brand-voice) First-person direct address missing from hero/first-three-scrolls — partially addressed by the Issue 3 "I trained under…" rewrite; fuller voice calibration is a next-week pass.
- [MEDIUM] (brand-voice) Closing CTA section lacks Nicolette voice — defer; CTA wiring (Issue 1) takes precedence on that section this week.
- [MEDIUM] (conversion) No urgency/scarcity signal ("Q2 intake open", "4 spots this quarter") — needs a business decision on whether intake is genuinely capped.
- [MEDIUM] (copy) Section header "THE PATH TO MASTERY" not scannable — low-blast-radius wording change; defer to the voice pass.
- [MEDIUM] (copy) Step 02 "Built around your patient load" passive / unqualified claim; Step 04 ongoing-support vagueness — reopens the offer-stack question; defer with Copy HIGH.
- [MEDIUM] (copy) N&D acronym undefined on the page — partially addressed by the Issue 4 hero rewrite which now uses "Nutrition & Detoxification" in the subhead; a bracket-definition in the final CTA section is a trivial follow-up.
- [MEDIUM] (seo) Heading hierarchy skips H3 — accessibility/structure fix; bundle with Step-section copy rewrite.
- [LOW] (seo) Hero image alt text, preload hint on LCP image — technical polish; ship after content stabilises.
- [LOW] (conversion) Nav CTA button treatment on mobile — visual-design concern.
- [LOW] (conversion) Secondary micro-conversion / email capture — strategic addition; not this week.

---

## Reasoning

The monitor signal is loud and unambiguous this week: conversions down 40% WoW on an 850-session week (6 conversions total), and organic traffic share down 8 percentage points. Conversion and SEO findings accordingly carry the heaviest weight; brand-voice and copy findings are included only where they overlap with compliance risk or with the conversion/SEO hypothesis. fh-compliance CRITICALs are non-negotiable regardless of monitor signal because they are a standing legal-risk class — they ship whether traffic moves or not.

The conversion drop has an overwhelming single-point explanation in the findings: every booking CTA routes to `href="#"` and the Acuity URL appears nowhere in the rendered page (Conversion CRITICAL, SEO HIGH on the same strings). That is Issue 1, and it is the highest-leverage change of the week. Issue 5 (head-tag foundation) is the direct counterpart for organic traffic: five SEO findings collapse into one `<head>` edit. Issues 2 and 3 are the compliance pair that cannot be deferred again — DSocSci disclaimer, medical-advice footer note, and the unhedged "reversing / treated / master clinician" language cluster. Issue 4 is the one content edit that earned its slot by closing findings across two critics (copy CRITICAL + HIGH + MEDIUM, SEO HIGH) in a single surgical rewrite of the hero — it simultaneously clarifies, front-loads the ICP, and delivers keyword surface.

Everything deferred is either (a) lower severity, (b) blocked on client-side data or assets (offer stack specifics, stat attribution, OG card image), (c) partially addressed by the five selected edits and thus cheaper to revisit after they land, or (d) larger-blast-radius work (signature-phrase placement, mid/bottom trust-signal restructure) that deserves its own proposal slot. The cap of five is deliberate: each selected change is reviewable in under ten minutes, and the five together can be applied in a single short session without colliding edits.
