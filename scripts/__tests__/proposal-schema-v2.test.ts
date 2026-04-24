import { describe, expect, test } from "bun:test";
import { PROPOSAL_KINDS, PROPOSAL_V2_SCHEMA, parseProposalV2 } from "../proposal-schema-v2";

describe("proposal schema v2", () => {
  test("locks kind-aware issue enum", () => {
    expect(PROPOSAL_KINDS).toEqual(["text", "css", "component", "asset"]);
    expect(PROPOSAL_V2_SCHEMA.properties.issues.items.properties.kind.enum).toEqual(PROPOSAL_KINDS);
  });

  test("parses atomic multi-kind issue constraints", () => {
    expect(
      parseProposalV2({
        issues: [
          {
            id: "issue-hero-atomic",
            title: "Hero copy plus desktop line constraint",
            kind: "component",
            files_touched: ["site/src/components/Hero.astro"],
            constraints: {
              preserves: ["hero CTA remains visible above fold"],
              within: { desktop_h1_lines: 3 },
            },
          },
        ],
      }),
    ).toEqual([
      {
        id: "issue-hero-atomic",
        title: "Hero copy plus desktop line constraint",
        kind: "component",
        files_touched: ["site/src/components/Hero.astro"],
        constraints: {
          preserves: ["hero CTA remains visible above fold"],
          within: { desktop_h1_lines: 3 },
        },
      },
    ]);
  });

  test("rejects unknown kinds", () => {
    expect(() =>
      parseProposalV2({
        issues: [
          {
            id: "x",
            title: "x",
            kind: "motion",
            files_touched: [],
            constraints: { preserves: [], within: {} },
          },
        ],
      }),
    ).toThrow("Invalid proposal kind");
  });
});
