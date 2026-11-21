import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

// Validation runs before any database access, so these need no database
describe("auth validation", () => {
  const app = createApp();

  it.each([
    [{ email: "nope", password: "longenough", fullName: "A" }, /^email: /],
    [{ email: "a@b.co", password: "short", fullName: "A" }, /at least 8/],
    [{ email: "a@b.co", password: "é".repeat(37), fullName: "A" }, /at most 72 bytes/], // 74 bytes
    [{ email: "a@b.co", password: "longenough", fullName: "   " }, /Full name is required/],
  ])("rejects an invalid register body %#", async (body, message) => {
    const res = await request(app).post("/api/v1/auth/register").send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
  });

  it("rejects a login without a password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "a@b.co" });

    expect(res.status).toBe(400);
  });
});
