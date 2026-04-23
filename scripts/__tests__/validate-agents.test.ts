import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const AGENT_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "scripts/schemas/agent.schema.json"), "utf-8"),
);
const ENV_SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "scripts/schemas/environment.schema.json"), "utf-8"),
);

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats.default(ajv);
  return ajv;
}

describe("agent schema", () => {
  const ajv = buildAjv();
  const validate = ajv.compile(AGENT_SCHEMA);
  const agentsDir = join(ROOT, "agents");
  const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith(".json"));

  test("accepts every committed agent spec", () => {
    expect(agentFiles.length).toBeGreaterThan(0);
    for (const f of agentFiles) {
      const data = JSON.parse(readFileSync(join(agentsDir, f), "utf-8"));
      const ok = validate(data);
      if (!ok) {
        throw new Error(`${f} failed: ${JSON.stringify(validate.errors, null, 2)}`);
      }
      expect(ok).toBe(true);
    }
  });

  test("rejects spec with system_prompt instead of system (the bug from bb789e3)", () => {
    const raw = readFileSync(join(agentsDir, "seo-critic.json"), "utf-8");
    const broken = { ...JSON.parse(raw), system_prompt: "hello" };
    delete (broken as Record<string, unknown>).system;
    const ok = validate(broken);
    expect(ok).toBe(false);
    const errors = validate.errors ?? [];
    const hasAdditional = errors.some(
      (e) =>
        e.keyword === "additionalProperties" &&
        (e.params as { additionalProperty?: string }).additionalProperty === "system_prompt",
    );
    expect(hasAdditional).toBe(true);
  });

  test("rejects spec with callable_agents (research preview)", () => {
    const raw = readFileSync(join(agentsDir, "seo-critic.json"), "utf-8");
    const broken = { ...JSON.parse(raw), callable_agents: ["other-agent"] };
    expect(validate(broken)).toBe(false);
  });

  test("rejects spec with unknown model", () => {
    const raw = readFileSync(join(agentsDir, "seo-critic.json"), "utf-8");
    const broken = { ...JSON.parse(raw), model: "claude-opus-3-5" };
    expect(validate(broken)).toBe(false);
  });

  test("rejects spec with missing required fields", () => {
    const ok = validate({ name: "x-critic" });
    expect(ok).toBe(false);
  });

  test("rejects spec with wrong tool type", () => {
    const raw = readFileSync(join(agentsDir, "seo-critic.json"), "utf-8");
    const broken = { ...JSON.parse(raw), tools: [{ type: "web_search_20241022" }] };
    expect(validate(broken)).toBe(false);
  });
});

describe("environment schema", () => {
  const ajv = buildAjv();
  const validate = ajv.compile(ENV_SCHEMA);
  const envsDir = join(ROOT, "environments");
  const envFiles = readdirSync(envsDir).filter((f) => f.endsWith(".json"));

  test("accepts every committed environment spec", () => {
    expect(envFiles.length).toBeGreaterThan(0);
    for (const f of envFiles) {
      const data = JSON.parse(readFileSync(join(envsDir, f), "utf-8"));
      const ok = validate(data);
      if (!ok) {
        throw new Error(`${f} failed: ${JSON.stringify(validate.errors, null, 2)}`);
      }
      expect(ok).toBe(true);
    }
  });

  test("rejects environment with networking.type = 'open' (invalid enum)", () => {
    const broken = {
      name: "test-env",
      config: {
        type: "cloud",
        networking: { type: "open" },
      },
    };
    expect(validate(broken)).toBe(false);
  });
});
