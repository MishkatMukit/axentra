import express from "express";
import { healthRoutes } from "./modules/health/health.routes.js";
import { globalErrorHandler } from "./shared/middleware/globalErrorHandler.js";
import { notFound } from "./shared/middleware/notFound.js";
import { requestId } from "./shared/middleware/requestId.js";

export const createApp = () => {
  const app = express();

  app.use(requestId);
  app.use(express.json());

  app.use("/api/v1/health", healthRoutes);

  app.use(notFound);
  app.use(globalErrorHandler);

  return app;
};
