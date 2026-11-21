import type { HealthResponse } from "@axentra/contracts";
import httpStatus from "http-status";
import catchAsync from "../../shared/utils/catchAsync.js";
import sendResponse from "../../shared/utils/sendResponse.js";
import { healthService } from "./health.service.js";

const getHealth = catchAsync(async (_req, res) => {
  const health = await healthService.getHealth();
  const ok = health.status === "ok";

  sendResponse<HealthResponse>(res, {
    success: ok,
    // 503 lets uptime checks and load balancers see a degraded API
    statusCode: ok ? httpStatus.OK : httpStatus.SERVICE_UNAVAILABLE,
    message: ok ? "API is healthy" : "API is degraded: database unreachable",
    data: health,
  });
});

export const healthController = { getHealth };
