import { describe, expect, test } from "bun:test";
import { lpSimulationConfig } from "../run-simulation-lp.ts";
import { siteSimulationConfig } from "../run-simulation-site.ts";

describe("simulation entrypoint configs", () => {
  test("LP entrypoint targets the Richer Health 10-week simulation", () => {
    expect(lpSimulationConfig).toMatchObject({
      substrate: "lp",
      weekCount: 10,
      sitePath: "demo-landing-page/ugly",
      contextPath: "demo-landing-page/context",
      outputDir: "demo-output/landing-page",
      agentSet: "webster-lp-sim",
    });
  });

  test("site entrypoint targets the Northwest Reno 10-week simulation", () => {
    expect(siteSimulationConfig).toMatchObject({
      substrate: "site",
      weekCount: 10,
      sitePath: "demo-sites/northwest-reno/ugly",
      contextPath: "demo-sites/northwest-reno/context",
      outputDir: "demo-output/northwest-reno",
      agentSet: "webster-site-sim",
    });
  });
});
