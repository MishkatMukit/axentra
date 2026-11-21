import express from "express";
import { healthRoutes } from "./modules/health/health.routes.js";
import { identityRoutes } from "./modules/identity/identity.routes.js";
import { globalErrorHandler } from "./shared/middleware/globalErrorHandler.js";
import { notFound } from "./shared/middleware/notFound.js";
import { requestId } from "./shared/middleware/requestId.js";

export const createApp = () => {
  const app = express();

  app.use(requestId);
  app.use(express.json());

  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", identityRoutes);

  app.use(notFound);
  app.use(globalErrorHandler);

  return app;
};
