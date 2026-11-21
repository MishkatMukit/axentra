import { pino } from "pino";
import config from "./index.js";

export const logger = pino({
  level: config.node_env === "test" ? "silent" : "info",
  ...(config.node_env === "development" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
