#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

interface Args {
  url: string;
  outDir: string;
}

interface PageLike {
  on(event: "console", handler: (message: { type(): string; text(): string }) => void): void;
  on(event: "pageerror", handler: (error: Error) => void): void;
  goto(url: string, options: { waitUntil: "networkidle"; timeout: number }): Promise<void>;
  screenshot(options: { path: string; fullPage: boolean }): Promise<void>;
  evaluate<T>(callback: string): Promise<T>;
  close(): Promise<void>;
}

interface BrowserLike {
  newPage(options: { viewport: { width: number; height: number } }): Promise<PageLike>;
  close(): Promise<void>;
}

function parseArgs(argv: string[]): Args {
  const url = argv[0];
  const outFlag = argv.indexOf("--out");
  const outDir = outFlag >= 0 ? argv[outFlag + 1] : undefined;
  if (!url || !outDir) {
    throw new Error("Usage: bun scripts/browser-audit.ts <url> --out <dir>");
  }
  return { url, outDir };
}

async function main(): Promise<void> {
  const args = parseArgs(Bun.argv.slice(2));
  mkdirSync(args.outDir, { recursive: true });

  let playwright: { chromium: { launch(options: { headless: boolean }): Promise<BrowserLike> } };
  try {
    if (process.env.WEBSTER_FORCE_BROWSER_AUDIT_FALLBACK === "1") {
      throw new Error("WEBSTER_FORCE_BROWSER_AUDIT_FALLBACK=1");
    }
    playwright = (await new Function("specifier", "return import(specifier)")("playwright")) as {
      chromium: { launch(options: { headless: boolean }): Promise<BrowserLike> };
    };
  } catch (error) {
    const playwrightError = error instanceof Error ? error.stack || error.message : String(error);
    const unavailableReason = "Playwright import failed; Screenshot capture unavailable.";
    const summary = {
      url: args.url,
      screenshot_capture_unavailable: unavailableReason,
      playwright_error: playwrightError,
      breakpoints: BREAKPOINTS.map((breakpoint) => ({ ...breakpoint, screenshot: null })),
      cta_count: 0,
      console_errors: [],
      page_errors: [],
    };
    writeFileSync(join(args.outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(args.outDir, "a11y-text.txt"), `${unavailableReason}\n${playwrightError}\n`);
    return;
  }

  const browser = await playwright.chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const summaries = [];
  let a11yText = "";
  let ctaCount = 0;

  try {
    for (const breakpoint of BREAKPOINTS) {
      const page = await browser.newPage({ viewport: breakpoint });
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.goto(args.url, { waitUntil: "networkidle", timeout: 30000 });
      const screenshot = `${breakpoint.name}.png`;
      await page.screenshot({ path: join(args.outDir, screenshot), fullPage: true });
      const metrics = await page.evaluate<{
        documentHeight: number;
        horizontalOverflow: boolean;
        text: string;
        ctaCount: number;
      }>(`(() => ({
        documentHeight: document.documentElement.scrollHeight,
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        text: document.body.innerText,
        ctaCount: document.querySelectorAll("a[href], button").length,
      }))()`);
      if (breakpoint.name === "desktop") {
        a11yText = metrics.text;
        ctaCount = metrics.ctaCount;
      }
      summaries.push({
        ...breakpoint,
        screenshot,
        document_height: metrics.documentHeight,
        horizontal_overflow: metrics.horizontalOverflow,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  writeFileSync(join(args.outDir, "a11y-text.txt"), `${a11yText}\n`);
  writeFileSync(
    join(args.outDir, "console.json"),
    `${JSON.stringify({ console_errors: consoleErrors, page_errors: pageErrors }, null, 2)}\n`,
  );
  writeFileSync(
    join(args.outDir, "interactions.json"),
    `${JSON.stringify({ recorded: ["scroll", "cta-scan"] }, null, 2)}\n`,
  );
  writeFileSync(
    join(args.outDir, "summary.json"),
    `${JSON.stringify({ url: args.url, breakpoints: summaries, cta_count: ctaCount, console_errors: consoleErrors, page_errors: pageErrors }, null, 2)}\n`,
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
