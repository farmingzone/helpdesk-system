import { afterAll, beforeAll, beforeEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

process.env.DATABASE_URL = "file:./test.db";

import { prisma } from "../src/db/client";

beforeAll(async () => {
  const testDbPath = path.resolve(__dirname, "../prisma/test.db");
  if (!fs.existsSync(testDbPath)) {
    fs.closeSync(fs.openSync(testDbPath, "a"));
  }
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
});

beforeEach(async () => {
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
