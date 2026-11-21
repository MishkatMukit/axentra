import type { AuthUser } from "@axentra/contracts";
import httpStatus from "http-status";
import catchAsync from "../../shared/utils/catchAsync.js";
import sendResponse from "../../shared/utils/sendResponse.js";
import { identityService } from "./identity.service.js";

const register = catchAsync(async (req, res) => {
  const user = await identityService.register(req.body);

  sendResponse<AuthUser>(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Account created",
    data: user,
  });
});

const login = catchAsync(async (req, res) => {
  const user = await identityService.login(req.body);

  sendResponse<AuthUser>(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged in",
    data: user,
  });
});

export const identityController = { register, login };
