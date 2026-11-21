import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";

// Runs only with TEST_DATABASE_URL set. Every row it creates uses this run's email prefix and is deleted afterwards.
describe.skipIf(!process.env.TEST_DATABASE_URL)("auth (integration)", () => {
  const app = createApp();
  const prefix = `it-${randomUUID().slice(0, 8)}`;
  const email = `${prefix}@axentra.test`;
  const password = "correct horse battery";

  afterAll(async () => {
    // Profile and RefreshToken rows cascade from User
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it("registers a user and its 1:1 profile in one write", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: `  ${email.toUpperCase()} `, password, fullName: "Test User" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email, authProvider: "LOCAL", emailVerified: false, hasGoogleLinked: false });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user?.profile).toMatchObject({ fullName: "Test User", timezone: "Asia/Dhaka", dayCutoffHour: 4 });
  });

  it("returns 409 for a duplicate email, regardless of case", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: email.toUpperCase(), password, fullName: "Someone Else" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, message: "An account with this email already exists" });
  });

  it("logs in with the right password and records the login time", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(email);
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
