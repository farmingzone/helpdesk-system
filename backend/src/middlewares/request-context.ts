import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { logInfo } from "../observability/logger";

function normalizeRequestId(rawValue: string | undefined) {
  if (!rawValue) {
    return randomUUID();
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return randomUUID();
  }

  return trimmed.slice(0, 120);
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = normalizeRequestId(req.header("x-request-id") ?? undefined);
  const startedAt = process.hrtime.bigint();

  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  logInfo("request.started", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null
  });

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logInfo("request.finished", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    });
  });

  next();
}
