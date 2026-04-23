import { describe, expect, test } from "bun:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CLIError,
  buildGapPrompt,
  buildSystemPrompt,
  loadExistingCritics,
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
    expect(args.fixtures).toBe(null);
  });

  test("parses --fixtures", () => {
    const args = parseArgs(["--fixtures", "scripts/__tests__/fixtures/genealogy"]);
    expect(args.fixtures).toBe("scripts/__tests__/fixtures/genealogy");
    expect(args.branch).toBe(null);
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
  test("returns all 5 committed critics", () => {
    const critics = loadExistingCritics();
    const scopes = critics.map((c) => c.scope).sort();
    expect(scopes).toEqual(["brand-voice", "conversion", "copy", "fh-compliance", "seo"]);
  });

  test("each critic has non-empty description", () => {
    for (const c of loadExistingCritics()) {
      expect(c.description.length).toBeGreaterThan(20);
    }
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
});
