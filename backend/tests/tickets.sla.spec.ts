import { Priority } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createTicket, getTicketListWithFilters } from "../src/modules/tickets/tickets.service";

describe("Ticket SLA policy", () => {
  it("calculates earlier dueAt for higher priority", async () => {
    const low = await createTicket({
      title: "SLA low",
      description: "SLA low",
      requesterName: "sla-a",
      priority: Priority.LOW
    });
    const medium = await createTicket({
      title: "SLA medium",
      description: "SLA medium",
      requesterName: "sla-b",
      priority: Priority.MEDIUM
    });
    const high = await createTicket({
      title: "SLA high",
      description: "SLA high",
      requesterName: "sla-c",
      priority: Priority.HIGH
    });
    const urgent = await createTicket({
      title: "SLA urgent",
      description: "SLA urgent",
      requesterName: "sla-d",
      priority: Priority.URGENT
    });

    expect(low.dueAt).not.toBeNull();
    expect(medium.dueAt).not.toBeNull();
    expect(high.dueAt).not.toBeNull();
    expect(urgent.dueAt).not.toBeNull();

    const lowDue = low.dueAt!.getTime();
    const mediumDue = medium.dueAt!.getTime();
    const highDue = high.dueAt!.getTime();
    const urgentDue = urgent.dueAt!.getTime();

    expect(lowDue).toBeGreaterThan(mediumDue);
    expect(mediumDue).toBeGreaterThan(highDue);
    expect(highDue).toBeGreaterThan(urgentDue);
  });

  it("includes slaStatus in ticket list responses", async () => {
    await createTicket({
      title: "SLA status",
      description: "SLA status included",
      requesterName: "sla-e",
      priority: Priority.URGENT
    });

    const tickets = await getTicketListWithFilters({});
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0]).toHaveProperty("slaStatus");
  });
});
