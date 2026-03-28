import { afterAll, beforeAll, beforeEach } from "vitest";

process.env.DATABASE_URL = "file:./test.db";

import { prisma } from "../src/db/client";

beforeAll(async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "tickets" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "requester_name" TEXT NOT NULL,
      "assignee_name" TEXT,
      "status" TEXT NOT NULL DEFAULT 'RECEIVED',
      "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
      "due_at" DATETIME,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL,
      "resolved_at" DATETIME
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ticket_histories" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticket_id" TEXT NOT NULL,
      "actor_name" TEXT NOT NULL,
      "event_type" TEXT NOT NULL,
      "from_status" TEXT,
      "to_status" TEXT,
      "note" TEXT,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ticket_histories_ticket_id_fkey" FOREIGN KEY ("ticket_id")
        REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tickets_status_created_at_idx" ON "tickets"("status", "created_at");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tickets_resolved_at_idx" ON "tickets"("resolved_at");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tickets_priority_due_at_idx" ON "tickets"("priority", "due_at");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tickets_assignee_name_status_idx" ON "tickets"("assignee_name", "status");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ticket_histories_ticket_id_created_at_idx" ON "ticket_histories"("ticket_id", "created_at");`);
});

beforeEach(async () => {
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
