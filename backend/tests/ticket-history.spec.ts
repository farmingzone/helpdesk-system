import { EventType, Status } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import {
  addCommentToTicket,
  changeTicketAssignee,
  createTicket
} from "../src/modules/tickets/tickets.service";

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

  it("creates COMMENT history", async () => {
    const ticket = await createTicket({
      title: "Comment issue",
      description: "Need additional context",
      requesterName: "tester-f"
    });

    const commentResult = await addCommentToTicket({
      ticketId: ticket.id,
      actorName: "agent-f",
      note: "추가 확인 필요"
    });

    expect(commentResult.ok).toBe(true);

    const histories = await prisma.ticketHistory.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" }
    });

    expect(histories).toHaveLength(2);
    expect(histories[1].eventType).toBe(EventType.COMMENT);
    expect(histories[1].note).toBe("추가 확인 필요");
  });

  it("creates ASSIGNEE_CHANGED history", async () => {
    const ticket = await createTicket({
      title: "Assignee issue",
      description: "Need assignment",
      requesterName: "tester-g"
    });

    const assigneeResult = await changeTicketAssignee({
      ticketId: ticket.id,
      actorName: "admin-g",
      toAssigneeName: "agent-g"
    });

    expect(assigneeResult.ok).toBe(true);

    const histories = await prisma.ticketHistory.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" }
    });

    expect(histories).toHaveLength(2);
    expect(histories[1].eventType).toBe(EventType.ASSIGNEE_CHANGED);
    expect(histories[1].note).toContain("assignee:");
  });
});
