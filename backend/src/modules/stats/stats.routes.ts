import { Router } from "express";
import { getAverageResolutionTime, getResolutionSummary } from "./stats.service";

export const statsRouter = Router();

statsRouter.get("/average-resolution-time", async (_req, res, next) => {
  try {
    const stats = await getAverageResolutionTime();
    return res.json(stats);
  } catch (err) {
    return next(err);
  }
});

statsRouter.get("/resolution-summary", async (_req, res, next) => {
  try {
    const summary = await getResolutionSummary();
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
});
