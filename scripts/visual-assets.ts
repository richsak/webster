#!/usr/bin/env bun

export const VISUAL_ASSET_TYPES = [
  "og_card",
  "hero_background",
  "testimonial_headshot",
  "icon",
  "section_illustration",
] as const;

export type VisualAssetType = (typeof VISUAL_ASSET_TYPES)[number];

export interface VisualAssetDims {
  width: number;
  height: number;
}

export interface GenerateVisualAssetInput {
  type: VisualAssetType;
  brand_context: Record<string, unknown>;
  dims: VisualAssetDims;
  prompt: string;
}

export interface StubVisualAsset {
  status: "stub";
  type: string;
  comment: string;
}

export const GENERATE_VISUAL_ASSET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["type", "brand_context", "dims", "prompt"],
  properties: {
    type: {
      type: "string",
      enum: VISUAL_ASSET_TYPES,
    },
    brand_context: {
      type: "object",
      additionalProperties: true,
    },
    dims: {
      type: "object",
      additionalProperties: false,
      required: ["width", "height"],
      properties: {
        width: { type: "integer", minimum: 1, maximum: 4096 },
        height: { type: "integer", minimum: 1, maximum: 4096 },
      },
    },
    prompt: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

export function isVisualAssetType(value: string): value is VisualAssetType {
  return VISUAL_ASSET_TYPES.some((type) => type === value);
}

export function buildUnknownAssetTypeStub(type: string): StubVisualAsset {
  return {
    status: "stub",
    type,
    comment: `<!-- asset TBD: unknown visual asset type '${type}' -->`,
  };
}

export function normalizeGenerateVisualAssetInput(
  value: unknown,
): GenerateVisualAssetInput | StubVisualAsset {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return buildUnknownAssetTypeStub("invalid-input");
  }

  const record = value as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "missing-type";
  if (!isVisualAssetType(type)) {
    return buildUnknownAssetTypeStub(type);
  }

  const dims = record.dims as Partial<VisualAssetDims> | undefined;
  if (
    !dims ||
    !Number.isInteger(dims.width) ||
    !Number.isInteger(dims.height) ||
    (dims.width as number) < 1 ||
    (dims.height as number) < 1
  ) {
    throw new Error("generate_visual_asset dims must include positive integer width and height");
  }

  if (typeof record.prompt !== "string" || record.prompt.length === 0) {
    throw new Error("generate_visual_asset prompt must be a non-empty string");
  }

  return {
    type,
    brand_context:
      typeof record.brand_context === "object" && record.brand_context !== null
        ? (record.brand_context as Record<string, unknown>)
        : {},
    dims: {
      width: dims.width as number,
      height: dims.height as number,
    },
    prompt: record.prompt,
  };
}
