import type { HealthResponse } from "@axentra/contracts";
import httpStatus from "http-status";
import catchAsync from "../../shared/utils/catchAsync.js";
import sendResponse from "../../shared/utils/sendResponse.js";

const getHealth = catchAsync(async (_req, res) => {
  sendResponse<HealthResponse>(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "API is healthy",
    data: { status: "ok" },
  });
});

export const healthController = { getHealth };
