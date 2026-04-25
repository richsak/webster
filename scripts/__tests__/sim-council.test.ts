import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROMPT_PATH = "prompts/sim-council.md";

function prompt(): string {
  return readFileSync(PROMPT_PATH, "utf8");
}

function bashBlocks(markdown: string): string[] {
  const matches = markdown.matchAll(/```bash\n([\s\S]*?)\n```/g);
  return [...matches].map((match) => match[1] ?? "");
}

describe("sim-council prompt", () => {
  test("declares required parameterized environment and drops production target", () => {
    const body = prompt();

    for (const required of [
      "SUBSTRATE",
      "WEEK_DATE",
      "BRANCH",
      "AGENT_SET",
      "CONTEXT_PATH",
      "SITE_PATH",
      "MEMORY_STORES_JSON",
    ]) {
      expect(body).toContain(`\${${required}:?`);
    }
    expect(body).not.toContain("LP_TARGET=");
    expect(body).not.toContain("certified.richerhealth.ca");
  });

  test("uses sim-agent manifest and role-specific memory stores", () => {
    const body = prompt();

    expect(body).toContain("SIM_AGENTS_JSON:=context/sim-agents.json");
    expect(body).toContain("agent_id() {");
    expect(body).toContain("store_id() {");
    expect(body).toContain("memory_store_id");
    expect(body).toContain("resources:$resources");
    expect(body).toContain("memory_resource planner read_write");
    expect(body).toContain("memory_resource council read_only");
    expect(body).toContain("roles with durable");
    expect(body).toContain("memory_resource redesigner read_write");
  });

  test("invokes substrate-specific sim roles instead of production agent ids", () => {
    const body = prompt();

    expect(body).toContain(
      "roles=(monitor seo-critic brand-voice-critic conversion-critic copy-critic)",
    );
    expect(body).toContain("fh-compliance-critic");
    expect(body).toContain("licensing-and-warranty-critic");
    expect(body).toContain("agent_id planner");
    expect(body).toContain("agent_id redesigner");
    expect(body).toContain("agent_id visual-reviewer");
    expect(body).toContain("failed_roles=()");
    expect(body).toContain("ABORT: failed sim sessions");
    expect(body).not.toContain("MONITOR_ID=$(cat context/monitor/id.txt)");
    expect(body).not.toContain("context/critics/seo/id.txt");
  });

  test("does not modify production weekly orchestrator", () => {
    const diff = Bun.spawnSync(
      ["git", "diff", "--name-only", "--", "prompts/second-wbs-session.md"],
      {
        stdout: "pipe",
      },
    );
    expect(new TextDecoder().decode(diff.stdout).trim()).toBe("");
  });

  test("bash blocks pass shellcheck when shellcheck is installed", () => {
    const hasShellcheck =
      Bun.spawnSync(["bash", "-lc", "command -v shellcheck >/dev/null"]).exitCode === 0;
    if (!hasShellcheck) {
      return;
    }
    const dir = mkdtempSync(join(tmpdir(), "webster-sim-council-shellcheck-"));
    try {
      const path = join(dir, "sim-council-blocks.sh");
      writeFileSync(
        path,
        `#!/usr/bin/env bash\nset -euo pipefail\n${bashBlocks(prompt()).join("\n\n")}\n`,
      );
      const result = Bun.spawnSync(["shellcheck", "-x", path], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if (result.exitCode !== 0) {
        throw new Error(
          `shellcheck failed\n${new TextDecoder().decode(result.stdout)}${new TextDecoder().decode(result.stderr)}`,
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
