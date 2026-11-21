import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

const config = {
  node_env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  database_url: parsed.data.DATABASE_URL,
  jwt_access_secret: parsed.data.JWT_ACCESS_SECRET,
  access_token_ttl: "15m",
  refresh_token_ttl_ms: 14 * 24 * 60 * 60 * 1000,
};

export default config;
