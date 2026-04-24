import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const CLI_PATH = join(REPO_ROOT, "scripts/apply-worker-cli.ts");
const WEEK_DIR = "history/2026-04-23";
const TARGET_FILE = "site/src/pages/index.astro";

interface FixtureRepo {
  root: string;
  weekDir: string;
  targetFile: string;
}

interface ApplyLogExperiment {
  exp_id: string;
  status: "applied" | "skipped";
  commit_sha?: string;
  skip_reason?: string;
}

interface ApplyLogFixture {
  experiments: ApplyLogExperiment[];
  pr_emission?: {
    clusters: {
      experiment_ids: string[];
      labels: string[];
      draft: boolean;
      title: string;
    }[];
    skipped_experiment_ids: string[];
  };
  visual_review?: {
    passed: boolean;
    criticalCount: number;
    iterations: number;
  };
  preview_deployment?: {
    preview_url?: string;
    analytics_scrub: { enabled: boolean; marker: string };
    noindex: { required: boolean; verified: boolean };
  };
}

function decode(output: Uint8Array<ArrayBufferLike>): string {
  return new TextDecoder().decode(output).trim();
}

function run(command: string[], cwd: string): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      [`$ ${command.join(" ")}`, decode(result.stdout), decode(result.stderr)]
        .filter((part) => part.length > 0)
        .join("\n"),
    );
  }

  return decode(result.stdout);
}

function runCli(
  repo: FixtureRepo,
  env?: Record<string, string>,
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", CLI_PATH, WEEK_DIR], {
    cwd: repo.root,
    stdout: "pipe",
    stderr: "pipe",
    env: env ? { ...process.env, ...env } : process.env,
  });

  return {
    exitCode: result.exitCode,
    stdout: decode(result.stdout),
    stderr: decode(result.stderr),
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createFixtureRepo(
  testName: string,
  after: string,
  severity: "CRITICAL" | "HIGH" = "HIGH",
): FixtureRepo {
  const root = join(tmpdir(), `apply-worker-cli-${testName}-${Date.now()}-${randomUUID()}`);
  const weekDir = join(root, WEEK_DIR);
  const targetFile = join(root, TARGET_FILE);

  mkdirSync(weekDir, { recursive: true });
  mkdirSync(join(root, "site/src/pages"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });

  writeJson(join(root, "package.json"), {
    name: "apply-worker-cli-fixture",
    private: true,
    type: "module",
    scripts: {
      lint: "bun scripts/check-lint.ts",
      "type-check": 'bun -e "process.exit(0)"',
      "format:check": 'bun -e "process.exit(0)"',
    },
  });
  writeFileSync(
    join(root, "scripts/check-lint.ts"),
    [
      'import { readFileSync } from "node:fs";',
      `const page = readFileSync(${JSON.stringify(TARGET_FILE)}, "utf8");`,
      'if (page.includes("BROKEN")) {',
      '  console.error("lint fixture rejected BROKEN output");',
      "  process.exit(1);",
      "}",
    ].join("\n"),
  );
  writeFileSync(targetFile, "<h1>Old clinic headline</h1>\n");
  writeJson(join(weekDir, "decision.json"), {
    week: "2026-04-23",
    selected_issues: [
      {
        owner: "copy",
        severity,
        issue: "The homepage headline is unclear for clinic directors.",
        evidence: "copy/findings.md: The headline fails one-read clarity.",
        proposed_change:
          "Replace the generic homepage headline with a clear clinic-director headline.",
        files_touched: [TARGET_FILE],
      },
    ],
  });
  writeFileSync(
    join(weekDir, "proposal.md"),
    [
      "# Redesign proposal — Week 2026-04-23",
      "",
      "## Issues selected (top 1)",
      "",
      `### 1. [${severity}] Update homepage headline`,
      "",
      `**Target file(s):** \`${TARGET_FILE}\``,
      "",
      "**Change:**",
      "",
      "Before:",
      "```html",
      "<h1>Old clinic headline</h1>",
      "```",
      "",
      "After:",
      "```html",
      after,
      "```",
      "",
      "**Rationale:** Clarifies the page for clinic directors.",
      "",
    ].join("\n"),
  );

  run(["git", "init"], root);
  run(["git", "config", "user.email", "webster@example.test"], root);
  run(["git", "config", "user.name", "Webster Test"], root);
  run(["git", "add", "."], root);
  run(["git", "commit", "-m", "fixture baseline"], root);

  return { root, weekDir, targetFile };
}

function removeFixtureRepo(repo: FixtureRepo): void {
  if (existsSync(repo.root)) {
    rmSync(repo.root, { recursive: true, force: true });
  }
}

function readApplyLog(repo: FixtureRepo): ApplyLogFixture {
  return JSON.parse(readFileSync(join(repo.weekDir, "apply-log.json"), "utf8")) as ApplyLogFixture;
}

describe("apply-worker CLI integration", () => {
  test("applies a valid proposal, writes an experiment commit trailer, and records the commit", () => {
    const repo = createFixtureRepo("success", "<h1>Clinic directors get one clear protocol</h1>");

    try {
      const cli = runCli(repo);

      expect(cli.exitCode).toBe(0);
      expect(readFileSync(repo.targetFile, "utf8")).toContain(
        "<h1>Clinic directors get one clear protocol</h1>",
      );

      const commitBody = run(["git", "log", "-1", "--format=%B"], repo.root);
      expect(commitBody).toContain("Experiment-Id: exp-01-update-homepage-headline");

      const log = readApplyLog(repo);
      expect(log.experiments).toHaveLength(1);
      expect(log.experiments[0]).toMatchObject({
        exp_id: "exp-01-update-homepage-headline",
        status: "applied",
      });
      expect(log.experiments[0]?.commit_sha).toEqual(expect.stringMatching(/^[0-9a-f]+$/));
      expect(log.pr_emission?.clusters).toHaveLength(1);
      expect(log.pr_emission?.clusters[0]).toMatchObject({
        experiment_ids: ["exp-01-update-homepage-headline"],
        labels: ["webster-apply"],
        draft: false,
      });
      expect(log.preview_deployment).toMatchObject({
        analytics_scrub: { enabled: false, marker: 'data-preview="1"' },
        noindex: { required: false, verified: false },
      });
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("blocks validation-breaking output before commit and records a terminal skip", () => {
    const repo = createFixtureRepo("validation-failure", "<h1>BROKEN clinic headline</h1>");

    try {
      const commitCountBefore = run(["git", "rev-list", "--count", "HEAD"], repo.root);
      const cli = runCli(repo);
      const commitCountAfter = run(["git", "rev-list", "--count", "HEAD"], repo.root);

      expect(cli.exitCode).toBe(0);
      expect(commitCountAfter).toBe(commitCountBefore);
      expect(readFileSync(repo.targetFile, "utf8")).toBe("<h1>Old clinic headline</h1>\n");

      const log = readApplyLog(repo);
      expect(log.experiments).toHaveLength(1);
      expect(log.experiments[0]).toMatchObject({
        exp_id: "exp-01-update-homepage-headline",
        status: "skipped",
        skip_reason: "lint_failure",
      });
      expect(log.experiments[0]?.commit_sha).toBeUndefined();
      expect(readFileSync(join(repo.weekDir, "skips.jsonl"), "utf8")).toContain(
        '"reason":"apply-fail"',
      );
      expect(log.pr_emission?.clusters[0]).toMatchObject({
        labels: ["webster-apply", "partial"],
        draft: false,
      });
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("blocks non-resolving booking CTAs in the runtime gate", () => {
    const repo = createFixtureRepo(
      "runtime-failure",
      '<a href="#">BOOK YOUR FREE STRATEGY CALL</a>',
    );

    try {
      const commitCountBefore = run(["git", "rev-list", "--count", "HEAD"], repo.root);
      const cli = runCli(repo);
      const commitCountAfter = run(["git", "rev-list", "--count", "HEAD"], repo.root);

      expect(cli.exitCode).toBe(0);
      expect(commitCountAfter).toBe(commitCountBefore);
      expect(readFileSync(repo.targetFile, "utf8")).toBe("<h1>Old clinic headline</h1>\n");

      const log = readApplyLog(repo);
      expect(log.experiments[0]).toMatchObject({
        exp_id: "exp-01-update-homepage-headline",
        status: "skipped",
        skip_reason: "runtime_failure",
      });
      expect(readFileSync(join(repo.weekDir, "skips.jsonl"), "utf8")).toContain(
        "booking CTA has non-resolving href",
      );
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("keeps asset placeholder comments when image backend is unavailable", () => {
    const repo = createFixtureRepo(
      "asset-stub",
      '<meta property="og:image" content="<!-- asset TBD: og_card | Richer Health OG card -->">',
    );

    try {
      const cli = runCli(repo, { OPENAI_API_KEY: "" });

      expect(cli.exitCode).toBe(0);
      expect(readFileSync(repo.targetFile, "utf8")).toContain(
        "<!-- asset TBD: og_card; missing-openai-api-key -->",
      );
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("blocks PR emission metadata on critical visual review regressions", () => {
    const repo = createFixtureRepo(
      "visual-review-block",
      "<h1>Clinic directors get one clear protocol</h1>",
    );

    try {
      const cli = runCli(repo, {
        WEBSTER_VISUAL_REVIEW_CMD:
          'printf \'{"findings":[{"severity":"CRITICAL","issue":"Hero text clipped on mobile"}]}\'',
      });

      expect(cli.exitCode).toBe(0);
      const log = readApplyLog(repo);
      expect(log.visual_review).toMatchObject({ passed: false, criticalCount: 1, iterations: 3 });
      expect(log.pr_emission?.clusters[0]).toMatchObject({
        labels: ["webster-apply", "partial"],
        draft: true,
      });
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("records CF Pages preview URL and noindex verification metadata", () => {
    const repo = createFixtureRepo(
      "preview-url",
      "<h1>Clinic directors get one clear protocol</h1>",
    );

    try {
      const cli = runCli(repo, {
        WEBSTER_CF_PAGES_PREVIEW_URL: "https://webster-abc.pages.dev",
      });

      expect(cli.exitCode).toBe(0);
      const log = readApplyLog(repo);
      expect(log.preview_deployment).toMatchObject({
        preview_url: "https://webster-abc.pages.dev",
        analytics_scrub: { enabled: true, marker: 'data-preview="1"' },
        noindex: { required: true, verified: true },
      });
    } finally {
      removeFixtureRepo(repo);
    }
  });

  test("blocks critic rerun vetoes before commit", () => {
    const repo = createFixtureRepo(
      "critic-veto",
      "<h1>Clinic directors get one clear protocol</h1>",
      "CRITICAL",
    );

    try {
      const commitCountBefore = run(["git", "rev-list", "--count", "HEAD"], repo.root);
      const cli = runCli(repo, {
        WEBSTER_CRITIC_RERUN_CMD:
          'printf \'{"findings":[{"critic":"conversion","severity":"CRITICAL","issue":"New CTA regression"}]}\'',
      });
      const commitCountAfter = run(["git", "rev-list", "--count", "HEAD"], repo.root);

      expect(cli.exitCode).toBe(0);
      expect(commitCountAfter).toBe(commitCountBefore);
      expect(readFileSync(repo.targetFile, "utf8")).toBe("<h1>Old clinic headline</h1>\n");

      const log = readApplyLog(repo);
      expect(log.experiments[0]).toMatchObject({
        exp_id: "exp-01-update-homepage-headline",
        status: "skipped",
        skip_reason: "critic_veto",
      });
      expect(readFileSync(join(repo.weekDir, "skips.jsonl"), "utf8")).toContain(
        '"reason":"critic-veto"',
      );
      expect(log.pr_emission?.clusters[0]).toMatchObject({
        labels: ["webster-apply", "partial"],
        draft: true,
        title: "[partial] Webster apply cluster 1",
      });
    } finally {
      removeFixtureRepo(repo);
    }
  });
});
