#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appendEvent } from "./memory.ts";

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
  skip_reason?:
    | "string_mismatch"
    | "lint_failure"
    | "type_failure"
    | "format_failure"
    | "runtime_failure"
    | "critic_veto";
  skip_details?: Record<string, unknown>;
}

export interface PrCluster {
  id: string;
  experiment_ids: string[];
  files_touched: string[];
  labels: string[];
  draft: boolean;
  title: string;
  body: string;
}

export interface PrEmissionPlan {
  mode: "plan-only" | "emitted";
  max_prs: 3;
  clusters: PrCluster[];
  skipped_experiment_ids: string[];
}

export interface VisualReviewGateResult {
  passed: boolean;
  configured: boolean;
  iterations: number;
  criticalCount: number;
  findings: { severity: Severity; issue: string; evidence?: string }[];
  output: string;
}

export interface PreviewDeployment {
  preview_url?: string;
  analytics_scrub: {
    enabled: boolean;
    marker: 'data-preview="1"';
  };
  noindex: {
    required: boolean;
    verified: boolean;
  };
}

export interface ApplyLogJSON {
  week: string;
  run_timestamp: string;
  experiments: ApplyExperiment[];
  validation_summary: {
    lint_passed: boolean;
    type_check_passed: boolean;
    format_check_passed: boolean;
    runtime_validation_passed: boolean;
    critic_rerun_passed: boolean;
  };
  pr_emission?: PrEmissionPlan;
  visual_review?: VisualReviewGateResult;
  preview_deployment?: PreviewDeployment;
}

export type StoredSkipReason = "apply-fail" | "critic-veto" | "visual-veto";

export type SkipReasonInput =
  | StoredSkipReason
  | "string_mismatch"
  | "lint_failure"
  | "type_failure"
  | "format_failure"
  | "runtime_failure"
  | "critic_veto"
  | "visual_veto";

export interface SkipRow {
  ts: string;
  week: string;
  actor: "apply-worker";
  event: "skip";
  exp_id: string;
  reason: StoredSkipReason;
  details: Record<string, unknown>;
  concern_ref: string;
}

export interface SkipInputRow extends Omit<SkipRow, "reason"> {
  reason: SkipReasonInput;
}

export interface ValidationResult {
  lintPassed: boolean;
  typeCheckPassed: boolean;
  formatCheckPassed: boolean;
  output: string;
}

export interface RuntimeValidationResult {
  passed: boolean;
  checks: {
    ctasResolve: boolean;
    noMissingLocalScripts: boolean;
    noInlineScriptErrors: boolean;
  };
  errors: string[];
}

export interface CriticFinding {
  critic: string;
  severity: Severity;
  issue: string;
}

export interface CriticRerunResult {
  passed: boolean;
  configured: boolean;
  criticalCount: number;
  highCount: number;
  findings: CriticFinding[];
  output: string;
}

interface ParsedSection {
  index: number;
  severity: Severity;
  title: string;
  body: string;
}

const SEVERITIES: readonly Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const EXPERIMENT_ID_PATTERN = /^exp-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

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

function decodeOutput(output: Uint8Array<ArrayBufferLike>): string {
  return new TextDecoder().decode(output).trim();
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return slug.length > 0 ? slug : "experiment";
}

export function buildExpectedExperimentId(index: number, title: string): string {
  return `exp-${index.toString().padStart(2, "0")}-${slugifyTitle(title)}`;
}

function runCommand(
  command: string[],
  env?: Record<string, string>,
): { passed: boolean; output: string } {
  const result = Bun.spawnSync(command, {
    stdout: "pipe",
    stderr: "pipe",
    env: env ? { ...process.env, ...env } : process.env,
  });
  const stdout = decodeOutput(result.stdout);
  const stderr = decodeOutput(result.stderr);
  const lines = [`$ ${command.join(" ")}`, `exitCode: ${result.exitCode}`];

  if (stdout.length > 0) {
    lines.push(`stdout:\n${stdout}`);
  }

  if (stderr.length > 0) {
    lines.push(`stderr:\n${stderr}`);
  }

  return {
    passed: result.exitCode === 0,
    output: lines.join("\n"),
  };
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

export function runValidation(): ValidationResult {
  const lintResult = runCommand(["bun", "run", "lint", "--max-warnings", "0"]);
  const typeCheckResult = runCommand(["bun", "run", "type-check"]);
  const formatCheckResult = runCommand(["bun", "run", "format:check"]);

  return {
    lintPassed: lintResult.passed,
    typeCheckPassed: typeCheckResult.passed,
    formatCheckPassed: formatCheckResult.passed,
    output: [lintResult.output, typeCheckResult.output, formatCheckResult.output].join("\n\n"),
  };
}

function extractAnchorTags(source: string): string[] {
  return Array.from(
    source.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>|<a\b[^>]*>/gi),
    (match) => match[0] ?? "",
  );
}

function extractAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2];
}

function isBookingCta(tag: string): boolean {
  return /book\s+(your\s+)?(free\s+)?(strategy\s+)?call/i.test(tag);
}

function validateCtasResolve(file: string, source: string): string[] {
  return extractAnchorTags(source).flatMap((tag) => {
    if (!isBookingCta(tag)) {
      return [];
    }

    const href = extractAttribute(tag, "href");
    if (!href || href === "#" || href.startsWith("javascript:")) {
      return [`${file}: booking CTA has non-resolving href (${href ?? "missing"})`];
    }

    if (!/^https:\/\/app\.acuityscheduling\.com\/schedule\.php\?owner=\d+/.test(href)) {
      return [`${file}: booking CTA does not resolve to the canonical Acuity booking URL`];
    }

    return [];
  });
}

function validateLocalScripts(file: string, source: string): string[] {
  return Array.from(source.matchAll(/<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi)).flatMap(
    (match) => {
      const src = match[2] ?? "";
      if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:")) {
        return [];
      }

      const scriptPath = resolve(process.cwd(), src.startsWith("/") ? src.slice(1) : src);
      return existsSync(scriptPath) ? [] : [`${file}: local script src is missing (${src})`];
    },
  );
}

function validateInlineScripts(file: string, source: string): string[] {
  return Array.from(
    source.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
  ).flatMap((match) => {
    const body = match[1] ?? "";
    return /throw\s+new\s+Error|console\.error\s*\(/.test(body)
      ? [`${file}: inline script contains an explicit runtime error path`]
      : [];
  });
}

export function runRuntimeValidation(files: string[]): RuntimeValidationResult {
  const targetFiles = files.filter((file) => /\.(astro|html|tsx|jsx|ts|js)$/i.test(file));
  const errors = targetFiles.flatMap((file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    return [
      ...validateCtasResolve(file, source),
      ...validateLocalScripts(file, source),
      ...validateInlineScripts(file, source),
    ];
  });

  return {
    passed: errors.length === 0,
    checks: {
      ctasResolve: !errors.some((error) => error.includes("booking CTA")),
      noMissingLocalScripts: !errors.some((error) => error.includes("local script")),
      noInlineScriptErrors: !errors.some((error) => error.includes("inline script")),
    },
    errors,
  };
}

function parseCriticFindings(value: unknown): CriticFinding[] {
  if (!isRecord(value) || !Array.isArray(value.findings)) {
    throw new Error("critic rerun output must be JSON with a findings array");
  }

  return value.findings.map((finding, index) => {
    if (!isRecord(finding)) {
      throw new Error(`critic finding ${index} must be an object`);
    }

    return {
      critic: expectString(finding.critic, `findings[${index}].critic`),
      severity: parseSeverity(finding.severity, `findings[${index}].severity`),
      issue: expectString(finding.issue, `findings[${index}].issue`),
    };
  });
}

export function runCriticRerunGate(
  weekDir: string,
  expId: string,
  files: string[],
): CriticRerunResult {
  const command = process.env.WEBSTER_CRITIC_RERUN_CMD;
  if (!command || command.trim().length === 0) {
    return {
      passed: true,
      configured: false,
      criticalCount: 0,
      highCount: 0,
      findings: [],
      output: "WEBSTER_CRITIC_RERUN_CMD not configured; managed-agent rerun skipped locally.",
    };
  }

  const result = Bun.spawnSync(["bash", "-lc", command], {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      WEBSTER_WEEK_DIR: weekDir,
      WEBSTER_EXPERIMENT_ID: expId,
      WEBSTER_CHANGED_FILES: files.join("\n"),
    },
  });
  const stdout = decodeOutput(result.stdout);
  const stderr = decodeOutput(result.stderr);
  const output = [stdout, stderr].filter((part) => part.length > 0).join("\n");

  if (result.exitCode !== 0) {
    return {
      passed: false,
      configured: true,
      criticalCount: 1,
      highCount: 0,
      findings: [
        {
          critic: "critic-rerun-command",
          severity: "CRITICAL",
          issue: "Critic rerun command exited non-zero.",
        },
      ],
      output,
    };
  }

  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) {
    return {
      passed: false,
      configured: true,
      criticalCount: 1,
      highCount: 0,
      findings: [
        {
          critic: "critic-rerun-command",
          severity: "CRITICAL",
          issue: "Critic rerun command did not emit JSON findings.",
        },
      ],
      output,
    };
  }

  let findings: CriticFinding[];
  try {
    findings = parseCriticFindings(JSON.parse(stdout.slice(jsonStart)));
  } catch {
    return {
      passed: false,
      configured: true,
      criticalCount: 1,
      highCount: 0,
      findings: [
        {
          critic: "critic-rerun-command",
          severity: "CRITICAL",
          issue: "Critic rerun command emitted invalid JSON findings.",
        },
      ],
      output,
    };
  }

  const criticalCount = findings.filter((finding) => finding.severity === "CRITICAL").length;
  const highCount = findings.filter((finding) => finding.severity === "HIGH").length;

  return {
    passed: criticalCount === 0 && highCount <= 2,
    configured: true,
    criticalCount,
    highCount,
    findings,
    output,
  };
}

export function buildCommitMessage(
  expId: string,
  index: number,
  title: string,
  files: string[],
): string {
  const expectedExpId = buildExpectedExperimentId(index, title);
  const expIdMatch = expId.match(EXPERIMENT_ID_PATTERN);

  if (!expIdMatch || expId !== expectedExpId) {
    throw new Error(`Invalid experiment id. Expected ${expectedExpId}, received ${expId}`);
  }

  return [
    `feat(apply): ${slugifyTitle(title)}`,
    "",
    `Redesigner proposal issue #${index}: ${title}`,
    `Files touched: ${files.join(", ")}`,
    "",
    `Experiment-Id: ${expId}`,
  ].join("\n");
}

export function commitExperiment(files: string[], message: string): string {
  if (files.length === 0) {
    throw new Error("Cannot commit experiment with no files");
  }

  const addResult = Bun.spawnSync(["git", "add", ...files], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (addResult.exitCode !== 0) {
    const addOutput = [decodeOutput(addResult.stdout), decodeOutput(addResult.stderr)]
      .filter((part) => part.length > 0)
      .join("\n");
    throw new Error(`git add failed\n${addOutput}`.trim());
  }

  const commitResult = Bun.spawnSync(["git", "commit", "-m", message], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const commitOutput = [decodeOutput(commitResult.stdout), decodeOutput(commitResult.stderr)]
    .filter((part) => part.length > 0)
    .join("\n");

  if (commitResult.exitCode !== 0) {
    throw new Error(`git commit failed\n${commitOutput}`.trim());
  }

  const shaMatch = commitOutput.match(/\[[^\]]+ ([0-9a-f]+)\]/i);
  if (!shaMatch || !shaMatch[1]) {
    throw new Error(`Unable to parse commit SHA from git output\n${commitOutput}`.trim());
  }

  return shaMatch[1];
}

function resolveWeekFilePath(weekDir: string, fileName: string): string {
  return resolve(process.cwd(), weekDir, fileName);
}

function appendJsonLine(filePath: string, row: unknown): void {
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(filePath, `${prefix}${JSON.stringify(row)}\n`);
}

function canonicalSkipReason(reason: SkipReasonInput): StoredSkipReason {
  if (reason === "critic_veto") {
    return "critic-veto";
  }
  if (reason === "visual_veto" || reason === "runtime_failure") {
    return "visual-veto";
  }
  return "apply-fail";
}

export function emitSkip(weekDir: string, row: SkipInputRow): void {
  const resolvedWeekDir = resolve(process.cwd(), weekDir);
  mkdirSync(resolvedWeekDir, { recursive: true });
  const canonicalRow = { ...row, reason: canonicalSkipReason(row.reason) };

  appendJsonLine(resolveWeekFilePath(weekDir, "skips.jsonl"), canonicalRow);
  appendEvent(
    {
      ts: canonicalRow.ts,
      week: canonicalRow.week,
      actor: canonicalRow.actor,
      event: "skip",
      refs: { exp_id: canonicalRow.exp_id, concern_ref: canonicalRow.concern_ref },
      insight: `${canonicalRow.reason}: ${JSON.stringify(canonicalRow.details)}`,
    },
    resolve(process.cwd(), "history", "memory.jsonl"),
  );
}

function experimentFiles(experiment: ApplyExperiment): string[] {
  return Array.from(new Set(experiment.mutations.map((mutation) => mutation.file))).sort();
}

function experimentsOverlap(left: ApplyExperiment, right: ApplyExperiment): boolean {
  const rightFiles = new Set(experimentFiles(right));
  return experimentFiles(left).some((file) => rightFiles.has(file));
}

function buildClusterBody(experiments: ApplyExperiment[]): string {
  return experiments
    .map((experiment) => {
      const status =
        experiment.status === "skipped" ? `skipped: ${experiment.skip_reason}` : "applied";
      return `- ${experiment.exp_id} (${experiment.severity}, ${status}): ${experiment.title}`;
    })
    .join("\n");
}

function isPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function parseVisualReviewFindings(
  output: string,
): { severity: Severity; issue: string; evidence?: string }[] {
  const jsonStart = output.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(output.slice(jsonStart)) as { findings?: unknown };
      if (Array.isArray(parsed.findings)) {
        return parsed.findings.flatMap((finding) => {
          if (!isRecord(finding)) {
            return [];
          }
          return [
            {
              severity: parseSeverity(finding.severity, "visual_review.finding.severity"),
              issue: expectString(finding.issue, "visual_review.finding.issue"),
              evidence: typeof finding.evidence === "string" ? finding.evidence : undefined,
            },
          ];
        });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }

  return Array.from(output.matchAll(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s+([^\n]+)/g), (match) => ({
    severity: match[1] as Severity,
    issue: (match[2] ?? "").trim(),
  }));
}

export function runVisualReviewGate(maxIterations = 3): VisualReviewGateResult {
  const command = process.env.WEBSTER_VISUAL_REVIEW_CMD;
  if (!command || command.trim().length === 0) {
    return {
      passed: true,
      configured: false,
      iterations: 0,
      criticalCount: 0,
      findings: [],
      output: "WEBSTER_VISUAL_REVIEW_CMD not configured; visual-reviewer gate skipped locally.",
    };
  }

  let output = "";
  let findings: { severity: Severity; issue: string; evidence?: string }[] = [];
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const result = Bun.spawnSync(["bash", "-lc", command], {
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, WEBSTER_VISUAL_REVIEW_ITERATION: String(iteration) },
    });
    output = [decodeOutput(result.stdout), decodeOutput(result.stderr)]
      .filter((part) => part.length > 0)
      .join("\n");

    if (result.exitCode !== 0) {
      findings = [{ severity: "CRITICAL", issue: "Visual reviewer command exited non-zero." }];
    } else {
      findings = parseVisualReviewFindings(output);
    }

    const criticalCount = findings.filter((finding) => finding.severity === "CRITICAL").length;
    if (criticalCount === 0) {
      return {
        passed: true,
        configured: true,
        iterations: iteration,
        criticalCount,
        findings,
        output,
      };
    }
  }

  const criticalCount = findings.filter((finding) => finding.severity === "CRITICAL").length;
  return {
    passed: false,
    configured: true,
    iterations: maxIterations,
    criticalCount,
    findings,
    output,
  };
}

export function buildPreviewDeployment(
  previewUrl = process.env.WEBSTER_CF_PAGES_PREVIEW_URL,
): PreviewDeployment {
  const hasPreviewUrl = typeof previewUrl === "string" && previewUrl.trim().length > 0;
  const verified = hasPreviewUrl ? isPreviewUrl(previewUrl.trim()) : false;

  return {
    ...(hasPreviewUrl ? { preview_url: previewUrl.trim() } : {}),
    analytics_scrub: {
      enabled: hasPreviewUrl,
      marker: 'data-preview="1"',
    },
    noindex: {
      required: hasPreviewUrl,
      verified,
    },
  };
}

export function buildPrEmissionPlan(experiments: ApplyExperiment[]): PrEmissionPlan {
  const roots = experiments.map((_, index) => index);
  const find = (index: number): number => {
    while (roots[index] !== index) {
      roots[index] = roots[roots[index] as number] as number;
      index = roots[index] as number;
    }
    return index;
  };
  const union = (left: number, right: number): void => {
    roots[find(right)] = find(left);
  };

  for (let left = 0; left < experiments.length; left += 1) {
    for (let right = left + 1; right < experiments.length; right += 1) {
      if (
        experimentsOverlap(
          experiments[left] as ApplyExperiment,
          experiments[right] as ApplyExperiment,
        )
      ) {
        union(left, right);
      }
    }
  }

  const grouped = new Map<number, ApplyExperiment[]>();
  experiments.forEach((experiment, index) => {
    const root = find(index);
    grouped.set(root, [...(grouped.get(root) ?? []), experiment]);
  });

  const chunks = Array.from(grouped.values()).flatMap((group) => {
    const sorted = [...group].sort((left, right) => left.exp_id.localeCompare(right.exp_id));
    const output: ApplyExperiment[][] = [];
    for (let index = 0; index < sorted.length; index += 3) {
      output.push(sorted.slice(index, index + 3));
    }
    return output;
  });

  const selectedChunks = chunks.slice(0, 3);
  const skippedExperimentIds = experiments
    .filter((experiment) => experiment.status === "skipped")
    .map((experiment) => experiment.exp_id);

  return {
    mode: "plan-only",
    max_prs: 3,
    skipped_experiment_ids: skippedExperimentIds,
    clusters: selectedChunks.map((chunk, index) => {
      const hasSkipped = chunk.some((experiment) => experiment.status === "skipped");
      const hasCriticalSkipped = chunk.some(
        (experiment) => experiment.status === "skipped" && experiment.severity === "CRITICAL",
      );
      const labels = ["webster-apply", ...(hasSkipped ? ["partial"] : [])];
      return {
        id: `cluster-${(index + 1).toString().padStart(2, "0")}`,
        experiment_ids: chunk.map((experiment) => experiment.exp_id),
        files_touched: Array.from(new Set(chunk.flatMap(experimentFiles))).sort(),
        labels,
        draft: hasCriticalSkipped,
        title: `${hasSkipped ? "[partial] " : ""}Webster apply cluster ${index + 1}`,
        body: buildClusterBody(chunk),
      };
    }),
  };
}

export function writeApplyLog(weekDir: string, log: ApplyLogJSON): void {
  const resolvedWeekDir = resolve(process.cwd(), weekDir);
  mkdirSync(resolvedWeekDir, { recursive: true });
  writeFileSync(
    resolveWeekFilePath(weekDir, "apply-log.json"),
    `${JSON.stringify(log, null, 2)}\n`,
  );
}
