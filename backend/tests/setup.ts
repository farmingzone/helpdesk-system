import fs from "fs/promises";
import path from "path";
import { afterAll, beforeAll, beforeEach } from "vitest";

process.env.DATABASE_URL = "file:./test.db";

import { prisma } from "../src/db/client";

import { execSync } from "child_process";

beforeAll(async () => {
  execSync("npx prisma db push", { stdio: "inherit" });
});

beforeEach(async () => {
  await prisma.ticketHistory.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticket.deleteMany();
  const uploadRoot = path.resolve(process.cwd(), "uploads");
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

afterAll(async () => {
  await prisma.$disconnect();
});
