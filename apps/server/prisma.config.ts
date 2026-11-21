import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env itself; use Node's built-in loader instead of dotenv
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema",
  migrations: { path: "prisma/migrations" },
  // Optional so `prisma generate` (postinstall, CI) works without a database; migrate needs it
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
