import obsidianmd from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "**/docs-site/",
      "**/scripts/",
      "**/.venv/",
      "**/venv/",
      "main.js",
      "test-build.js",
      "eslint.config.mjs",
      "package.json",
      "package-lock.json",
      "**/*.json"
    ]
  },
  ...obsidianmd.configs.recommended,
  {
    // Override rules that require type information for all JavaScript files
    files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "obsidianmd/no-plugin-as-component": "off"
    }
  },
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "args": "none", "caughtErrors": "none" }],
      "no-unused-vars": "off",
      "obsidianmd/ui/sentence-case": "off"
    }
  }
);
