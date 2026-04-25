#!/usr/bin/env bun

import { readFileSync } from "node:fs";

export interface Persona {
  id: string;
  name: string;
  archetype: string;
  goals: string[];
  anxieties: string[];
  conversion_triggers: string[];
  behavior_hints: string[];
}

export interface BrandContext {
  voice: string;
  tone: string[];
  palette: Record<string, string>;
  typography: Record<string, string>;
  signature_phrases: string[];
  do_not_use: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function assertStringArray(value: unknown, path: string, errors: string[], minItems = 1): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  if (value.length < minItems) {
    errors.push(`${path} must contain at least ${minItems} item(s)`);
  }
  value.forEach((item, index) => assertString(item, `${path}[${index}]`, errors));
}

function assertHexPalette(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const entries = Object.entries(value);
  if (entries.length < 3) {
    errors.push(`${path} must contain at least 3 colors`);
  }
  for (const [key, color] of entries) {
    if (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      errors.push(`${path}.${key} must be a #RRGGBB hex color`);
    }
  }
}

export function validatePersonas(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) {
    return ["personas must be an array"];
  }
  if (value.length !== 3) {
    errors.push("personas must contain exactly 3 personas");
  }
  value.forEach((persona, index) => {
    const path = `personas[${index}]`;
    if (!isRecord(persona)) {
      errors.push(`${path} must be an object`);
      return;
    }
    for (const field of ["id", "name", "archetype"] as const) {
      assertString(persona[field], `${path}.${field}`, errors);
    }
    for (const field of ["goals", "anxieties", "conversion_triggers", "behavior_hints"] as const) {
      assertStringArray(persona[field], `${path}.${field}`, errors, 2);
    }
  });
  return errors;
}

export function validateBrandContext(value: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return ["brand must be an object"];
  }
  assertString(value.voice, "brand.voice", errors);
  assertStringArray(value.tone, "brand.tone", errors, 2);
  assertHexPalette(value.palette, "brand.palette", errors);
  if (!isRecord(value.typography)) {
    errors.push("brand.typography must be an object");
  } else {
    assertString(value.typography.heading, "brand.typography.heading", errors);
    assertString(value.typography.body, "brand.typography.body", errors);
  }
  assertStringArray(value.signature_phrases, "brand.signature_phrases", errors, 1);
  assertStringArray(value.do_not_use, "brand.do_not_use", errors, 5);
  return errors;
}

export function validateBusinessMarkdown(markdown: string): string[] {
  const errors: string[] = [];
  if (!markdown.trim().startsWith("#")) {
    errors.push("business.md must start with a heading");
  }
  const lower = markdown.toLowerCase();
  if (!lower.includes("business")) {
    errors.push("business.md must mention Business");
  }
  if (!lower.includes("services") && !lower.includes("certification")) {
    errors.push("business.md must mention services or certification");
  }
  if (!lower.includes("tone") && !lower.includes("voice")) {
    errors.push("business.md must mention tone or voice");
  }
  return errors;
}

export function validateContextDirectory(contextDir: string): string[] {
  const business = readFileSync(`${contextDir}/business.md`, "utf8");
  const personas = JSON.parse(readFileSync(`${contextDir}/personas.json`, "utf8"));
  const brand = JSON.parse(readFileSync(`${contextDir}/brand.json`, "utf8"));
  return [
    ...validateBusinessMarkdown(business),
    ...validatePersonas(personas),
    ...validateBrandContext(brand),
  ];
}

if (import.meta.main) {
  const dirs = Bun.argv.slice(2);
  if (dirs.length === 0) {
    console.error("Usage: bun scripts/context-schema.ts <context-dir> [...context-dir]");
    process.exit(1);
  }
  let failed = false;
  for (const dir of dirs) {
    const errors = validateContextDirectory(dir);
    if (errors.length > 0) {
      failed = true;
      console.error(`${dir}: invalid`);
      for (const error of errors) {
        console.error(`- ${error}`);
      }
    } else {
      console.log(`${dir}: valid`);
    }
  }
  process.exit(failed ? 1 : 0);
}
