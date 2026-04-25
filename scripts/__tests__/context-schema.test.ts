import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  validateBrandContext,
  validateBusinessMarkdown,
  validateContextDirectory,
  validatePersonas,
} from "../context-schema.ts";

describe("demo context schema", () => {
  test("validates Richer Health and Northwest Reno context directories", () => {
    expect(validateContextDirectory("demo-landing-page/context")).toEqual([]);
    expect(validateContextDirectory("demo-sites/northwest-reno/context")).toEqual([]);
  });

  test("requires exactly three rich personas with behavioral fields", () => {
    const errors = validatePersonas([
      {
        id: "one",
        name: "One",
        archetype: "Sparse",
        goals: ["goal"],
        anxieties: [],
        conversion_triggers: [],
        behavior_hints: [],
      },
    ]);

    expect(errors).toContain("personas must contain exactly 3 personas");
    expect(errors.some((error) => error.includes("goals"))).toBe(true);
    expect(errors.some((error) => error.includes("anxieties"))).toBe(true);
  });

  test("requires palette hex codes, typography, signature phrases, and at least 5 do_not_use items", () => {
    const errors = validateBrandContext({
      voice: "flat",
      tone: ["direct"],
      palette: { bad: "blue" },
      typography: { heading: "Inter" },
      signature_phrases: [],
      do_not_use: ["one"],
    });

    expect(errors).toContain("brand.tone must contain at least 2 item(s)");
    expect(errors).toContain("brand.palette must contain at least 3 colors");
    expect(errors).toContain("brand.palette.bad must be a #RRGGBB hex color");
    expect(errors).toContain("brand.typography.body must be a non-empty string");
    expect(errors).toContain("brand.do_not_use must contain at least 5 item(s)");
  });

  test("keeps substrate context isolated", () => {
    const lpContext = [
      readFileSync("demo-landing-page/context/business.md", "utf8"),
      readFileSync("demo-landing-page/context/personas.json", "utf8"),
      readFileSync("demo-landing-page/context/brand.json", "utf8"),
    ].join("\n");
    const siteContext = [
      readFileSync("demo-sites/northwest-reno/context/business.md", "utf8"),
      readFileSync("demo-sites/northwest-reno/context/personas.json", "utf8"),
      readFileSync("demo-sites/northwest-reno/context/brand.json", "utf8"),
    ].join("\n");

    expect(lpContext).not.toContain("Northwest Home Renovations");
    expect(lpContext).not.toContain("Sam Reyes");
    expect(siteContext).not.toContain("Richer Health");
    expect(siteContext).not.toContain("Nicolette");
  });

  test("business markdown requires heading and business/service/tone context", () => {
    expect(validateBusinessMarkdown("plain text")).toContain(
      "business.md must start with a heading",
    );
    expect(validateBusinessMarkdown("# Business\n\nServices and tone are clear.")).toEqual([]);
    expect(validateBusinessMarkdown("# Business\n\nCertification and voice are clear.")).toEqual(
      [],
    );
  });
});
