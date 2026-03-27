import express from "express";
import { prisma } from "./db/client";
import { errorHandler } from "./middlewares/error-handler";
import { statsRouter } from "./modules/stats/stats.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/tickets", ticketsRouter);
app.use("/api/stats", statsRouter);

app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Helpdesk backend listening on port ${port}`);
});

async function gracefulShutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
