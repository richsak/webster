import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  GENERATE_VISUAL_ASSET_SCHEMA,
  VISUAL_ASSET_TYPES,
  buildUnknownAssetTypeStub,
  generateVisualAsset,
  loadBrandContext,
  normalizeGenerateVisualAssetInput,
  persistGeneratedVisualAsset,
} from "../visual-assets";

describe("visual asset tool schema", () => {
  test("exposes the locked five-type enum", () => {
    expect(VISUAL_ASSET_TYPES).toEqual([
      "og_card",
      "hero_background",
      "testimonial_headshot",
      "icon",
      "section_illustration",
    ]);
    expect(GENERATE_VISUAL_ASSET_SCHEMA.properties.type.enum).toEqual(VISUAL_ASSET_TYPES);
  });

  test("normalizes a valid generate_visual_asset payload", () => {
    expect(
      normalizeGenerateVisualAssetInput({
        type: "og_card",
        brand_context: { palette: ["#80A8A7"] },
        dims: { width: 1536, height: 1024 },
        prompt: "Create an OG card for Richer Health.",
      }),
    ).toMatchObject({
      type: "og_card",
      dims: { width: 1536, height: 1024 },
      prompt: "Create an OG card for Richer Health.",
    });
  });

  test("emits a stub comment for unknown asset types", () => {
    expect(buildUnknownAssetTypeStub("logo_pack")).toEqual({
      status: "stub",
      type: "logo_pack",
      reason: "unknown-type",
      comment: "<!-- asset TBD: unknown visual asset type 'logo_pack' -->",
    });
    expect(normalizeGenerateVisualAssetInput({ type: "logo_pack" })).toMatchObject({
      status: "stub",
      comment: "<!-- asset TBD: unknown visual asset type 'logo_pack' -->",
    });
  });

  test("rejects invalid dimensions for known asset types", () => {
    expect(() =>
      normalizeGenerateVisualAssetInput({
        type: "icon",
        brand_context: {},
        dims: { width: 0, height: 64 },
        prompt: "Icon",
      }),
    ).toThrow("positive integer width and height");
  });

  test("falls back to a stub when OpenAI API key is missing", async () => {
    const input = normalizeGenerateVisualAssetInput({
      type: "og_card",
      brand_context: {},
      dims: { width: 1536, height: 1024 },
      prompt: "OG card",
    });

    await expect(generateVisualAsset(input, { apiKey: "" })).resolves.toMatchObject({
      status: "stub",
      reason: "missing-openai-api-key",
    });
  });

  test("retries rate limits and returns generated image data", async () => {
    const input = normalizeGenerateVisualAssetInput({
      type: "icon",
      brand_context: { tone: "warm" },
      dims: { width: 1024, height: 1024 },
      prompt: "Leaf icon",
    });
    let calls = 0;

    const result = await generateVisualAsset(input, {
      apiKey: "test-key",
      retryDelaysMs: [0],
      fetchImpl: async () => {
        calls += 1;
        return new Response(
          calls === 1 ? "rate limit" : JSON.stringify({ data: [{ b64_json: "abc123" }] }),
          { status: calls === 1 ? 429 : 200 },
        );
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({
      status: "generated",
      type: "icon",
      base64_data: "abc123",
      estimated_cost_usd: 0.25,
    });
  });

  test("loads brand context from business markdown and palette JSON", () => {
    const dir = mkdtempSync(join(tmpdir(), "visual-brand-"));
    try {
      const businessPath = join(dir, "business.md");
      const palettePath = join(dir, "palette.json");
      writeFileSync(
        businessPath,
        [
          "# Business",
          "",
          "| Field | Value |",
          "| --- | --- |",
          "| Operator | Dr. Nicolette Richer, DSocSci |",
          "| Campaign LP | certified.richerhealth.ca |",
          "",
          "## Brand voice (one-liner)",
          "Warm-authoritative with deliberate edge.",
          "",
          "## Certification positioning",
          "N&D certification (Nutrition & Detoxification).",
          "",
          "## Signature phrase",
          '"Your body can heal."',
        ].join("\n"),
      );
      writeFileSync(palettePath, JSON.stringify({ primary: "#80A8A7" }));

      expect(loadBrandContext(businessPath, palettePath)).toMatchObject({
        identity: { operator: "Dr. Nicolette Richer, DSocSci" },
        voice: "Warm-authoritative with deliberate edge.",
        positioning: "N&D certification (Nutrition & Detoxification).",
        signature_phrase: "Your body can heal.",
        palette: { primary: "#80A8A7" },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("persists generated assets and writes a gitignored dedup cache", () => {
    const dir = mkdtempSync(join(tmpdir(), "visual-persist-"));
    try {
      const outputRoot = join(dir, "site/public/assets/generated");
      const cacheRoot = join(dir, ".webster/generated-cache");
      const persisted = persistGeneratedVisualAsset(
        {
          status: "generated",
          type: "og_card",
          mime_type: "image/png",
          base64_data: Buffer.from("fake image").toString("base64"),
          estimated_cost_usd: 0.25,
        },
        "2026-04-23",
        "Hero OG Card!",
        { outputRoot, cacheRoot },
      );

      expect(persisted.path).toBe(join(outputRoot, "2026-04-23/og_card-hero-og-card.png"));
      expect(existsSync(persisted.path)).toBe(true);
      expect(readFileSync(persisted.path, "utf8")).toBe("fake image");
      expect(existsSync(join(cacheRoot, `${persisted.cache_key}.png`))).toBe(true);

      const second = persistGeneratedVisualAsset(
        {
          status: "generated",
          type: "og_card",
          mime_type: "image/png",
          base64_data: Buffer.from("fake image").toString("base64"),
          estimated_cost_usd: 0.25,
        },
        "2026-04-23",
        "Hero OG Card!",
        { outputRoot, cacheRoot },
      );
      expect(second.reused_cache).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("falls back to a structured unsupported-size stub before fetching", async () => {
    const input = normalizeGenerateVisualAssetInput({
      type: "og_card",
      brand_context: {},
      dims: { width: 1111, height: 777 },
      prompt: "OG card",
    });
    let calls = 0;

    await expect(
      generateVisualAsset(input, {
        apiKey: "test-key",
        fetchImpl: async () => {
          calls += 1;
          return new Response(JSON.stringify({ data: [{ b64_json: "abc123" }] }), { status: 200 });
        },
      }),
    ).resolves.toMatchObject({ status: "stub", reason: "unsupported-image-size" });
    expect(calls).toBe(0);
  });

  test("falls back to a structured NSFW stub on safety rejection", async () => {
    const input = normalizeGenerateVisualAssetInput({
      type: "testimonial_headshot",
      brand_context: {},
      dims: { width: 1024, height: 1024 },
      prompt: "Headshot",
    });

    await expect(
      generateVisualAsset(input, {
        apiKey: "test-key",
        fetchImpl: async () => new Response("NSFW content_policy violation", { status: 400 }),
      }),
    ).resolves.toMatchObject({ status: "stub", reason: "nsfw-filter" });
  });
});
