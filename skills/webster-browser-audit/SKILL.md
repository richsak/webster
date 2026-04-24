# Webster Browser Audit

Use this skill when verifying a Webster landing-page preview in a real browser after the apply worker mutates the page.

## Purpose

Run a headless browser audit that produces evidence for `history/<week>/visual-review.md`.

Capabilities:

1. Capture screenshots at the three Webster breakpoints:
   - mobile: `375x900`
   - tablet: `768x1024`
   - desktop: `1440x900`
2. Extract rendered accessibility/tree text for proposal-intent checks.
3. Record interactions:
   - click every booking CTA
   - scroll the page top-to-bottom
   - focus visible form fields if present
   - capture console errors and page errors
4. Report layout signals:
   - horizontal overflow
   - document height by breakpoint
   - visible CTA count
   - missing or non-resolving CTA hrefs

## Preferred command shape

If Playwright is installed in the environment, run:

```bash
bun scripts/browser-audit.ts <url> --out history/<week>/browser-audit
```

If Playwright is not installed, do not fake screenshots. Fall back to HTML/accessibility text evidence and state:

```text
Screenshot capture unavailable: Playwright not installed in this container.
```

## Output contract

Write artifacts under `history/<week>/browser-audit/`:

```text
mobile.png
tablet.png
desktop.png
a11y-text.txt
interactions.json
console.json
summary.json
```

`summary.json` shape:

```json
{
  "url": "https://preview.example.pages.dev",
  "breakpoints": [
    {
      "name": "mobile",
      "width": 375,
      "height": 900,
      "screenshot": "mobile.png",
      "document_height": 4200,
      "horizontal_overflow": false
    },
    {
      "name": "tablet",
      "width": 768,
      "height": 1024,
      "screenshot": "tablet.png",
      "document_height": 3900,
      "horizontal_overflow": false
    },
    {
      "name": "desktop",
      "width": 1440,
      "height": 900,
      "screenshot": "desktop.png",
      "document_height": 3200,
      "horizontal_overflow": false
    }
  ],
  "cta_count": 5,
  "console_errors": [],
  "page_errors": []
}
```

## Review discipline

- Prefer rendered evidence over source grep.
- Never claim a screenshot exists unless a PNG file was written.
- Treat any console/page error as at least HIGH until explained.
- Treat horizontal overflow at 375px as CRITICAL if it hides CTA or headline content.
- Attach screenshot refs in `visual-review.md` even when verdict is PASS.
