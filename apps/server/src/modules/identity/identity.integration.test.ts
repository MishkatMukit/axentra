import { createHash, randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";

const refreshCookie = (res: request.Response) => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  return cookies.find((c) => c.startsWith("axentra_rt="))?.split(";")[0];
};
const tokenHash = (cookie: string) => createHash("sha256").update(cookie.split("=")[1]!).digest("hex");

// Runs only with TEST_DATABASE_URL set. Every row it creates uses this run's email prefix and is deleted afterwards.
describe.skipIf(!process.env.TEST_DATABASE_URL)("auth (integration)", () => {
  const app = createApp();
  const prefix = `it-${randomUUID().slice(0, 8)}`;
  const email = `${prefix}@axentra.test`;
  const password = "correct horse battery";
  const login = () => request(app).post("/api/v1/auth/login").send({ email, password });
  const refresh = (cookie: string) => request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);

  afterAll(async () => {
    // Profile and RefreshToken rows cascade from User
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  describe("register and login", () => {
    it("registers a user and its 1:1 profile, and starts a session", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: `  ${email.toUpperCase()} `, password, fullName: "Test User" });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({ email, authProvider: "LOCAL", emailVerified: false, hasGoogleLinked: false });
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(JSON.stringify(res.body)).not.toContain("passwordHash");

      const setCookie = ([] as string[]).concat(res.headers["set-cookie"] ?? []).join(";");
      expect(setCookie).toMatch(/HttpOnly/i);
      expect(setCookie).toMatch(/SameSite=Lax/i);
      expect(setCookie).toMatch(/Path=\/api\/v1\/auth/);
      expect(setCookie).toMatch(/Secure/i);

      const user = await prisma.user.findUnique({ where: { email }, include: { profile: true, refreshTokens: true } });
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      expect(user?.profile).toMatchObject({ fullName: "Test User", timezone: "Asia/Dhaka", dayCutoffHour: 4 });
      // Only the hash is stored, never the raw token
      expect(user?.refreshTokens[0]?.tokenHash).toBe(tokenHash(refreshCookie(res)!));
    });

    it("returns 409 for a duplicate email, regardless of case", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({ email: email.toUpperCase(), password, fullName: "Someone Else" });

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ success: false, message: "An account with this email already exists" });
    });

    it("logs in with the right password and records the login time", async () => {
      const res = await login();

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(email);
      expect(refreshCookie(res)).toBeDefined();
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.lastLoginAt).toBeInstanceOf(Date);
    });

    it("gives the same 401 for a wrong password and an unknown email", async () => {
      const wrong = await request(app).post("/api/v1/auth/login").send({ email, password: "wrong password" });
      const unknown = await request(app).post("/api/v1/auth/login").send({ email: `${prefix}-x@axentra.test`, password });

      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });
  });

  describe("access token", () => {
    it("lets /auth/me through with a valid access token", async () => {
      const { body } = await login();
      const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email, authProvider: "LOCAL" });
    });
  });

  describe("refresh rotation", () => {
    it("rotates: the new token works, and the old one is rejected after use", async () => {
      const a = refreshCookie(await login())!;

      const first = await refresh(a);
      expect(first.status).toBe(200);
      expect(first.body.data.accessToken).toEqual(expect.any(String));
      const b = refreshCookie(first)!;
      expect(b).not.toBe(a);

      const reused = await refresh(a);
      expect(reused.status).toBe(401);
      // Clears the dead cookie
      expect(([] as string[]).concat(reused.headers["set-cookie"] ?? []).join(";")).toMatch(/axentra_rt=;/);

      // Within the grace window a reuse is treated as a parallel refresh, so B survives
      expect((await refresh(b)).status).toBe(200);
    });

    it("treats reuse after the grace window as theft and ends every session", async () => {
      const a = refreshCookie(await login())!;
      const b = refreshCookie(await refresh(a))!;
      const other = refreshCookie(await login())!; // a second device

      // Pretend A was rotated a minute ago
      await prisma.refreshToken.update({
        where: { tokenHash: tokenHash(a) },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      expect((await refresh(a)).status).toBe(401);
      expect((await refresh(b)).status).toBe(401);
      expect((await refresh(other)).status).toBe(401);
    });

    it("rejects an expired refresh token", async () => {
      const a = refreshCookie(await login())!;
      await prisma.refreshToken.update({ where: { tokenHash: tokenHash(a) }, data: { expiresAt: new Date(Date.now() - 1000) } });

      expect((await refresh(a)).status).toBe(401);
    });
  });

  describe("logout", () => {
    it("revokes the refresh token and clears the cookie", async () => {
      const a = refreshCookie(await login())!;

      const res = await request(app).post("/api/v1/auth/logout").set("Cookie", a);
      expect(res.status).toBe(204);
      expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).join(";")).toMatch(/axentra_rt=;/);

      expect((await refresh(a)).status).toBe(401);
    });
  });
});
