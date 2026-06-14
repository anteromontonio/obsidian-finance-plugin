import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/",
      "**/docs-site/",
      "**/scripts/",
      "main.js",
      "test-build.js",
      "esbuild.config.mjs",
      "version-bump.mjs",
      "eslint.config.mjs",
      "package.json",
      "package-lock.json",
      "**/*.json"
    ]
  },
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      }
    },
    rules: {
      "obsidianmd/ui/sentence-case": ["error", {
        "enforceCamelCaseLower": true,
        "acronyms": ["BQL", "USD", "INR", "EUR", "BTC", "GOLD", "CSV", "AST", "HTML", "UI", "URL", "YYYY-MM-DD", "BQL-q"],
        "ignoreWords": ["Beancount", "Markdown", "markdown", "Python", "GitHub", "Beancount settings", "Beancount snapshot", "Beancount dashboard", "Beancount configuration", "Transactions/2025.beancount", "Transactions/2025/2025-01.beancount", "queries.beancount", "bql-q:name", "bql:name", "assets:bank:checking"]
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "args": "none", "caughtErrors": "none" }]
    }
  }
]);
