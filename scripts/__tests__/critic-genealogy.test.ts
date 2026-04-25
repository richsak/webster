import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  CLIError,
  archiveIdleSpawnedCritics,
  buildGapPrompt,
  buildSystemPrompt,
  countRecentGenealogySpawns,
  evaluateCriticDedup,
  evaluateQuarterlyCap,
  fetchAndPersistSpawnArtifacts,
  loadExistingCritics,
  loadPromotedFindingOwners,
  loadSpawnedCritics,
  parseArgs,
  spliceNewSpec,
  type AgentJSON,
  type NewCriticSpec,
} from "../critic-genealogy.ts";

const ROOT = resolve(import.meta.dir, "..", "..");

const SAMPLE_SPEC: NewCriticSpec = {
  name: "accessibility-critic",
  scope: "accessibility",
  description:
    "Accessibility audit — WCAG AA color contrast, focus states, tap targets, semantic HTML, screen-reader cues.",
  rationale:
    "Three critics flagged color-contrast and tap-target concerns in their Out-of-scope sections; no existing critic owns WCAG compliance or a11y-specific evaluation of the rendered LP.",
  focus_owned: [
    "WCAG AA+ color contrast ratios for body and CTA text",
    "Focus-visible states on interactive elements",
    "Tap target sizes >= 44px on mobile",
    "Semantic HTML structure (headings, landmarks, alt attributes)",
  ],
  focus_not_owned: [
    "[seo] crawlability of alt text for image search",
    "[conversion] CTA placement and funnel friction",
    "[brand-voice] tonal consistency",
  ],
  severity_rubric:
    "- CRITICAL — contrast ratio < 3:1 on body text, unfocusable interactive element, missing alt on content image\n- HIGH — contrast 3:1-4.5:1 on body text, tap target < 36px on mobile, missing focus state\n- MEDIUM — heading level skip, redundant alt text, focus ring too subtle\n- LOW — minor contrast on decorative elements, opportunity to add ARIA landmark",
};

const LOAD_TEMPLATE = (): AgentJSON =>
  JSON.parse(readFileSync(join(ROOT, "agents/brand-voice-critic.json"), "utf8")) as AgentJSON;

describe("parseArgs", () => {
  test("parses --branch + --week + --dry-run", () => {
    const args = parseArgs(["--branch", "council/2026-04-23", "--week", "2026-04-23", "--dry-run"]);
    expect(args.branch).toBe("council/2026-04-23");
    expect(args.weekDate).toBe("2026-04-23");
    expect(args.dryRun).toBe(true);
    expect(args.overrideQuarterlyCap).toBe(false);
    expect(args.fixtures).toBe(null);
  });

  test("parses --fixtures", () => {
    const args = parseArgs(["--fixtures", "scripts/__tests__/fixtures/genealogy"]);
    expect(args.fixtures).toBe("scripts/__tests__/fixtures/genealogy");
    expect(args.branch).toBe(null);
  });

  test("parses --override-quarterly-cap", () => {
    const args = parseArgs(["--branch", "council/2026-04-23", "--override-quarterly-cap"]);
    expect(args.overrideQuarterlyCap).toBe(true);
  });

  test("parses --planner-request", () => {
    const args = parseArgs([
      "--branch",
      "council/2026-04-23",
      "--planner-request",
      "tmp/request.json",
    ]);
    expect(args.plannerRequestPath).toBe("tmp/request.json");
  });

  test("defaults lpTarget and weekDate", () => {
    const args = parseArgs(["--branch", "x"]);
    expect(args.lpTarget).toBe("https://certified.richerhealth.ca");
    expect(args.weekDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("rejects missing --branch and --fixtures", () => {
    expect(() => parseArgs([])).toThrow(CLIError);
  });

  test("rejects both --branch and --fixtures", () => {
    expect(() => parseArgs(["--branch", "a", "--fixtures", "b"])).toThrow(CLIError);
  });

  test("rejects unknown arg", () => {
    expect(() => parseArgs(["--nonsense"])).toThrow(CLIError);
  });
});

describe("loadExistingCritics", () => {
  test("includes all 5 originally-committed critics", () => {
    const scopes = loadExistingCritics().map((c) => c.scope);
    for (const expected of ["brand-voice", "conversion", "copy", "fh-compliance", "seo"]) {
      expect(scopes).toContain(expected);
    }
  });

  test("each critic has non-empty description", () => {
    for (const c of loadExistingCritics()) {
      expect(c.description.length).toBeGreaterThan(20);
    }
  });

  test("excludes archived critic specs from active summaries", () => {
    const agentsDir = makeHistoryFixture();
    writeAgentSpec(agentsDir, "active-critic", "active");
    mkdirSync(join(agentsDir, "archive"), { recursive: true });
    writeAgentSpec(join(agentsDir, "archive"), "archived-critic", "archived");

    const summaries = loadExistingCritics(agentsDir);
    expect(summaries.map((critic) => critic.name)).toEqual(["active-critic"]);
  });
});

function makeHistoryFixture(): string {
  return mkdtempSync(join(tmpdir(), "webster-genealogy-history-"));
}

function writeAgentSpec(agentsDir: string, name: string, scope: string): string {
  mkdirSync(agentsDir, { recursive: true });
  const spec = {
    name,
    description: `${name} fixture description long enough for active critic loading`,
    model: "claude-sonnet-4-6",
    system: "fixture system",
    tools: [],
    metadata: { role: "critic", scope },
  } satisfies AgentJSON;
  const path = join(agentsDir, `${name}.json`);
  writeFileSync(path, `${JSON.stringify(spec, null, 2)}\n`);
  return path;
}

function writeGenealogySpec(
  historyRoot: string,
  weekDate: string,
  name = `${weekDate}-critic`,
  scope = name.replace(/-critic$/, ""),
): void {
  const dir = join(historyRoot, weekDate, "genealogy");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "spec.json"),
    JSON.stringify({ name, description: "Spawned critic fixture", metadata: { scope } }),
  );
}

function writeDecision(historyRoot: string, weekDate: string, owners: string[]): void {
  const dir = join(historyRoot, weekDate);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "decision.json"),
    JSON.stringify({ week: weekDate, selected_issues: owners.map((owner) => ({ owner })) }),
  );
}

describe("archive-on-idle governance", () => {
  test("archives idle spawned critics with no promoted findings in 8 weeks", () => {
    const agentsDir = makeHistoryFixture();
    const historyRoot = makeHistoryFixture();
    const originalBytes = '{\n  "name": "visual-design-critic",\n  "description": "Fixture"\n}\n';
    writeGenealogySpec(historyRoot, "2026-04-03", "visual-design-critic", "visual-design");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, "visual-design-critic.json"), originalBytes);

    const result = archiveIdleSpawnedCritics(agentsDir, historyRoot, "2026-04-24");

    expect(result.archived).toEqual(["visual-design-critic"]);
    expect(existsSync(join(agentsDir, "visual-design-critic.json"))).toBe(false);
    const archivedPath = join(agentsDir, "archive", "visual-design-critic.json");
    expect(readFileSync(archivedPath, "utf8")).toBe(originalBytes);
  });

  test("retains spawned critics with at least one promoted finding in 8 weeks", () => {
    const agentsDir = makeHistoryFixture();
    const historyRoot = makeHistoryFixture();
    writeAgentSpec(agentsDir, "visual-design-critic", "visual-design");
    writeGenealogySpec(historyRoot, "2026-04-03", "visual-design-critic", "visual-design");
    writeDecision(historyRoot, "2026-04-17", ["visual-design"]);

    const result = archiveIdleSpawnedCritics(agentsDir, historyRoot, "2026-04-24");

    expect(result.retained).toEqual(["visual-design-critic"]);
    expect(result.archived).toEqual([]);
    expect(existsSync(join(agentsDir, "visual-design-critic.json"))).toBe(true);
  });

  test("retains original critics without genealogy provenance", () => {
    const agentsDir = makeHistoryFixture();
    const historyRoot = makeHistoryFixture();
    writeAgentSpec(agentsDir, "brand-voice-critic", "brand-voice");

    const result = archiveIdleSpawnedCritics(agentsDir, historyRoot, "2026-04-24");

    expect(result.archived).toEqual([]);
    expect(existsSync(join(agentsDir, "brand-voice-critic.json"))).toBe(true);
  });

  test("promoted findings use explicit selected issue owners from decision history", () => {
    const historyRoot = makeHistoryFixture();
    writeDecision(historyRoot, "2026-04-10", ["visual-design"]);
    writeDecision(historyRoot, "2026-02-01", ["stale-owner"]);

    expect([...loadPromotedFindingOwners(historyRoot, "2026-04-24")]).toEqual(["visual-design"]);
  });

  test("loads spawned critic provenance from genealogy specs", () => {
    const historyRoot = makeHistoryFixture();
    writeGenealogySpec(historyRoot, "2026-04-03", "visual-design-critic", "visual-design");

    expect(loadSpawnedCritics(historyRoot)).toEqual([
      { name: "visual-design-critic", scope: "visual-design" },
    ]);
  });
});

describe("quarterly cap governance", () => {
  test("counts 0 spawned critics in an empty history", () => {
    const historyRoot = makeHistoryFixture();
    expect(countRecentGenealogySpawns(historyRoot, "2026-04-24")).toBe(0);
    const decision = evaluateQuarterlyCap(historyRoot, "2026-04-24", false);
    expect(decision.allowed).toBe(true);
    expect(decision.recentSpawnCount).toBe(0);
  });

  test("allows count 2 below the cap", () => {
    const historyRoot = makeHistoryFixture();
    writeGenealogySpec(historyRoot, "2026-04-10");
    writeGenealogySpec(historyRoot, "2026-04-17");
    const decision = evaluateQuarterlyCap(historyRoot, "2026-04-24", false);
    expect(decision.allowed).toBe(true);
    expect(decision.recentSpawnCount).toBe(2);
  });

  test("blocks count 3 without override", () => {
    const historyRoot = makeHistoryFixture();
    writeGenealogySpec(historyRoot, "2026-04-03");
    writeGenealogySpec(historyRoot, "2026-04-10");
    writeGenealogySpec(historyRoot, "2026-04-17");
    const decision = evaluateQuarterlyCap(historyRoot, "2026-04-24", false);
    expect(decision.allowed).toBe(false);
    expect(decision.recentSpawnCount).toBe(3);
    expect(decision.overrideUsed).toBe(false);
  });

  test("allows count 3 with operator override", () => {
    const historyRoot = makeHistoryFixture();
    writeGenealogySpec(historyRoot, "2026-04-03");
    writeGenealogySpec(historyRoot, "2026-04-10");
    writeGenealogySpec(historyRoot, "2026-04-17");
    const decision = evaluateQuarterlyCap(historyRoot, "2026-04-24", true);
    expect(decision.allowed).toBe(true);
    expect(decision.recentSpawnCount).toBe(3);
    expect(decision.overrideUsed).toBe(true);
  });

  test("includes boundary dates exactly 13 weeks back and excludes older spawns", () => {
    const historyRoot = makeHistoryFixture();
    writeGenealogySpec(historyRoot, "2026-01-23");
    writeGenealogySpec(historyRoot, "2026-01-22");
    const decision = evaluateQuarterlyCap(historyRoot, "2026-04-24", false);
    expect(decision.recentSpawnCount).toBe(1);
    expect(decision.windowStart).toBe("2026-01-23");
  });

  test("fails loudly on malformed in-window genealogy spec data", () => {
    const historyRoot = makeHistoryFixture();
    mkdirSync(join(historyRoot, "2026-04-17", "genealogy"), { recursive: true });
    writeFileSync(join(historyRoot, "2026-04-17", "genealogy", "spec.json"), "not-json");
    mkdirSync(join(historyRoot, "not-a-week", "genealogy"), { recursive: true });
    expect(() => evaluateQuarterlyCap(historyRoot, "2026-04-24", false)).toThrow(
      /malformed genealogy history/,
    );
  });
});

describe("evaluateCriticDedup", () => {
  const candidate: NewCriticSpec = {
    ...SAMPLE_SPEC,
    scope: "accessibility",
    description: "Accessibility audit for contrast and keyboard focus.",
  };
  const critics = [
    {
      name: "existing-critic",
      scope: "existing",
      description: "Existing critic description.",
    },
  ];

  test("allows a candidate below the 0.60 similarity threshold", () => {
    const decision = evaluateCriticDedup(candidate, critics, (text) =>
      text.includes("accessibility") ? [1, 0] : [0.59, Math.sqrt(1 - 0.59 * 0.59)],
    );
    expect(decision.allowed).toBe(true);
    expect(decision.closestCritic?.name).toBe("existing-critic");
    expect(decision.similarity).toBeCloseTo(0.59, 5);
  });

  test("rejects a candidate exactly at the 0.60 similarity threshold", () => {
    const decision = evaluateCriticDedup(candidate, critics, (text) =>
      text.includes("accessibility") ? [1, 0] : [0.6, 0.8],
    );
    expect(decision.allowed).toBe(false);
    expect(decision.closestCritic?.name).toBe("existing-critic");
    expect(decision.similarity).toBeCloseTo(0.6, 5);
  });

  test("rejects a candidate above the 0.60 similarity threshold", () => {
    const decision = evaluateCriticDedup(candidate, critics, (text) =>
      text.includes("accessibility") ? [1, 0] : [0.75, Math.sqrt(1 - 0.75 * 0.75)],
    );
    expect(decision.allowed).toBe(false);
    expect(decision.closestCritic?.name).toBe("existing-critic");
    expect(decision.similarity).toBeCloseTo(0.75, 5);
  });
});

describe("buildGapPrompt", () => {
  test("includes every critic name and scope", () => {
    const critics = loadExistingCritics();
    const findings = new Map(critics.map((c) => [c.scope, `stub findings for ${c.scope}`]));
    const prompt = buildGapPrompt(critics, findings, "https://example.com", "2026-04-23");
    for (const c of critics) {
      expect(prompt).toContain(c.name);
      expect(prompt).toContain(c.scope);
    }
  });

  test("embeds every findings body verbatim", () => {
    const critics = loadExistingCritics();
    const findings = new Map([
      ["seo", "SEO FINDINGS BODY MARKER"],
      ["conversion", "CRO FINDINGS BODY MARKER"],
    ]);
    const prompt = buildGapPrompt(critics, findings, "https://example.com", "2026-04-23");
    expect(prompt).toContain("SEO FINDINGS BODY MARKER");
    expect(prompt).toContain("CRO FINDINGS BODY MARKER");
  });

  test("states LP_TARGET and WEEK_DATE", () => {
    const prompt = buildGapPrompt([], new Map(), "https://foo.test", "2026-04-23");
    expect(prompt).toContain("https://foo.test");
    expect(prompt).toContain("2026-04-23");
  });
});

describe("buildSystemPrompt", () => {
  test("includes the new critic name and scope throughout", () => {
    const system = buildSystemPrompt(SAMPLE_SPEC);
    expect(system).toContain(SAMPLE_SPEC.name);
    expect(system).toContain(`context/critics/${SAMPLE_SPEC.scope}/findings.md`);
    expect(system).toContain(`Scope (ONLY ${SAMPLE_SPEC.scope})`);
  });

  test("includes focus_owned and focus_not_owned as bullet lists", () => {
    const system = buildSystemPrompt(SAMPLE_SPEC);
    for (const bullet of SAMPLE_SPEC.focus_owned) {
      expect(system).toContain(`- ${bullet}`);
    }
    for (const bullet of SAMPLE_SPEC.focus_not_owned) {
      expect(system).toContain(`- ${bullet}`);
    }
  });

  test("includes severity rubric verbatim", () => {
    const system = buildSystemPrompt(SAMPLE_SPEC);
    expect(system).toContain(SAMPLE_SPEC.severity_rubric.trim());
  });

  test("includes MCP commit instructions (gotcha 14-17)", () => {
    const system = buildSystemPrompt(SAMPLE_SPEC);
    expect(system).toContain("create_or_update_file");
    expect(system).toContain("create_branch");
    expect(system).toContain("get_file_contents");
    expect(system).toContain("owner=richsak");
    expect(system).toContain("No shell git required");
  });

  test("includes WebFetch bootstrap step", () => {
    const system = buildSystemPrompt(SAMPLE_SPEC);
    expect(system).toContain("WebFetch on $LP_TARGET");
  });
});

describe("spliceNewSpec", () => {
  test("produces a valid agent JSON against the schema", () => {
    const spec = spliceNewSpec(LOAD_TEMPLATE(), SAMPLE_SPEC);
    const schema = JSON.parse(
      readFileSync(join(ROOT, "scripts/schemas/agent.schema.json"), "utf8"),
    );
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats.default(ajv);
    const validate = ajv.compile(schema);
    const ok = validate(spec);
    if (!ok) {
      throw new Error(`schema errors: ${JSON.stringify(validate.errors, null, 2)}`);
    }
    expect(ok).toBe(true);
  });

  test("preserves tools and mcp_servers from template (gotchas 14-16)", () => {
    const template = LOAD_TEMPLATE();
    const spec = spliceNewSpec(template, SAMPLE_SPEC);
    expect(spec.tools).toEqual(template.tools);
    expect(spec.mcp_servers).toEqual(template.mcp_servers);
  });

  test("sets name, description, scope from spec", () => {
    const spec = spliceNewSpec(LOAD_TEMPLATE(), SAMPLE_SPEC);
    expect(spec.name).toBe(SAMPLE_SPEC.name);
    expect(spec.description).toBe(SAMPLE_SPEC.description);
    expect(spec.metadata?.scope).toBe(SAMPLE_SPEC.scope);
    expect(spec.metadata?.role).toBe("critic");
  });

  test("uses claude-sonnet-4-6 model (same tier as pre-registered critics)", () => {
    const spec = spliceNewSpec(LOAD_TEMPLATE(), SAMPLE_SPEC);
    expect(spec.model).toBe("claude-sonnet-4-6");
  });

  test("deep-clones tools so mutating result does not affect template", () => {
    const template = LOAD_TEMPLATE();
    const templateToolsBefore = JSON.parse(JSON.stringify(template.tools));
    const spec = spliceNewSpec(template, SAMPLE_SPEC);
    (spec.tools as Record<string, unknown>[])[0] = { type: "mutated" };
    expect(template.tools).toEqual(templateToolsBefore);
  });

  test("persists genealogy artifacts when snapshot fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    const weekDate = "2099-01-critic-genealogy-test";
    const spec = {
      ...spliceNewSpec(LOAD_TEMPLATE(), SAMPLE_SPEC),
      name: "snapshot-failure-test-critic",
    };
    const committed: { paths: string[]; message: string }[] = [];
    globalThis.fetch = (async () =>
      new Response("upstream down", { status: 503 })) as unknown as typeof fetch;

    try {
      const result = await fetchAndPersistSpawnArtifacts({
        apiKey: "test-key",
        sessionId: "session-test",
        agentId: "agent-test",
        weekDate,
        spec,
        rationale: SAMPLE_SPEC.rationale,
        commitMsg: "test commit",
        commitFn: (paths, message) => committed.push({ paths, message }),
      });

      expect(result.snapshotError).toContain("session snapshot fetch failed 503");
      expect(existsSync(join(ROOT, "history", weekDate, "genealogy", "spec.json"))).toBe(true);
      expect(JSON.parse(readFileSync(result.paths.logPath, "utf8"))).toEqual({
        error: result.snapshotError,
        agent_id: "agent-test",
        session_id: "session-test",
      });
      expect(result.paths.errorPath).toBeDefined();
      expect(readFileSync(result.paths.errorPath ?? "", "utf8")).toContain(
        "session snapshot fetch failed 503",
      );
      expect(committed[0]?.paths).toContain(result.paths.specPath);
      expect(committed[0]?.paths).toContain(result.paths.errorPath);
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(join(ROOT, "history", weekDate), { recursive: true, force: true });
      rmSync(join(ROOT, "agents", `${spec.name}.json`), { force: true });
    }
  });
});
