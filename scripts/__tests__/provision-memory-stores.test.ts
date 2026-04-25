import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROLES,
  SUBSTRATES,
  memoryStoreName,
  provisionMemoryStores,
  type MemoryStoreManifest,
} from "../provision-memory-stores.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeTempPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "webster-memory-stores-"));
  return { dir, path: join(dir, "memory-stores.json") };
}

function flattenManifest(manifest: MemoryStoreManifest): string[] {
  return SUBSTRATES.flatMap((substrate) => ROLES.map((role) => manifest[substrate][role]));
}

function readManifest(path: string): MemoryStoreManifest {
  return JSON.parse(readFileSync(path, "utf8")) as MemoryStoreManifest;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("provisionMemoryStores", () => {
  test("creates all 12 memory stores and writes substrate-role manifest", async () => {
    const { dir, path } = makeTempPath();
    const createdNames: string[] = [];

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (url === "https://api.anthropic.com/v1/memory_stores" && !init?.method) {
        return jsonResponse({ data: [], has_more: false });
      }
      if (url === "https://api.anthropic.com/v1/memory_stores" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { name: string };
        createdNames.push(body.name);
        return jsonResponse({ id: `memstore_${String(createdNames.length).padStart(2, "0")}` });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    try {
      const manifest = await provisionMemoryStores("test-key", path);

      expect(createdNames).toHaveLength(12);
      expect(createdNames).toContain("webster-council-memory-lp");
      expect(createdNames).toContain("webster-visual-reviewer-memory-site");
      expect(flattenManifest(manifest).every((id) => id.startsWith("memstore_"))).toBe(true);
      expect(readManifest(path)).toEqual(manifest);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("is idempotent by reusing an existing manifest without API calls", async () => {
    const { dir, path } = makeTempPath();
    const manifest = {
      lp: {
        council: "memstore_lp_council",
        planner: "memstore_lp_planner",
        redesigner: "memstore_lp_redesigner",
        genealogy: "memstore_lp_genealogy",
        "conversion-critic": "memstore_lp_conversion",
        "visual-reviewer": "memstore_lp_visual",
      },
      site: {
        council: "memstore_site_council",
        planner: "memstore_site_planner",
        redesigner: "memstore_site_redesigner",
        genealogy: "memstore_site_genealogy",
        "conversion-critic": "memstore_site_conversion",
        "visual-reviewer": "memstore_site_visual",
      },
    } satisfies MemoryStoreManifest;
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);

    globalThis.fetch = (async () => {
      throw new Error("should not call API when manifest is complete");
    }) as unknown as typeof fetch;

    try {
      await expect(provisionMemoryStores("test-key", path)).resolves.toEqual(manifest);
      expect(readManifest(path)).toEqual(manifest);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("walks paginated lookup and reuses stores found on page 2", async () => {
    const { dir, path } = makeTempPath();
    const requestedUrls: string[] = [];
    const targetName = memoryStoreName("lp", "council");

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      requestedUrls.push(String(input));
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { name: string };
        return jsonResponse({ id: `created-${body.name}` });
      }
      if (!String(input).includes("after_id")) {
        return jsonResponse({
          data: [{ id: "memstore_other", name: "other-store" }],
          has_more: true,
          last_id: "memstore_other",
        });
      }
      return jsonResponse({ data: [{ id: "memstore_page_2", name: targetName }], has_more: false });
    }) as typeof fetch;

    try {
      const manifest = await provisionMemoryStores("test-key", path);

      expect(manifest.lp.council).toBe("memstore_page_2");
      expect(requestedUrls).toContain(
        "https://api.anthropic.com/v1/memory_stores?after_id=memstore_other",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws on network failure and keeps partial manifest for resume", async () => {
    const { dir, path } = makeTempPath();
    let creates = 0;

    globalThis.fetch = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (!init?.method) {
        return jsonResponse({ data: [], has_more: false });
      }
      creates += 1;
      if (creates === 2) {
        return new Response("upstream unavailable", { status: 503 });
      }
      return jsonResponse({ id: `memstore_created_${creates}` });
    }) as typeof fetch;

    try {
      await expect(provisionMemoryStores("test-key", path)).rejects.toThrow(
        "memory store create failed",
      );
      const partial = readManifest(path);
      expect(partial.lp.council).toBe("memstore_created_1");
      expect(partial.lp.planner).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resumes after partial completion without recreating existing manifest ids", async () => {
    const { dir, path } = makeTempPath();
    const partial = {
      lp: {
        council: "memstore_existing_council",
        planner: "",
        redesigner: "",
        genealogy: "",
        "conversion-critic": "",
        "visual-reviewer": "",
      },
      site: {
        council: "",
        planner: "",
        redesigner: "",
        genealogy: "",
        "conversion-critic": "",
        "visual-reviewer": "",
      },
    } satisfies MemoryStoreManifest;
    const createdNames: string[] = [];
    writeFileSync(path, `${JSON.stringify(partial, null, 2)}\n`);

    globalThis.fetch = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      if (!init?.method) {
        return jsonResponse({ data: [], has_more: false });
      }
      const body = JSON.parse(String(init.body)) as { name: string };
      createdNames.push(body.name);
      return jsonResponse({ id: `memstore_resume_${createdNames.length}` });
    }) as typeof fetch;

    try {
      const manifest = await provisionMemoryStores("test-key", path);

      expect(manifest.lp.council).toBe("memstore_existing_council");
      expect(createdNames).not.toContain("webster-council-memory-lp");
      expect(createdNames).toHaveLength(11);
      expect(flattenManifest(manifest).every(Boolean)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
