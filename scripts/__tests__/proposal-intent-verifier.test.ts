import { describe, expect, test } from "bun:test";
import { extractExpectedPhrases, verifyProposalIntent } from "../proposal-intent-verifier";

describe("proposal intent verifier", () => {
  test("extracts visible intent phrases from proposal issue HTML", () => {
    const proposal =
      "### 1. [HIGH] Hero\nAfter:\n```html\n<h1>No more patient churn</h1>\n<p>One protocol. Every practitioner.</p>\n```";

    expect(extractExpectedPhrases(proposal)).toContain("No more patient churn");
    expect(extractExpectedPhrases(proposal)).toContain("One protocol. Every practitioner.");
  });

  test("passes when rendered accessibility text contains expected phrases", () => {
    const proposal = "### 1. [HIGH] Hero\nAfter:\n```html\n<h1>No more patient churn</h1>\n```";

    expect(verifyProposalIntent(proposal, "Welcome. No more patient churn.")[0]).toMatchObject({
      status: "PASS",
      missing_phrases: [],
    });
  });

  test("fails when a proposal phrase is dropped from rendered text", () => {
    const proposal = "### 1. [HIGH] Hero\nAfter:\n```html\n<h1>No more patient churn</h1>\n```";

    expect(verifyProposalIntent(proposal, "Welcome.")[0]).toMatchObject({
      status: "FAIL",
      missing_phrases: ["No more patient churn"],
    });
  });
});
