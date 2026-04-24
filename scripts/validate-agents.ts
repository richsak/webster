#!/usr/bin/env bun
/**
 * Validate every agent spec under agents/*.json against the managed-agents JSON schema.
 * Also validate environments/*.json against the environment schema.
 *
 * Exits non-zero if any spec fails. Intended as a pre-commit and CI gate.
 */

import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const AGENT_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "scripts/schemas/agent.schema.json"), "utf-8"),
);
const ENV_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "scripts/schemas/environment.schema.json"), "utf-8"),
);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const validateAgent = ajv.compile(AGENT_SCHEMA);
const validateEnv = ajv.compile(ENV_SCHEMA);

const KNOWN_TYPO_HINTS: Record<string, string> = {
  system_prompt: "Field is 'system', not 'system_prompt'. The live API rejects 'system_prompt'.",
  systemPrompt: "Field is 'system' (snake_case is not used; the canonical name is just 'system').",
  toolset: "Field is 'tools' (an array), not 'toolset' (scalar).",
  model_id: "Field is 'model', not 'model_id'.",
  callable_agents:
    "callable_agents is research preview — use orchestrator fan-out instead (see ARCHITECTURE.md).",
};

interface CheckResult {
  file: string;
  ok: boolean;
  errors: string[];
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  return errors.map((e) => {
    const path = e.instancePath || "(root)";
    const base = `  ${path} ${e.message ?? "invalid"}`;
    if (e.keyword === "additionalProperties") {
      const extra = (e.params as { additionalProperty?: string }).additionalProperty;
      if (extra && KNOWN_TYPO_HINTS[extra]) {
        return `${base} — unknown field '${extra}'\n      HINT: ${KNOWN_TYPO_HINTS[extra]}`;
      }
      return `${base} — unknown field '${extra}'`;
    }
    return base;
  });
}

function validateFile(file: string, validator: typeof validateAgent): CheckResult {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf-8"));
  } catch (err) {
    return {
      file,
      ok: false,
      errors: [`  JSON parse error: ${(err as Error).message}`],
    };
  }
  const ok = validator(data);
  if (ok) {
    return { file, ok: true, errors: [] };
  }
  return {
    file,
    ok: false,
    errors: formatErrors(validator.errors),
  };
}

function main(): number {
  const results: CheckResult[] = [];

  const agentsDir = join(ROOT, "agents");
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(agentsDir, f));
    for (const f of agentFiles) {
      results.push(validateFile(f, validateAgent));
    }
  }

  const envsDir = join(ROOT, "environments");
  if (existsSync(envsDir)) {
    const envFiles = readdirSync(envsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(envsDir, f));
    for (const f of envFiles) {
      results.push(validateFile(f, validateEnv));
    }
  }

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

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

  if (results.length === 0) {
    console.error("ERROR: no specs found under agents/ or environments/");
    return 1;
  }
  return failed.length === 0 ? 0 : 1;
}

process.exit(main());
