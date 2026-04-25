import { describe, expect, test } from "bun:test";
import {
  PROPOSAL_KINDS,
  PROPOSAL_V2_SCHEMA,
  parseProposalV2,
  routeProposalIssue,
  validateProposalConstraints,
} from "../proposal-schema-v2";

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

  test("routes each kind to the apply worker tool family", () => {
    const base = {
      id: "x",
      title: "x",
      files_touched: ["x"],
      constraints: { preserves: [], within: {} },
    };
    expect(routeProposalIssue({ ...base, kind: "text" }).route).toBe("find-replace");
    expect(routeProposalIssue({ ...base, kind: "css" }).route).toBe("css-token");
    expect(routeProposalIssue({ ...base, kind: "component" }).route).toBe("component-structure");
    expect(routeProposalIssue({ ...base, kind: "asset" }).route).toBe("visual-asset");
  });

  test("validates preserved constraints against rendered output", () => {
    const issue = parseProposalV2({
      issues: [
        {
          id: "hero",
          title: "Hero",
          kind: "component",
          files_touched: ["Hero.astro"],
          constraints: { preserves: ["No more patient churn"], within: {} },
        },
      ],
    })[0];
    if (!issue) {
      throw new Error("expected parsed issue");
    }
    expect(validateProposalConstraints(issue, "No more patient churn appears")).toEqual([]);
    expect(validateProposalConstraints(issue, "Dropped copy")).toEqual(["No more patient churn"]);
  });

  test("validates numeric rendered measurements in within constraints", () => {
    const issue = parseProposalV2({
      issues: [
        {
          id: "hero",
          title: "Hero",
          kind: "component",
          files_touched: ["Hero.astro"],
          constraints: {
            preserves: [],
            within: { desktop_h1_lines: 3, hero_height: { max: 700 } },
          },
        },
      ],
    })[0];
    if (!issue) {
      throw new Error("expected parsed issue");
    }
    expect(
      validateProposalConstraints(issue, {
        text: "",
        measurements: { desktop_h1_lines: 4, hero_height: 720 },
      }),
    ).toEqual([
      "desktop_h1_lines: expected 3, received 4",
      "hero_height: expected <= 700, received 720",
    ]);
  });

  test("rejects empty issue id and title", () => {
    expect(() =>
      parseProposalV2({
        issues: [
          {
            id: " ",
            title: "x",
            kind: "text",
            files_touched: [],
            constraints: { preserves: [], within: {} },
          },
        ],
      }),
    ).toThrow("Proposal issue id must be a non-empty string");
    expect(() =>
      parseProposalV2({
        issues: [
          {
            id: "x",
            title: " ",
            kind: "text",
            files_touched: [],
            constraints: { preserves: [], within: {} },
          },
        ],
      }),
    ).toThrow("Proposal issue title must be a non-empty string");
  });

  test("rejects missing or non-object within constraints", () => {
    expect(() =>
      parseProposalV2({
        issues: [
          {
            id: "x",
            title: "x",
            kind: "text",
            files_touched: [],
            constraints: { preserves: [] },
          },
        ],
      }),
    ).toThrow("Proposal constraints.within must be an object");
    expect(() =>
      parseProposalV2({
        issues: [
          {
            id: "x",
            title: "x",
            kind: "text",
            files_touched: [],
            constraints: { preserves: [], within: [] },
          },
        ],
      }),
    ).toThrow("Proposal constraints.within must be an object");
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
