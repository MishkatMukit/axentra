import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { verifyAccessToken } from "../../infrastructure/auth/jwt.js";
import { AppError } from "../errors.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string };
  }
}

// Stateless: trusts the 15-minute access token; disabled accounts are cut off at the next refresh
export const auth: RequestHandler = async (req, _res, next) => {
  const [scheme, token] = req.get("authorization")?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Authentication required", httpStatus.UNAUTHORIZED));
  }
  try {
    const { userId } = await verifyAccessToken(token);
    req.user = { id: userId };
    next();
  } catch {
    next(new AppError("Invalid or expired access token", httpStatus.UNAUTHORIZED));
  }
};
