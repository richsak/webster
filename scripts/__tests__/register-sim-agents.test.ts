import { afterEach, describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadSimAgentSpecs, registerSimAgents } from "../register-sim-agents.ts";

const ROOT = resolve(import.meta.dir, "..", "..");
const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("sim agent specs", () => {
  test("loads exactly 18 sim specs across both substrates", () => {
    const specs = loadSimAgentSpecs();
    expect(specs).toHaveLength(18);
    expect(specs.filter((spec) => spec.name.startsWith("webster-lp-sim-")).length).toBe(9);
    expect(specs.filter((spec) => spec.name.startsWith("webster-site-sim-")).length).toBe(9);
  });

  test("all sim specs validate against the managed-agent schema", () => {
    const schema = JSON.parse(
      readFileSync(join(ROOT, "scripts/schemas/agent.schema.json"), "utf8"),
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats.default(ajv);
    const validate = ajv.compile(schema);

    for (const spec of loadSimAgentSpecs()) {
      const specName = spec.name;
      const ok = validate(spec);
      if (!ok) {
        throw new Error(`${specName}: ${JSON.stringify(validate.errors, null, 2)}`);
      }
      expect(ok).toBe(true);
    }
  });

  test("sim specs are MCP-native and do not reference production URL inputs", () => {
    for (const spec of loadSimAgentSpecs()) {
      expect(spec.system).not.toContain("LP_TARGET");
      expect(spec.system).not.toContain("WebFetch");
      expect(spec.system).toContain("get_file_contents");
      expect(spec.system).toContain("ref=$BRANCH");
      expect(spec.tools.some((tool) => JSON.stringify(tool).includes("mcp_toolset"))).toBe(true);
    }
  });

  test("site set includes licensing-and-warranty instead of fh-compliance", () => {
    const names = loadSimAgentSpecs().map((spec) => spec.name);
    expect(names).toContain("webster-site-sim-licensing-and-warranty-critic");
    expect(names).not.toContain("webster-site-sim-fh-compliance-critic");
  });
});

describe("registerSimAgents", () => {
  test("registers missing sim agents and writes context manifest", async () => {
    const dir = mkdtempSync(join(tmpdir(), "webster-sim-agents-"));
    const outputPath = join(dir, "sim-agents.json");
    const posts: string[] = [];

    globalThis.fetch = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (!init?.method) {
        return jsonResponse({ data: [], has_more: false });
      }
      const body = JSON.parse(String(init.body)) as { name: string };
      posts.push(body.name);
      return jsonResponse({ id: `agent_${posts.length}` });
    }) as typeof fetch;

    try {
      const manifest = await registerSimAgents("test-key", outputPath);

      expect(posts).toHaveLength(18);
      expect(manifest["webster-lp-sim"].monitor).toStartWith("agent_");
      expect(manifest["webster-site-sim"]["licensing-and-warranty-critic"]).toStartWith("agent_");
      expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual(manifest);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent by reusing agent ids found by name", async () => {
    const dir = mkdtempSync(join(tmpdir(), "webster-sim-agents-"));
    const outputPath = join(dir, "sim-agents.json");
    let postCount = 0;
    const existingAgents = loadSimAgentSpecs().map((spec) => ({
      id: `existing_${spec.name}`,
      name: spec.name,
    }));

    globalThis.fetch = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (init?.method === "POST") {
        postCount += 1;
        return jsonResponse({ id: `created_${postCount}` });
      }
      return jsonResponse({ data: existingAgents, has_more: false });
    }) as typeof fetch;

    try {
      await registerSimAgents("test-key", outputPath);

      expect(postCount).toBe(0);
      const manifest = JSON.parse(readFileSync(outputPath, "utf8")) as {
        "webster-lp-sim": Record<string, string>;
      };
      expect(manifest["webster-lp-sim"].monitor).toBe("existing_webster-lp-sim-monitor");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fails loudly if the sim spec count is incomplete", async () => {
    const dir = mkdtempSync(join(tmpdir(), "webster-sim-agents-"));
    const agentsDir = join(dir, "agents");
    const outputPath = join(dir, "sim-agents.json");
    const spec = loadSimAgentSpecs()[0];
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, `${spec?.name ?? "webster-lp-sim-monitor"}.json`),
      JSON.stringify(spec),
    );

    try {
      await expect(registerSimAgents("test-key", outputPath, agentsDir)).rejects.toThrow(
        "expected 18 sim agent specs",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
