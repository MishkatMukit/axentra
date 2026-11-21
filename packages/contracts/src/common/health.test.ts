import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./health.ts";

describe("HealthResponseSchema", () => {
  it("accepts ok and degraded states", () => {
    expect(HealthResponseSchema.parse({ status: "ok", db: "ok" })).toEqual({ status: "ok", db: "ok" });
    expect(HealthResponseSchema.safeParse({ status: "degraded", db: "down" }).success).toBe(true);
  });

  it("rejects unknown states and missing fields", () => {
    expect(HealthResponseSchema.safeParse({ status: "down", db: "ok" }).success).toBe(false);
    expect(HealthResponseSchema.safeParse({ status: "ok" }).success).toBe(false);
  });
});
