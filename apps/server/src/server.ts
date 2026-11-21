import { createApp } from "./app.js";
import config from "./config/index.js";
import { logger } from "./config/logger.js";

const server = createApp().listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, closing server`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
