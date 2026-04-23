# Apply notes — week 2026-04-23

Manual apply of `history/2026-04-23/proposal.md` Issues 1–5 into
`site/after/index.html`. Session 4 executed the apply by hand; the
autonomous apply worker (feature #39) is v2 roadmap.

## Source of truth

- **Before** (`site/before/`): `wget --mirror` of
  `certified.richerhealth.ca` on 2026-04-23. Single-page Astro build,
  rendered HTML only (no source tree).
- **After** (`site/after/`): `site/before/` with the 5 proposal edits
  applied.

## Issue-by-issue

### Issue 1 — CTA wiring — DEVIATED from proposal

**Proposal:** replace `href="#"` on 5 CTAs with
`https://app.acuityscheduling.com/schedule.php?owner=16697295`.

**Reality:** the live page already has working CTAs — they wire to
**Calendly**, not Acuity, via `data-calendly-base` + a JS snippet
that rewrites `link.href` at page load with UTM passthrough. The
conversion critic missed this because it grepped page source only
for `acuityscheduling` and ignored the runtime-rewrite pattern.
Logged as a critic blind-spot in
`.claude/checkpoints/2026-04-23T213000Z-critic-blindspot-js-rewrite.md`.

**What was applied:** visible-label standardization only. All five
CTAs now read **BOOK YOUR FREE STRATEGY CALL** (was 4×
"BOOK YOUR FREE CALL" + 1× "BOOK YOUR FREE STRATEGY CALL"). Calendly
wiring preserved; `data-calendly-base` attributes untouched; JS
rewrite snippet untouched.

**What was NOT applied:** routing change to Acuity. That is a
business-routing decision for Richie — not a surgical find-replace.
Deferred as a question for the next grill-me / Phase 2.

### Issue 2 — DSocSci + disclaimers — APPLIED

- Founder section: replaced name (`Nicolette Richer`) → `Dr. Nicolette
  Richer, DSocSci`; replaced eyebrow (`FOUNDER & MASTER CLINICIAN`) →
  `FOUNDER, RICHER HEALTH`; appended scope-note `<p>` clarifying the
  Social Sciences doctorate and non-MD status.
- Footer: prepended medical-disclaimer `<p>`; replaced the 4
  `href="index.html#"` placeholder links with `/privacy`, `/terms`,
  `/clinical-standards`, and `mailto:hello@richerhealth.ca`.

### Issue 3 — Hedge clinical-authority language — APPLIED

- Founder lede first sentence: replaced `25 years reversing chronic
  disease. Cancer, diabetes, autoimmune, mental health.` with the
  hedged "25 years of nutrition-and-lifestyle education …" version
  from proposal. Rest of the paragraph intact (Eat Real to Heal +
  Protocol-not-theory text).
- Stats row: `Patients Treated` → `Clients Served`. The 72K+ number
  is unchanged pending attribution data from Nicolette (proposal
  deferred the source-of-claim work separately).
- Training-lineage line: replaced `Trained under Charlotte Gerson,
  Dr. T. Colin Campbell, and Dr. Neal Barnard.` with the first-person
  hedged version; preserved the "Featured in Forbes, Vogue, and
  backed by Tony Robbins…" continuation.

### Issue 4 — Hero H1 + subhead — APPLIED with minor structure tweak

- H1 was 3-line `YOUR PRACTICE. / THEIR PLAYBOOK. / PATIENTS NOTICE.`
  Now 3-line `N&D Team Certification / For Multi-Practitioner
  Clinics. / One protocol. Every practitioner.` (sage-accent on
  line 3 preserved from original layout; proposal's exact wording
  was lightly compressed to keep the hero scale intact on desktop).
- Subhead rewritten to the ICP-framed "Built for clinical group
  directors…" version per proposal.

### Issue 5 — Head-tag foundation — APPLIED

- Rewrote `<title>` to N&D-keyword-bearing form.
- Added `<meta name="description">` (proposal wording).
- Added `<link rel="canonical">`.
- Added OpenGraph tags (type, url, title, description).
- Added Twitter tags (card, title, description).
- Added JSON-LD block (Person + Organization + WebPage).
- **Omitted**: `og:image`, `twitter:image`, JSON-LD
  `primaryImageOfPage`. `og-card.jpg` does not exist yet; per prompt
  Step 1.3 Issue 5 Dependency note, we do not ship broken image
  URLs. Placeholders left as HTML comments in the `<head>`.
  Unblocking asset is feature #40 (image-gen tool).

## Visual QA checklist (for Richie, pre-commit)

- `http://localhost:8080/site/before/` — pre-apply baseline
- `http://localhost:8080/site/after/` — 5 issues applied

Things to eyeball in `after/`:

1. Hero: new 3-line H1 + ICP subhead — does the scale hold?
2. Founder section: new name + eyebrow + scope-note paragraph — does
   the disclosure read naturally in context?
3. Stats row: "Clients Served" + hedged founder bio.
4. Footer: medical-disclaimer block + real internal/mailto links.
5. View page source: confirm new `<title>` + meta description + JSON-LD
   are present.

## Known limitations

- No production deploy. `site/after/` is local-only.
- `og-card.jpg` still missing (feature #40 will generate it).
- The 72K+ stat is unchanged — attribution work deferred.
- Critic blind-spot re `data-calendly-base` needs a follow-up
  session to fix conversion + seo critic specs.
