import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const CLIENT = "apps/client/**/*.{ts,tsx}";

export default defineConfig([
  globalIgnores(["**/node_modules/", "**/dist/", "**/.next/", "**/src/generated/", "**/next-env.d.ts"]),

  // Base: all TypeScript in the repo
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Warn, not error: the shared error handler intentionally types unknown errors as any
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Server + contracts run on Node
  {
    files: ["apps/server/**/*.ts", "packages/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  // Module boundaries (spec section 3)
  {
    files: ["apps/server/src/modules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*/*.repository*", "../*/*.service*", "../*/*.controller*"],
              message: "Cross-module imports must go through the target module's index.ts facade.",
            },
            {
              group: ["**/config/prisma*", "@prisma/client", "**/generated/prisma*"],
              message: "Only *.repository.ts files may import Prisma.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/server/src/modules/**/*.repository.ts"],
    rules: { "no-restricted-imports": "off" },
  },

  // Client: Next.js + React rules, plus the full jsx-a11y recommended set
  ...nextVitals.map((config) => ({ ...config, files: [CLIENT] })),
  {
    files: [CLIENT],
    languageOptions: { globals: globals.browser },
    settings: { next: { rootDir: "apps/client" } },
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
]);
