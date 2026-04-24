#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";

interface IntentCheck {
  issue: string;
  status: "PASS" | "FAIL";
  expected_phrases: string[];
  missing_phrases: string[];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function extractExpectedPhrases(proposal: string): string[] {
  const quoted = Array.from(
    proposal.matchAll(/[“"]([^”"\n]{12,160})[”"]/g),
    (match) => match[1] ?? "",
  );
  const htmlText = Array.from(proposal.matchAll(/>([^<>]{12,160})</g), (match) => match[1] ?? "");
  return Array.from(new Set([...quoted, ...htmlText].map((value) => value.trim()).filter(Boolean)));
}

export function verifyProposalIntent(proposal: string, renderedText: string): IntentCheck[] {
  const rendered = normalize(renderedText);
  const headingMatches = Array.from(proposal.matchAll(/^###\s+\d+\.\s+.+$/gm));
  const sections = headingMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = headingMatches[index + 1]?.index ?? proposal.length;
    return proposal.slice(start, end);
  });

  return sections.map((section, index) => {
    const title = section.match(/^###\s+\d+\.\s+(.+)$/m)?.[1] ?? `Issue ${index + 1}`;
    const expected = extractExpectedPhrases(section).filter(
      (phrase) => phrase.split(/\s+/).length >= 3,
    );
    const missing = expected.filter((phrase) => !rendered.includes(normalize(phrase)));
    return {
      issue: title,
      status: missing.length === 0 ? "PASS" : "FAIL",
      expected_phrases: expected,
      missing_phrases: missing,
    };
  });
}

function main(): void {
  const [proposalPath, renderedTextPath, outPath] = Bun.argv.slice(2);
  if (!proposalPath || !renderedTextPath || !outPath) {
    throw new Error(
      "Usage: bun scripts/proposal-intent-verifier.ts <proposal.md> <a11y-text.txt> <out.json>",
    );
  }
  const checks = verifyProposalIntent(
    readFileSync(proposalPath, "utf8"),
    readFileSync(renderedTextPath, "utf8"),
  );
  writeFileSync(outPath, `${JSON.stringify({ checks }, null, 2)}\n`);
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
