import { afterAll, beforeAll, beforeEach } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import fsPromises from "fs/promises";
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
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticket.deleteMany();
  const uploadRoot = path.resolve(process.cwd(), "uploads");
  await fsPromises.rm(uploadRoot, { recursive: true, force: true });
});

afterAll(async () => {
  await prisma.$disconnect();
});
