import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const PLANNER_SPEC = JSON.parse(
  readFileSync(join(ROOT, "agents/webster-planner.json"), "utf-8"),
) as { system: string };
const SYSTEM_PROMPT = PLANNER_SPEC.system;

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
