import { describe, expect, it } from "vitest";
import { RegisterSchema } from "./auth.ts";

describe("RegisterSchema", () => {
  it("normalizes email and trims the name", () => {
    const parsed = RegisterSchema.parse({ email: "  Ada@Example.COM ", password: "longenough", fullName: " Ada " });

    expect(parsed).toEqual({ email: "ada@example.com", password: "longenough", fullName: "Ada" });
  });

  it("accepts exactly 72 bytes and rejects 73", () => {
    const base = { email: "a@b.co", fullName: "A" };

    expect(RegisterSchema.safeParse({ ...base, password: "a".repeat(72) }).success).toBe(true);
    expect(RegisterSchema.safeParse({ ...base, password: "a".repeat(73) }).success).toBe(false);
  });
});
