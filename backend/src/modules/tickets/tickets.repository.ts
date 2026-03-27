import { EventType, Prisma, Status } from "@prisma/client";
import { prisma } from "../../db/client";

type CreateTicketInput = {
  title: string;
  description: string;
  requesterName: string;
};

export async function createTicketWithCreatedHistory(input: CreateTicketInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        title: input.title,
        description: input.description,
        requesterName: input.requesterName,
        status: Status.RECEIVED
      }
    });

    await tx.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorName: input.requesterName,
        eventType: EventType.CREATED,
        toStatus: Status.RECEIVED,
        note: "Ticket created"
      }
    });

    return ticket;
  });
}

export async function listTickets(status?: Status) {
  const where: Prisma.TicketWhereInput = status ? { status } : {};

  return prisma.ticket.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    }
  });
}

type ListTicketFilters = {
  status?: Status;
  requesterName?: string;
  query?: string;
};

export async function listTicketsWithFilters(filters: ListTicketFilters) {
  const where: Prisma.TicketWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.requesterName) {
    where.requesterName = filters.requesterName;
  }

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query } },
      { description: { contains: filters.query } }
    ];
  }

  return prisma.ticket.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function findTicketById(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId }
  });
}

export async function findTicketDetailById(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      histories: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });
}

type UpdateTicketStatusInput = {
  ticketId: string;
  fromStatus: Status;
  toStatus: Status;
  actorName: string;
  note?: string;
};

export async function updateTicketStatusWithHistory(input: UpdateTicketStatusInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        status: input.toStatus,
        resolvedAt: input.toStatus === Status.DONE ? new Date() : undefined
      }
    });

    await tx.ticketHistory.create({
      data: {
        ticketId: input.ticketId,
        actorName: input.actorName,
        eventType: EventType.STATUS_CHANGED,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        note: input.note
      }
    });

    return ticket;
  });
}
