#!/usr/bin/env bun

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface DecisionIssue {
  owner: string;
  severity: Severity;
  issue: string;
  evidence: string;
  proposed_change: string;
  files_touched: string[];
}

export interface DecisionJSON {
  week: string;
  selected_issues: DecisionIssue[];
}

export interface RawMutation {
  file: string;
  before: string;
  after: string;
}

export interface ProposalIssue {
  index: number;
  severity: Severity;
  title: string;
  files_touched: string[];
  mutations: RawMutation[];
}

export interface MutationResult {
  file: string;
  status: "applied" | "string_mismatch";
  before: string;
  after: string;
}

export interface ApplyExperiment {
  exp_id: string;
  severity: Severity;
  title: string;
  status: "applied" | "skipped";
  mutations: MutationResult[];
  commit_sha?: string;
  skip_reason?: "string_mismatch" | "lint_failure" | "type_failure" | "format_failure";
  skip_details?: Record<string, unknown>;
}

export interface ApplyLogJSON {
  week: string;
  run_timestamp: string;
  experiments: ApplyExperiment[];
  validation_summary: {
    lint_passed: boolean;
    type_check_passed: boolean;
    format_check_passed: boolean;
  };
}

export interface SkipRow {
  ts: string;
  week: string;
  actor: "apply-worker";
  event: "skip";
  exp_id: string;
  reason: "apply-fail" | "string_mismatch" | "lint_failure" | "type_failure" | "format_failure";
  details: Record<string, unknown>;
  concern_ref: string;
}

interface ParsedSection {
  index: number;
  severity: Severity;
  title: string;
  body: string;
}

const SEVERITIES: readonly Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSeverity(value: unknown, fieldName: string): Severity {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${fieldName}: expected one of ${SEVERITIES.join(", ")}`);
  }

  const severity = SEVERITIES.find((candidate) => candidate === value);
  if (!severity) {
    throw new Error(`Invalid ${fieldName}: expected one of ${SEVERITIES.join(", ")}`);
  }

  return severity;
}

function expectString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing or invalid ${fieldName}`);
  }

  return value;
}

function expectStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Missing or invalid ${fieldName}`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.length === 0) {
      throw new Error(`Missing or invalid ${fieldName}[${index}]`);
    }

    return item;
  });
}

function parseDecisionIssue(value: unknown, index: number): DecisionIssue {
  if (!isRecord(value)) {
    throw new Error(`selected_issues[${index}] must be an object`);
  }

  return {
    owner: expectString(value.owner, `selected_issues[${index}].owner`),
    severity: parseSeverity(value.severity, `selected_issues[${index}].severity`),
    issue: expectString(value.issue, `selected_issues[${index}].issue`),
    evidence: expectString(value.evidence, `selected_issues[${index}].evidence`),
    proposed_change: expectString(
      value.proposed_change,
      `selected_issues[${index}].proposed_change`,
    ),
    files_touched: expectStringArray(
      value.files_touched,
      `selected_issues[${index}].files_touched`,
    ),
  };
}

function parseSections(md: string): ParsedSection[] {
  const headingRegex = /^###\s+(\d+)\.\s+\[([^\]]+)\]\s+(.+)$/gm;
  const matches = Array.from(md.matchAll(headingRegex));

  return matches.reduce<ParsedSection[]>((sections, match, index) => {
    const nextMatch = matches[index + 1];
    const rawIndex = match[1];
    const rawSeverityBlock = match[2];
    const rawTitle = match[3];
    const sectionStart = match.index ?? 0;
    const bodyStart = sectionStart + match[0].length;
    const bodyEnd = nextMatch?.index ?? md.length;
    const rawSeverity = rawSeverityBlock?.split("+")[0]?.trim();

    if (!rawIndex || !rawSeverity || !rawTitle) {
      return sections;
    }

    sections.push({
      index: Number.parseInt(rawIndex, 10),
      severity: parseSeverity(rawSeverity, `proposal section ${rawIndex} severity`),
      title: rawTitle.trim(),
      body: md.slice(bodyStart, bodyEnd).trim(),
    });

    return sections;
  }, []);
}

function isFilePath(value: string): boolean {
  return value.includes("/") || /\.[a-z0-9]+$/i.test(value);
}

function parseTargetFiles(sectionBody: string): string[] {
  const targetLine = sectionBody.match(/\*\*Target file\(s\):\*\*\s*(.+)/);
  if (!targetLine || !targetLine[1]) {
    throw new Error("Missing **Target file(s):** line in proposal section");
  }

  const files = Array.from(
    targetLine[1].matchAll(/`([^`]+)`/g),
    (match) => match[1]?.trim() ?? "",
  ).filter((filePath) => filePath.length > 0 && isFilePath(filePath));

  if (files.length === 0) {
    throw new Error("No target files found in proposal section");
  }

  return files;
}

function collectMutationPairs(
  sectionBody: string,
): { before: string; after: string; label: string }[] {
  const pairRegex =
    /(^|\n)(?:\*\*Change[^\n]*\*\*\s*(?:—\s*([^\n]+))?\n+)?Before(?:[^\n]*):\s*\n```[^\n]*\n([\s\S]*?)\n```\s*\nAfter(?:[^\n]*):\s*\n```[^\n]*\n([\s\S]*?)\n```/g;

  return Array.from(sectionBody.matchAll(pairRegex), (match) => ({
    label: match[2]?.trim() ?? "",
    before: match[3] ?? "",
    after: match[4] ?? "",
  }));
}

function scoreFileMatch(filePath: string, label: string): number {
  if (label.length === 0) {
    return 0;
  }

  const normalizedFile = filePath.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const tokens = normalizedLabel.split(/\s+/).filter((token) => token.length >= 3);

  return tokens.reduce((score, token) => {
    return normalizedFile.includes(token) ? score + 1 : score;
  }, 0);
}

function resolveMutationFile(filesTouched: string[], pairIndex: number, label: string): string {
  const scored = filesTouched
    .map((filePath) => ({ filePath, score: scoreFileMatch(filePath, label) }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = scored[0];
  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.filePath;
  }

  return filesTouched[pairIndex] ?? filesTouched[0] ?? "";
}

export function parseDecision(json: unknown): DecisionJSON {
  if (!isRecord(json)) {
    throw new Error("decision.json must be an object");
  }

  if (!Array.isArray(json.selected_issues)) {
    throw new Error("Missing or invalid selected_issues");
  }

  return {
    week: expectString(json.week, "week"),
    selected_issues: json.selected_issues.map((issue, index) => parseDecisionIssue(issue, index)),
  };
}

export function parseProposal(md: string, decision: DecisionJSON): ProposalIssue[] {
  const sections = parseSections(md);
  const sectionsByIndex = new Map(sections.map((section) => [section.index, section]));

  return decision.selected_issues.map((_, decisionIndex) => {
    const proposalIndex = decisionIndex + 1;
    const section = sectionsByIndex.get(proposalIndex);

    if (!section) {
      throw new Error(`Missing proposal section for selected issue #${proposalIndex}`);
    }

    const filesTouched = parseTargetFiles(section.body);
    const pairs = collectMutationPairs(section.body);
    const mutations = pairs.map((pair, pairIndex) => ({
      file: resolveMutationFile(filesTouched, pairIndex, pair.label),
      before: pair.before,
      after: pair.after,
    }));

    return {
      index: proposalIndex,
      severity: section.severity,
      title: section.title,
      files_touched: filesTouched,
      mutations,
    };
  });
}

export async function applyMutation(
  filePath: string,
  before: string,
  after: string,
): Promise<MutationResult> {
  const original = await Bun.file(filePath).text();

  if (!original.includes(before)) {
    return {
      file: filePath,
      status: "string_mismatch",
      before,
      after,
    };
  }

  const mutated = original.replace(before, after);
  await Bun.write(filePath, mutated);

  return {
    file: filePath,
    status: "applied",
    before,
    after,
  };
}
