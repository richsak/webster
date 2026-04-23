# site/ Fork Checklist

Run this the moment `site/` is forked from `certified.richerhealth.ca`. Everything here is a one-shot onboarding for the submitted code's own quality gates. Root-level webster gates (JSON schemas, findings validator, markdownlint) already run against the repo and will continue to; this page covers what to add _inside_ `site/`.

## Build surface

- `site/package.json` exists with Astro scripts
- `site/bun.lock` committed
- `bun install --frozen-lockfile` in `site/` succeeds on CI
- `bun run build` in `site/` succeeds (will flip on the `site-build` job in `.github/workflows/test.yml`)

## site/ toolchain to install

```bash
cd site
bun add -D @astrojs/check astro-eslint-parser eslint-plugin-astro prettier-plugin-astro
```

## site/eslint.config.js

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default tseslint.config(
  { ignores: ["dist", ".astro", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
);
```

## site/.prettierrc (inherits from root)

```json
{ "plugins": ["prettier-plugin-astro"] }
```

## site/package.json scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "lint": "eslint . --cache --max-warnings 0",
    "format:check": "prettier --check .",
    "type-check": "astro check"
  }
}
```

## Root workflow flips

Once `site/package.json` exists, the `site-build` job in `.github/workflows/test.yml` starts running. Additions to make at the same time:

- Add `site-lint` job running `bun run lint --max-warnings 0` in `site/`
- Add `site-format` job running `bun run format:check` in `site/`
- Remove `continue-on-error` from any remaining site-build steps once it's stable

## Pre-commit hook bump

When `site/` lands, append to `.husky/pre-commit`:

```sh
if [ -d site ]; then
  (cd site && bun run lint --max-warnings 0 && bun run format:check) || exit 1
fi
```

## Playwright (Day 5 polish, optional)

If time holds after core fan-out + redesigner works:

```bash
cd site
bun add -D @playwright/test
bunx playwright install chromium
```

One smoke test confirming the redesigned LP renders and the Acuity booking CTA is present at `site/tests/hero.spec.ts`. Run in CI matrix against Cloudflare preview URLs.

## Do NOT add preemptively

These buy nothing until `site/` exists, and installing them now balloons the root `node_modules`:

- `astro` / `@astrojs/cloudflare`
- `eslint-plugin-astro` / `astro-eslint-parser`
- `prettier-plugin-astro`
- `@playwright/test`

They go in `site/package.json` when `site/` lands.
