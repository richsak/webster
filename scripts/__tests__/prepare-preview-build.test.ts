import { describe, expect, test } from "bun:test";
import { scrubHtml } from "../prepare-preview-build";

describe("prepare-preview-build", () => {
  test("adds noindex and preview marker to analytics scripts", () => {
    const html =
      '<html><head><title>x</title><script defer src="https://analytics.example/script.js" data-website-id="abc"></script></head><body></body></html>';

    const scrubbed = scrubHtml(html);

    expect(scrubbed).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(scrubbed).toContain('data-preview="1"');
  });

  test("is idempotent", () => {
    const html =
      '<html><head><meta name="robots" content="noindex,nofollow"><script data-website-id="abc" data-preview="1"></script></head></html>';

    expect(scrubHtml(scrubHtml(html))).toBe(scrubHtml(html));
  });
});
