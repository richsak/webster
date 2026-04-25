#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

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

export interface PersistedVisualAsset {
  path: string;
  cache_key: string;
  reused_cache: boolean;
}

export interface StubVisualAsset {
  status: "stub";
  type: string;
  comment: string;
  reason?: string;
}

export interface GeneratedVisualAsset {
  status: "generated";
  type: VisualAssetType;
  mime_type: string;
  base64_data: string;
  estimated_cost_usd: number;
}

export interface GenerateVisualAssetOptions {
  apiKey?: string;
  model?: string;
  maxCostUsd?: number;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>;
  retryDelaysMs?: number[];
}

export const DEFAULT_IMAGE_MODEL = "gpt-image-1";
export const DEFAULT_IMAGE_COST_CEILING_USD = 2;
export const ESTIMATED_IMAGE_COST_USD = 0.25;

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

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug.length > 0 ? slug : "asset";
}

function parseBusinessTable(markdown: string): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const line of markdown.split("\n")) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!match || match[1]?.trim() === "Field") {
      continue;
    }
    const key = slugify(match[1] ?? "").replace(/-/g, "_");
    rows[key] = (match[2] ?? "").trim();
  }
  return rows;
}

function extractSection(markdown: string, heading: string): string | undefined {
  const regex = new RegExp(`## ${heading}\\n+([\\s\\S]*?)(?:\\n## |$)`, "i");
  return markdown.match(regex)?.[1]?.trim();
}

export function loadBrandContext(
  businessPath = "context/business.md",
  palettePath = "context/palette.json",
): Record<string, unknown> {
  const business = existsSync(businessPath) ? readFileSync(businessPath, "utf8") : "";
  let palette: Record<string, unknown> = {};
  if (existsSync(palettePath)) {
    try {
      palette = JSON.parse(readFileSync(palettePath, "utf8")) as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse palette JSON at ${palettePath}: ${message}`);
    }
  }

  return {
    identity: parseBusinessTable(business),
    voice: extractSection(business, "Brand voice \\(one-liner\\)") ?? "",
    positioning: extractSection(business, "Certification positioning") ?? "",
    signature_phrase: business.match(/"([^"]+)"/)?.[1] ?? "",
    palette,
  };
}

export function buildUnknownAssetTypeStub(type: string, reason = "unknown-type"): StubVisualAsset {
  return {
    status: "stub",
    type,
    reason,
    comment: `<!-- asset TBD: unknown visual asset type '${type}' -->`,
  };
}

function buildAssetStub(type: string, reason: string): StubVisualAsset {
  return {
    status: "stub",
    type,
    reason,
    comment: `<!-- asset TBD: ${type}; ${reason} -->`,
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

const OPENAI_IMAGE_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);

function openAiImageSizeForDims(dims: VisualAssetDims): string | undefined {
  const requested = `${dims.width}x${dims.height}`;
  return OPENAI_IMAGE_SIZES.has(requested) ? requested : undefined;
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function structuredErrorReason(status: number, body: string): string {
  const lowerBody = body.toLowerCase();
  if (status === 429 || lowerBody.includes("rate limit")) {
    return "rate-limit";
  }
  if (
    lowerBody.includes("safety") ||
    lowerBody.includes("content_policy") ||
    lowerBody.includes("nsfw")
  ) {
    return "nsfw-filter";
  }
  return `openai-error-${status}`;
}

function extractImageBase64(response: unknown): string | undefined {
  if (
    typeof response !== "object" ||
    response === null ||
    !Array.isArray((response as { data?: unknown }).data)
  ) {
    return undefined;
  }

  const first = ((response as { data: unknown[] }).data[0] ?? {}) as Record<string, unknown>;
  return typeof first.b64_json === "string" ? first.b64_json : undefined;
}

function isStubVisualAsset(
  input: GenerateVisualAssetInput | StubVisualAsset,
): input is StubVisualAsset {
  return "status" in input && input.status === "stub";
}

export function persistGeneratedVisualAsset(
  asset: GeneratedVisualAsset,
  week: string,
  slug: string,
  options: { outputRoot?: string; cacheRoot?: string } = {},
): PersistedVisualAsset {
  const extension = asset.mime_type === "image/jpeg" ? "jpg" : "png";
  const safeSlug = slugify(slug);
  const outputPath = join(
    options.outputRoot ?? "site/public/assets/generated",
    week,
    `${asset.type}-${safeSlug}.${extension}`,
  );
  const cacheKey = createHash("sha256").update(asset.base64_data).digest("hex");
  const cachePath = join(
    options.cacheRoot ?? ".webster/generated-cache",
    `${cacheKey}.${extension}`,
  );
  const bytes = Buffer.from(asset.base64_data, "base64");
  const reusedCache = existsSync(cachePath);

  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(cachePath), { recursive: true });
  if (!reusedCache) {
    writeFileSync(cachePath, bytes);
  }
  writeFileSync(outputPath, bytes);

  return {
    path: outputPath,
    cache_key: cacheKey,
    reused_cache: reusedCache,
  };
}

export async function generateVisualAsset(
  input: GenerateVisualAssetInput | StubVisualAsset,
  options: GenerateVisualAssetOptions = {},
): Promise<GeneratedVisualAsset | StubVisualAsset> {
  if (isStubVisualAsset(input)) {
    return input;
  }

  const maxCostUsd = options.maxCostUsd ?? DEFAULT_IMAGE_COST_CEILING_USD;
  if (ESTIMATED_IMAGE_COST_USD > maxCostUsd) {
    return buildAssetStub(input.type, "cost-ceiling");
  }

  const apiKey = options.apiKey === undefined ? process.env.OPENAI_API_KEY : options.apiKey;
  if (!apiKey) {
    return buildAssetStub(input.type, "missing-openai-api-key");
  }

  const openAiSize = openAiImageSizeForDims(input.dims);
  if (!openAiSize) {
    return buildAssetStub(input.type, "unsupported-image-size");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const retryDelaysMs = options.retryDelaysMs ?? [250, 1000];
  const attempts = retryDelaysMs.length + 1;
  let lastReason = "unknown-openai-error";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model ?? DEFAULT_IMAGE_MODEL,
        prompt: `${input.prompt}\n\nBrand context: ${JSON.stringify(input.brand_context)}`,
        size: openAiSize,
        response_format: "b64_json",
      }),
    });

    const body = await response.text();
    if (response.ok) {
      try {
        const base64 = extractImageBase64(JSON.parse(body));
        return base64
          ? {
              status: "generated",
              type: input.type,
              mime_type: "image/png",
              base64_data: base64,
              estimated_cost_usd: ESTIMATED_IMAGE_COST_USD,
            }
          : buildAssetStub(input.type, "missing-image-data");
      } catch {
        return buildAssetStub(input.type, "invalid-json");
      }
    }

    lastReason = structuredErrorReason(response.status, body);
    if (!shouldRetry(response.status) || attempt === attempts - 1) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt] ?? 0));
  }

  return buildAssetStub(input.type, lastReason);
}
