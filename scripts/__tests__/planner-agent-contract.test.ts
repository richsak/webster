import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const AGENT_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "scripts/schemas/agent.schema.json"), "utf-8"),
);
const PLANNER_SPEC = JSON.parse(
  readFileSync(join(ROOT, "agents/webster-planner.json"), "utf-8"),
) as { system: string; tools: { type: string }[] } & Record<string, unknown>;
const SYSTEM_PROMPT = PLANNER_SPEC.system;

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats.default(ajv);
  return ajv;
}

describe("webster-planner plan.md contract", () => {
  test("names every required plan.md JSON output field", () => {
    for (const field of [
      "classification",
      "next_action",
      "direction_hint",
      "new_critic_request",
      "rationale",
    ]) {
      expect(SYSTEM_PROMPT).toContain(field);
    }
  });

  test("lists every allowed next_action value", () => {
    for (const action of [
      "promote_and_experiment",
      "hold_baseline",
      "revert_and_retry",
      "explore_broadly",
    ]) {
      expect(SYSTEM_PROMPT).toContain(action);
    }
  });

  test("ties week-1 or no-prior-verdict cold starts to explore_broadly", () => {
    expect(SYSTEM_PROMPT).toMatch(/week 1/i);
    expect(SYSTEM_PROMPT).toMatch(/no prior verdict/i);
    expect(SYSTEM_PROMPT).toMatch(/cold start/i);
    expect(SYSTEM_PROMPT).toMatch(/cold start[\s\S]*explore_broadly/i);
  });

  test("names all orchestrator-supplied input context sources", () => {
    expect(SYSTEM_PROMPT).toContain("memory.jsonl");
    expect(SYSTEM_PROMPT).toMatch(/verdict/i);
    expect(SYSTEM_PROMPT).toMatch(/monitor (anomaly report|alerts)/i);
  });
});

describe("webster-planner Managed Agents registration shape", () => {
  test("validates webster-planner.json against agent.schema.json with AJV 2020", () => {
    const ajv = buildAjv();
    const validate = ajv.compile(AGENT_SCHEMA);
    const ok = validate(PLANNER_SPEC);
    if (!ok) {
      throw new Error(`planner schema errors: ${JSON.stringify(validate.errors, null, 2)}`);
    }
    expect(ok).toBe(true);
  });

  test("uses POST /v1/agents-compatible top-level fields and excludes callable_agents", () => {
    expect(Object.keys(PLANNER_SPEC).sort()).toEqual([
      "description",
      "metadata",
      "model",
      "name",
      "system",
      "tools",
    ]);
    expect(PLANNER_SPEC).not.toHaveProperty("callable_agents");
    expect(PLANNER_SPEC).not.toHaveProperty("system_prompt");
  });

  test("includes Managed Agents beta agent_toolset_20260401", () => {
    expect(PLANNER_SPEC.tools).toContainEqual({ type: "agent_toolset_20260401" });
  });

  test("matches critic-genealogy registration/session flow: find/register agent, create session, send user.message, poll until idle", () => {
    expect(PLANNER_SPEC.name).toBe("webster-planner");
    expect(PLANNER_SPEC.system).toContain("user.message");
    expect(PLANNER_SPEC.system).toContain(
      "Feature #52 owns planner invocation and persisting plan.md",
    );
  });
});
