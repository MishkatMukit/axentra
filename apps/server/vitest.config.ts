import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["development"] },
  ssr: { resolve: { conditions: ["development"] } },
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Unreachable on purpose: unit tests must not depend on a real database
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/axentra_test",
    },
  },
});
