import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApp } from "../../app.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../errors.js";
import catchAsync from "../utils/catchAsync.js";
import { globalErrorHandler } from "./globalErrorHandler.js";
import { requestId } from "./requestId.js";
import { validate } from "./validate.js";

// Mini app wired like createApp, with routes that trigger each error path
const testApp = () => {
  const app = express();
  app.use(requestId);
  app.use(express.json());
  app.post("/signup", validate(z.object({ email: z.email() })), (req, res) => {
    res.json({ received: req.body });
  });
  app.get("/app-error", catchAsync(async () => {
    throw new AppError("Habit not found", 404);
  }));
  app.get("/duplicate", catchAsync(async () => {
    throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "7.10.1" });
  }));
  app.get("/crash", catchAsync(async () => {
    throw new Error("secret internal detail");
  }));
  app.use(globalErrorHandler);
  return app;
};

describe("error pipeline", () => {
  it("returns 400 with the error shape for an invalid body", async () => {
    const res = await request(testApp()).post("/signup").send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, statusCode: 400, name: "ZodError" });
    expect(res.body.message).toMatch(/^email: /);
    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
  });

  it("passes a valid body through, parsed", async () => {
    const res = await request(testApp()).post("/signup").send({ email: "a@b.co", extra: 1 });

    expect(res.status).toBe(200);
    expect(res.body.received).toEqual({ email: "a@b.co" }); // unknown keys stripped
  });

  it("maps AppError to its status and message", async () => {
    const res = await request(testApp()).get("/app-error");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Habit not found");
  });

  it("maps Prisma P2002 to 409", async () => {
    const res = await request(testApp()).get("/duplicate");

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Duplicate Key Error");
  });

  it("hides 5xx details outside development", async () => {
    const res = await request(testApp()).get("/crash");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal Server Error");
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
    expect(res.body.stack).toBeUndefined();
  });
});

describe("app", () => {
  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(createApp()).get("/api/v1/nope");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: "Route not found: GET /api/v1/nope" });
  });

  it("reuses a safe incoming x-request-id and rejects unsafe ones", async () => {
    const reused = await request(createApp()).get("/api/v1/nope").set("x-request-id", "trace-123");
    const unsafe = await request(createApp()).get("/api/v1/nope").set("x-request-id", "bad id <script>");

    expect(reused.body.requestId).toBe("trace-123");
    expect(unsafe.body.requestId).toMatch(/^req_[0-9a-f-]{36}$/);
  });

  it("reports degraded health when the database is unreachable", async () => {
    const res = await request(createApp()).get("/api/v1/health");

    expect(res.status).toBe(503);
    expect(res.body.data).toEqual({ status: "degraded", db: "down" });
  });
});
