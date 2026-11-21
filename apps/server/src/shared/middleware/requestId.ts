import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

// Reuse a caller-supplied id (e.g. from a proxy) when it looks sane, otherwise mint one
const SAFE_ID = /^[\w.-]{1,128}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get("x-request-id");
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : `req_${randomUUID()}`;
  res.setHeader("x-request-id", req.id);
  next();
};
