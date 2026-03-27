import { beforeAll, beforeEach, afterAll } from "vitest";

import { afterAll, beforeEach } from "vitest";

process.env.DATABASE_URL = "file:./test.db";

import { prisma } from "../src/db/client";

import { execSync } from "child_process";

beforeAll(async () => {
  execSync("npx prisma db push", { stdio: "inherit" });
});

beforeEach(async () => {
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
