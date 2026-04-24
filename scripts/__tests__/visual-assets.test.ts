import { describe, expect, test } from "bun:test";
import {
  GENERATE_VISUAL_ASSET_SCHEMA,
  VISUAL_ASSET_TYPES,
  buildUnknownAssetTypeStub,
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
});
