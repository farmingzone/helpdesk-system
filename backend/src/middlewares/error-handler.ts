import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { logError } from "../observability/logger";
import { AppError } from "./http-error";

type ErrorBody = {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
};

function getRequestId(req: Request, res: Response) {
  const localId = res.locals.requestId;
  if (typeof localId === "string" && localId.length > 0) {
    return localId;
  }

  const headerId = req.header("x-request-id");
  if (headerId && headerId.length > 0) {
    return headerId;
  }

  return "unknown";
}

function logRequestError(req: Request, requestId: string, errorCode: string, message: string, details?: unknown) {
  logError("request.error", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    errorCode,
    message,
    details: details ?? null
  });
}

function sendError(
  req: Request,
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  details?: unknown
) {
  const requestId = getRequestId(req, res);
  const body: ErrorBody = {
    code: errorCode,
    message,
    requestId,
    timestamp: new Date().toISOString()
  };

  if (details !== undefined) {
    body.details = details;
  }

  return res.status(statusCode).json(body);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = getRequestId(req, res);

  if (err instanceof ZodError) {
    const details = err.flatten();
    logRequestError(req, requestId, "VALIDATION_ERROR", "Validation failed", details);
    return sendError(req, res, 400, "VALIDATION_ERROR", "Validation failed", details);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      logRequestError(req, requestId, "ATTACHMENT_TOO_LARGE", "Attachment exceeds max size (5MB)");
      return sendError(req, res, 400, "ATTACHMENT_TOO_LARGE", "Attachment exceeds max size (5MB)");
    }
    logRequestError(req, requestId, "MULTIPART_ERROR", err.message);
    return sendError(req, res, 400, "MULTIPART_ERROR", err.message);
  }
  
  if (err instanceof AppError) {
    logRequestError(req, requestId, err.errorCode, err.message, err.details);
    return sendError(req, res, err.statusCode, err.errorCode, err.message, err.details);
  }

  const unknownError = err as Error;
  logError("request.error", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    errorCode: "INTERNAL_SERVER_ERROR",
    message: unknownError?.message ?? "Unknown error",
    stack: unknownError?.stack ?? null
  });

  return sendError(req, res, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
}
