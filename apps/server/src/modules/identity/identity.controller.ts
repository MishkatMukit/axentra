import type { AuthSession, AuthUser } from "@axentra/contracts";
import type { CookieOptions, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config/index.js";
import catchAsync from "../../shared/utils/catchAsync.js";
import sendResponse from "../../shared/utils/sendResponse.js";
import { type ClientMeta, identityService } from "./identity.service.js";

const REFRESH_COOKIE = "axentra_rt";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  // Plain-http localhost in development; Secure everywhere else (spec section 7)
  secure: config.node_env !== "development",
  sameSite: "lax",
  // Only sent to auth endpoints, never to the rest of the API
  path: "/api/v1/auth",
};

const clientMeta = (req: Request): ClientMeta => ({
  userAgent: req.get("user-agent")?.slice(0, 512),
  ipAddress: req.ip,
});

const sendSession = (
  res: Response,
  statusCode: number,
  message: string,
  issued: { session: AuthSession; refreshToken: string; refreshExpiresAt: Date },
) => {
  res.cookie(REFRESH_COOKIE, issued.refreshToken, { ...refreshCookieOptions, expires: issued.refreshExpiresAt });
  sendResponse<AuthSession>(res, { success: true, statusCode, message, data: issued.session });
};

const register = catchAsync(async (req, res) => {
  sendSession(res, httpStatus.CREATED, "Account created", await identityService.register(req.body, clientMeta(req)));
});

const login = catchAsync(async (req, res) => {
  sendSession(res, httpStatus.OK, "Logged in", await identityService.login(req.body, clientMeta(req)));
});

const refresh = catchAsync(async (req, res) => {
  try {
    sendSession(res, httpStatus.OK, "Session refreshed", await identityService.refresh(req.cookies?.[REFRESH_COOKIE], clientMeta(req)));
  } catch (error) {
    // A dead refresh token should not linger in the browser
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    throw error;
  }
});

const logout = catchAsync(async (req, res) => {
  await identityService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(httpStatus.NO_CONTENT).end();
});

const me = catchAsync(async (req, res) => {
  sendResponse<AuthUser>(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Current user",
    data: await identityService.getMe(req.user!.id),
  });
});

export const identityController = { register, login, refresh, logout, me };
