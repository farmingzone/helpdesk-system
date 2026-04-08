import { Status } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { changeTicketStatus, createTicket } from "../src/modules/tickets/tickets.service";

describe("Ticket status transitions", () => {
  it("allows RECEIVED -> IN_PROGRESS", async () => {
    const ticket = await createTicket({
      title: "VPN issue",
      description: "Cannot connect to internal VPN",
      requesterName: "tester-a"
    });

    const result = await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.IN_PROGRESS,
      actorName: "agent-a"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.status).toBe(Status.IN_PROGRESS);
    }
  });

  it("allows IN_PROGRESS -> DONE", async () => {
    const ticket = await createTicket({
      title: "Printer issue",
      description: "Printer not responding",
      requesterName: "tester-b"
    });

    await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.IN_PROGRESS,
      actorName: "agent-b"
    });

    const result = await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.DONE,
      actorName: "agent-b"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.status).toBe(Status.DONE);
      expect(result.ticket.resolvedAt).not.toBeNull();
    }
  });

  it("blocks RECEIVED -> DONE", async () => {
    const ticket = await createTicket({
      title: "Email issue",
      description: "Unable to send mail",
      requesterName: "tester-c"
    });

    const result = await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.DONE,
      actorName: "agent-c"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(400);
    }
  });

  it("blocks same-status transition", async () => {
    const ticket = await createTicket({
      title: "Access issue",
      description: "Need folder access",
      requesterName: "tester-d"
    });

    const result = await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.RECEIVED,
      actorName: "agent-d"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(400);
    }
  });

  it("allows DONE -> IN_PROGRESS (re-open)", async () => {
    const ticket = await createTicket({
      title: "Reopen issue",
      description: "Reopen flow check",
      requesterName: "tester-e"
    });

    await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.IN_PROGRESS,
      actorName: "agent-e"
    });

    await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.DONE,
      actorName: "agent-e"
    });

    const result = await changeTicketStatus({
      ticketId: ticket.id,
      toStatus: Status.IN_PROGRESS,
      actorName: "agent-e"
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.status).toBe(Status.IN_PROGRESS);
      expect(result.ticket.resolvedAt).toBeNull();
    }
  });
});
