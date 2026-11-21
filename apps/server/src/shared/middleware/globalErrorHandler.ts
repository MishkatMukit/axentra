import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import config from "../../config/index.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../errors.js";

export const globalErrorHandler = async (
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (config.node_env === "development") {
        console.log("Error from Global Error Handler", err);
    }

    let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = err.message || "Internal Server Error";
    const errorName = err.name || "Internal Server Error";

    if (err instanceof ZodError || err?.name === "ZodError") {
        statusCode = httpStatus.BAD_REQUEST;
        errorMessage =
            err.issues?.map((issue: any) => `${issue.path.join(".")}: ${issue.message}`).join(", ") ||
            "Validation Error";
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = httpStatus.BAD_REQUEST;
        errorMessage = "You have provided incorrect field type or missing fields";
    } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            statusCode = httpStatus.CONFLICT;
            errorMessage = "Duplicate Key Error";
        } else if (err.code === "P2003") {
            statusCode = httpStatus.BAD_REQUEST;
            errorMessage = "Foreign key constraint failed";
        } else if (err.code === "P2025") {
            statusCode = httpStatus.NOT_FOUND;
            errorMessage =
                "An operation failed because it depends on one or more records that were required but not found.";
        }
    } else if (err instanceof Prisma.PrismaClientInitializationError) {
        // Note: with the Prisma 7 driver adapter, connection failures surface as other errors (500)
        if (err.errorCode === "P1000" || err.errorCode === "P1001") {
            statusCode = httpStatus.SERVICE_UNAVAILABLE;
            errorMessage = "Database is temporarily unavailable";
        }
    } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        errorMessage = "Error occurred during query execution";
    }else if(err instanceof AppError){
        errorMessage = err.message;
        statusCode = err.statusCode;
    }
    else if (err instanceof Error) {
        errorMessage = err.message;
    }

    const isDevelopment = config.node_env === "development";
    // 4xx messages are deliberate and safe to show; hide 5xx details outside development
    const exposeMessage = isDevelopment || statusCode < 500;

    res.status(statusCode).json({
        success: false,
        statusCode,
        name: exposeMessage ? errorName : "Internal Server Error",
        message: exposeMessage ? errorMessage : "Internal Server Error",
        requestId: req.id,
        error: isDevelopment ? err : undefined,
        stack: isDevelopment ? err.stack : undefined,
    });
};
