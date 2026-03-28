import express from "express";
import { errorHandler } from "./middlewares/error-handler";
import { requestContextMiddleware } from "./middlewares/request-context";
import { statsRouter } from "./modules/stats/stats.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";

export const app = express();

app.use(requestContextMiddleware);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/tickets", ticketsRouter);
app.use("/api/stats", statsRouter);

app.use(errorHandler);
