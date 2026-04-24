#!/usr/bin/env bun

import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  applyMutation,
  buildCommitMessage,
  buildExpectedExperimentId,
  commitExperiment,
  emitSkip,
  parseDecision,
  parseProposal,
  runCriticRerunGate,
  runRuntimeValidation,
  runValidation,
  writeApplyLog,
  type ApplyExperiment,
  type ApplyLogJSON,
  type MutationResult,
  type ProposalIssue,
  type SkipRow,
  type ValidationResult,
} from "./apply-worker";

class CLIError extends Error {}

interface CLIArgs {
  weekDir: string;
}

function printUsage(): void {
  console.error("Usage: bun scripts/apply-worker-cli.ts <history/week-dir>");
}

function parseArgs(argv: string[]): CLIArgs {
  if (argv.length !== 1 || argv[0] === "--help" || argv[0] === "-h") {
    throw new CLIError(
      argv[0] === "--help" || argv[0] === "-h" ? "help" : "missing week directory",
    );
  }

  return { weekDir: argv[0] ?? "" };
}

function requireFile(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new CLIError(`missing ${label}: ${path}`);
  }
}

function requireDirectory(path: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new CLIError(`missing week directory: ${path}`);
  }
}

function restoreFiles(files: string[]): void {
  if (files.length === 0) {
    return;
  }

  const result = Bun.spawnSync(["git", "checkout", "--", ...files], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    const stderr = new TextDecoder().decode(result.stderr).trim();
    throw new Error(
      `git checkout failed while restoring skipped experiment files\n${stderr}`.trim(),
    );
  }
}

function validationSkipReason(
  validation: ValidationResult,
): "lint_failure" | "type_failure" | "format_failure" | undefined {
  if (!validation.lintPassed) {
    return "lint_failure";
  }
  if (!validation.typeCheckPassed) {
    return "type_failure";
  }
  if (!validation.formatCheckPassed) {
    return "format_failure";
  }

  return undefined;
}

function buildSkipRow(
  week: string,
  expId: string,
  reason: SkipRow["reason"],
  details: Record<string, unknown>,
  issue: ProposalIssue,
): SkipRow {
  return {
    ts: new Date().toISOString(),
    week,
    actor: "apply-worker",
    event: "skip",
    exp_id: expId,
    reason,
    details,
    concern_ref: `proposal.md#issue-${issue.index}`,
  };
}

async function applyIssue(
  weekDir: string,
  week: string,
  issue: ProposalIssue,
): Promise<ApplyExperiment> {
  const expId = buildExpectedExperimentId(issue.index, issue.title);
  console.log(`applying ${expId}: ${issue.title}`);

  const mutations: MutationResult[] = [];
  for (const mutation of issue.mutations) {
    mutations.push(await applyMutation(mutation.file, mutation.before, mutation.after));
  }

  const mismatches = mutations.filter((mutation) => mutation.status === "string_mismatch");
  if (mismatches.length > 0) {
    restoreFiles(issue.files_touched);
    const details = { files: mismatches.map((mutation) => mutation.file) };
    emitSkip(weekDir, buildSkipRow(week, expId, "string_mismatch", details, issue));
    console.error(`skipped ${expId}: string_mismatch`);

    return {
      exp_id: expId,
      severity: issue.severity,
      title: issue.title,
      status: "skipped",
      mutations,
      skip_reason: "string_mismatch",
      skip_details: details,
    };
  }

  const validation = runValidation();
  const skipReason = validationSkipReason(validation);
  if (skipReason) {
    restoreFiles(issue.files_touched);
    const details = { validation_output: validation.output };
    emitSkip(weekDir, buildSkipRow(week, expId, skipReason, details, issue));
    console.error(`skipped ${expId}: ${skipReason}`);

    return {
      exp_id: expId,
      severity: issue.severity,
      title: issue.title,
      status: "skipped",
      mutations,
      skip_reason: skipReason,
      skip_details: details,
    };
  }

  const runtimeValidation = runRuntimeValidation(issue.files_touched);
  if (!runtimeValidation.passed) {
    restoreFiles(issue.files_touched);
    const details = {
      checks: runtimeValidation.checks,
      errors: runtimeValidation.errors,
    };
    emitSkip(weekDir, buildSkipRow(week, expId, "runtime_failure", details, issue));
    console.error(`skipped ${expId}: runtime_failure`);

    return {
      exp_id: expId,
      severity: issue.severity,
      title: issue.title,
      status: "skipped",
      mutations,
      skip_reason: "runtime_failure",
      skip_details: details,
    };
  }

  const criticRerun = runCriticRerunGate(weekDir, expId, issue.files_touched);
  if (!criticRerun.passed) {
    restoreFiles(issue.files_touched);
    const details = {
      configured: criticRerun.configured,
      critical_count: criticRerun.criticalCount,
      high_count: criticRerun.highCount,
      findings: criticRerun.findings,
      output: criticRerun.output,
    };
    emitSkip(weekDir, buildSkipRow(week, expId, "critic_veto", details, issue));
    console.error(`skipped ${expId}: critic_veto`);

    return {
      exp_id: expId,
      severity: issue.severity,
      title: issue.title,
      status: "skipped",
      mutations,
      skip_reason: "critic_veto",
      skip_details: details,
    };
  }

  const message = buildCommitMessage(expId, issue.index, issue.title, issue.files_touched);
  const commitSha = commitExperiment(issue.files_touched, message);
  console.log(`committed ${expId}: ${commitSha}`);

  return {
    exp_id: expId,
    severity: issue.severity,
    title: issue.title,
    status: "applied",
    mutations,
    commit_sha: commitSha,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(Bun.argv.slice(2));
  const proposalPath = join(args.weekDir, "proposal.md");
  const decisionPath = join(args.weekDir, "decision.json");

  requireDirectory(args.weekDir);
  requireFile(proposalPath, "proposal.md");
  requireFile(decisionPath, "decision.json");

  const decision = parseDecision(await Bun.file(decisionPath).json());
  const proposal = await Bun.file(proposalPath).text();
  const issues = parseProposal(proposal, decision);
  const experiments: ApplyExperiment[] = [];
  const validationSummary = {
    lint_passed: true,
    type_check_passed: true,
    format_check_passed: true,
    runtime_validation_passed: true,
    critic_rerun_passed: true,
  };

  for (const issue of issues) {
    const experiment = await applyIssue(args.weekDir, decision.week, issue);
    experiments.push(experiment);
    if (experiment.skip_reason === "lint_failure") {
      validationSummary.lint_passed = false;
    }
    if (experiment.skip_reason === "type_failure") {
      validationSummary.type_check_passed = false;
    }
    if (experiment.skip_reason === "format_failure") {
      validationSummary.format_check_passed = false;
    }
    if (experiment.skip_reason === "runtime_failure") {
      validationSummary.runtime_validation_passed = false;
    }
    if (experiment.skip_reason === "critic_veto") {
      validationSummary.critic_rerun_passed = false;
    }
  }

  const log: ApplyLogJSON = {
    week: decision.week,
    run_timestamp: new Date().toISOString(),
    experiments,
    validation_summary: validationSummary,
  };
  writeApplyLog(args.weekDir, log);
  console.log(`wrote ${join(args.weekDir, "apply-log.json")}`);

  return 0;
}

if (import.meta.main) {
  try {
    const code = await main();
    process.exit(code);
  } catch (err) {
    if (err instanceof CLIError) {
      if (err.message === "help") {
        printUsage();
        process.exit(0);
      }
      console.error(`ERROR: ${err.message}`);
      printUsage();
      process.exit(2);
    }
    const e = err as Error;
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
  }
}

export { CLIError, applyIssue, main, parseArgs };
