import { describe, expect, test } from "bun:test";
import {
  GENERATE_VISUAL_ASSET_SCHEMA,
  VISUAL_ASSET_TYPES,
  buildUnknownAssetTypeStub,
  generateVisualAsset,
  normalizeGenerateVisualAssetInput,
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
        dims: { width: 1200, height: 630 },
        prompt: "Create an OG card for Richer Health.",
      }),
    ).toMatchObject({
      type: "og_card",
      dims: { width: 1200, height: 630 },
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
      dims: { width: 1200, height: 630 },
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
      dims: { width: 128, height: 128 },
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

  test("falls back to a structured NSFW stub on safety rejection", async () => {
    const input = normalizeGenerateVisualAssetInput({
      type: "testimonial_headshot",
      brand_context: {},
      dims: { width: 512, height: 512 },
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
