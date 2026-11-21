import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["development"] },
  ssr: { resolve: { conditions: ["development"] } },
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Integration tests run only when TEST_DATABASE_URL is set; otherwise the DB is unreachable on purpose
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://test:test@127.0.0.1:1/axentra_test",
    },
  },
});
