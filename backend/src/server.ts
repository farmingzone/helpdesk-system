import { prisma } from "./db/client";
import { app } from "./app";
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`Helpdesk backend listening on port ${port}`);
});

async function gracefulShutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
