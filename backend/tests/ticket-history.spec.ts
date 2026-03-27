import { EventType, Status } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import { createTicket } from "../src/modules/tickets/tickets.service";

describe("Ticket history", () => {
  it("creates CREATED history when ticket is created", async () => {
    const ticket = await createTicket({
      title: "Network issue",
      description: "Intranet is slow",
      requesterName: "tester-e"
    });

    const histories = await prisma.ticketHistory.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" }
    });

    expect(histories).toHaveLength(1);
    expect(histories[0].eventType).toBe(EventType.CREATED);
    expect(histories[0].toStatus).toBe(Status.RECEIVED);
    expect(histories[0].actorName).toBe("tester-e");
  });
});
