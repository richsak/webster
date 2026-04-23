#!/usr/bin/env bun
/**
 * Validate findings.md files produced by critics.
 *
 * Contract (per skills/webster-lp-audit/SKILL.md):
 *   - H1 header starting with "# Findings"
 *   - "## Issues" section (required; may be empty for "no runs yet" stubs)
 *   - Each issue entry tagged [CRITICAL] | [HIGH] | [MEDIUM] | [LOW]
 *   - "## Out of scope" section (required; may be empty)
 *
 * Stubs with the literal "No runs yet." phrase are accepted without issue-body checks
 * so newly-created stubs don't fail CI before the first council run.
 */

import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SEVERITY_TAGS = ["[CRITICAL]", "[HIGH]", "[MEDIUM]", "[LOW]"] as const;

interface CheckResult {
  file: string;
  ok: boolean;
  errors: string[];
}

function validateFindingsFile(file: string): CheckResult {
  const raw = readFileSync(file, "utf-8");
  const errors: string[] = [];

  if (!/^# Findings\b/m.test(raw)) {
    errors.push("  missing '# Findings' H1 header");
  }

  const isStub = /No runs yet\./.test(raw);
  if (isStub) {
    return { file, ok: errors.length === 0, errors };
  }

  if (!/^## Issues\s*$/m.test(raw)) {
    errors.push("  missing '## Issues' section");
  }

  if (!/^## Out of scope\s*$/m.test(raw)) {
    errors.push("  missing '## Out of scope' section");
  }

  const hasSeverity = SEVERITY_TAGS.some((tag) => raw.includes(tag));
  if (!hasSeverity) {
    errors.push(
      `  no severity tags found — at least one [CRITICAL|HIGH|MEDIUM|LOW] expected in non-stub findings`,
    );
  }

  return { file, ok: errors.length === 0, errors };
}

function validateAlertsFile(file: string): CheckResult {
  const raw = readFileSync(file, "utf-8");
  const errors: string[] = [];
  if (!/^# Alerts\b/m.test(raw)) {
    errors.push("  missing '# Alerts' H1 header");
  }
  return { file, ok: errors.length === 0, errors };
}

async function collect(pattern: string): Promise<string[]> {
  const files: string[] = [];
  for await (const f of glob(pattern, { cwd: ROOT })) {
    files.push(resolve(ROOT, f));
  }
  return files;
}

async function main(): Promise<number> {
  const findingsFiles = await collect("context/critics/*/findings.md");
  const alertsFiles = await collect("context/monitor/alerts.md");

  const results: CheckResult[] = [
    ...findingsFiles.map(validateFindingsFile),
    ...alertsFiles.map(validateAlertsFile),
  ];

  if (results.length === 0) {
    console.log("(no findings files yet — skipping)");
    return 0;
  }

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const r of passed) {
    console.log(`✓ ${r.file.replace(`${ROOT}/`, "")}`);
  }
  for (const r of failed) {
    console.error(`✗ ${r.file.replace(`${ROOT}/`, "")}`);
    for (const line of r.errors) {
      console.error(line);
    }
  }

  console.log("");
  console.log(`${passed.length} valid, ${failed.length} invalid`);
  return failed.length === 0 ? 0 : 1;
}

process.exit(await main());
