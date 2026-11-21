import type { RequestHandler } from "express";
import type { ZodType } from "zod";

// shortcut: validates req.body only; add query/params when the first list or :id route needs them
export const validate =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    // parse throws ZodError on failure; globalErrorHandler maps it to 400
    req.body = schema.parse(req.body);
    next();
  };
