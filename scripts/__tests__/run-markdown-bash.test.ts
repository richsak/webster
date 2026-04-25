import { describe, expect, test } from "bun:test";
import { extractBashBlocks } from "../run-markdown-bash.ts";

describe("run-markdown-bash", () => {
  test("extracts bash fences in order into one strict script", () => {
    expect(extractBashBlocks("# demo\n\n```bash\none=1\n```\ntext\n```bash\necho $one\n```")).toBe(
      "set -euo pipefail\n\none=1\n\necho $one",
    );
  });

  test("fails when markdown contains no bash fences", () => {
    expect(() => extractBashBlocks("# no shell here")).toThrow("no bash code blocks found");
  });
});
