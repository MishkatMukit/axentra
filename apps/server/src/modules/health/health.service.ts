import type { HealthResponse } from "@axentra/contracts";
import { healthRepository } from "./health.repository.js";

const getHealth = async (): Promise<HealthResponse> => {
  const dbUp = await healthRepository.pingDatabase();
  return { status: dbUp ? "ok" : "degraded", db: dbUp ? "ok" : "down" };
};

export const healthService = { getHealth };
