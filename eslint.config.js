import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      ".cache",
      ".astro",
      "tmp",
      "coverage",
      "site",
      "history",
      ".claude/checkpoints",
      ".claude/compactions",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: {
        Bun: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "off",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
    },
  },
);
