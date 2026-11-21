import { SignJWT } from "jose";
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

describe("auth guards (no database)", () => {
  const app = createApp();

  it("rejects /auth/me without, with a malformed, or with a forged token", async () => {
    const forged = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u1").setIssuer("axentra-api")
      .setExpirationTime("15m").sign(new TextEncoder().encode("a-different-secret-that-is-32-chars!!"));

    for (const header of [undefined, "Bearer", "Basic abc", "Bearer not.a.jwt", `Bearer ${forged}`]) {
      const req = request(app).get("/api/v1/auth/me");
      const res = await (header ? req.set("Authorization", header) : req);
      expect(res.status).toBe(401);
    }
  });

  it("rejects an expired access token", async () => {
    const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u1").setIssuer("axentra-api")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600).setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired access token");
  });

  it("rejects /auth/refresh without a cookie", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("logs out cleanly even without a cookie", async () => {
    const res = await request(app).post("/api/v1/auth/logout");

    expect(res.status).toBe(204);
  });
});
