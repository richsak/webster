#!/usr/bin/env bun

export const PROPOSAL_KINDS = ["text", "css", "component", "asset"] as const;
export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export interface ProposalConstraints {
  preserves: string[];
  within: Record<string, unknown>;
}

export interface ProposalV2Issue {
  id: string;
  title: string;
  kind: ProposalKind;
  files_touched: string[];
  constraints: ProposalConstraints;
}

export const PROPOSAL_V2_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["issues"],
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "kind", "files_touched", "constraints"],
        properties: {
          id: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          kind: { type: "string", enum: PROPOSAL_KINDS },
          files_touched: { type: "array", items: { type: "string", minLength: 1 } },
          constraints: {
            type: "object",
            additionalProperties: false,
            required: ["preserves", "within"],
            properties: {
              preserves: { type: "array", items: { type: "string" } },
              within: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseKind(value: unknown): ProposalKind {
  if (typeof value === "string" && PROPOSAL_KINDS.some((kind) => kind === value)) {
    return value as ProposalKind;
  }
  throw new Error(`Invalid proposal kind: ${String(value)}`);
}

export function parseProposalV2Issue(value: unknown): ProposalV2Issue {
  if (!isRecord(value)) {
    throw new Error("Proposal issue must be an object");
  }
  const constraints = value.constraints;
  if (!isRecord(constraints)) {
    throw new Error("Proposal issue constraints must be an object");
  }
  if (!Array.isArray(value.files_touched)) {
    throw new Error("Proposal issue files_touched must be an array");
  }
  if (!Array.isArray(constraints.preserves)) {
    throw new Error("Proposal constraints.preserves must be an array");
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const title = typeof value.title === "string" ? value.title.trim() : "";
  if (!id) {
    throw new Error("Proposal issue id must be a non-empty string");
  }
  if (!title) {
    throw new Error("Proposal issue title must be a non-empty string");
  }

  return {
    id,
    title,
    kind: parseKind(value.kind),
    files_touched: value.files_touched.map(String),
    constraints: {
      preserves: constraints.preserves.map(String),
      within: isRecord(constraints.within) ? constraints.within : {},
    },
  };
}

export function parseProposalV2(value: unknown): ProposalV2Issue[] {
  if (!isRecord(value) || !Array.isArray(value.issues)) {
    throw new Error("Proposal v2 must contain issues array");
  }
  return value.issues.map(parseProposalV2Issue);
}

export interface RoutedProposalIssue extends ProposalV2Issue {
  route: "find-replace" | "css-token" | "component-structure" | "visual-asset";
}

export function routeProposalIssue(issue: ProposalV2Issue): RoutedProposalIssue {
  const routeByKind = {
    text: "find-replace",
    css: "css-token",
    component: "component-structure",
    asset: "visual-asset",
  } as const;
  return { ...issue, route: routeByKind[issue.kind] };
}

export interface RenderedConstraintMetrics {
  text: string;
  measurements?: Record<string, number>;
}

export function validateProposalConstraints(
  issue: ProposalV2Issue,
  rendered: string | RenderedConstraintMetrics,
): string[] {
  const renderedText = typeof rendered === "string" ? rendered : rendered.text;
  const measurements = typeof rendered === "string" ? {} : (rendered.measurements ?? {});
  const normalized = renderedText.toLowerCase();
  const missingPreserves = issue.constraints.preserves.filter(
    (phrase) => !normalized.includes(phrase.toLowerCase()),
  );
  const withinFailures = Object.entries(issue.constraints.within).flatMap(([key, expected]) => {
    const actual = measurements[key];
    if (typeof expected === "number" && actual !== expected) {
      return [`${key}: expected ${expected}, received ${actual ?? "missing"}`];
    }
    if (isRecord(expected)) {
      const min = typeof expected.min === "number" ? expected.min : undefined;
      const max = typeof expected.max === "number" ? expected.max : undefined;
      if (actual === undefined) {
        return [`${key}: expected measurement, received missing`];
      }
      if (min !== undefined && actual < min) {
        return [`${key}: expected >= ${min}, received ${actual}`];
      }
      if (max !== undefined && actual > max) {
        return [`${key}: expected <= ${max}, received ${actual}`];
      }
    }
    return [];
  });
  return [...missingPreserves, ...withinFailures];
}
