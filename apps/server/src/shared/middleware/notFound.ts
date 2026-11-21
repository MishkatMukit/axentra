import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { AppError } from "../errors.js";

export const notFound: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, httpStatus.NOT_FOUND));
};
