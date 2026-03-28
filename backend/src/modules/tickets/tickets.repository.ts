import { EventType, Priority, Prisma, Status } from "@prisma/client";
import { prisma } from "../../db/client";

type CreateTicketInput = {
  title: string;
  description: string;
  requesterName: string;
  assigneeName?: string;
  priority: Priority;
  dueAt: Date;
};

export async function createTicketWithCreatedHistory(input: CreateTicketInput) {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        title: input.title,
        description: input.description,
        requesterName: input.requesterName,
        assigneeName: input.assigneeName,
        status: Status.RECEIVED,
        priority: input.priority,
        dueAt: input.dueAt
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

export async function appendOverdueEscalationHistories(now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const overdueTickets = await tx.ticket.findMany({
      where: {
        status: {
          not: Status.DONE
        },
        dueAt: {
          lt: now
        },
        histories: {
          none: {
            eventType: EventType.OVERDUE_ESCALATED
          }
        }
      },
      select: {
        id: true,
        dueAt: true
      }
    });

    if (overdueTickets.length === 0) {
      return 0;
    }

    await tx.ticketHistory.createMany({
      data: overdueTickets.map((ticket) => ({
        ticketId: ticket.id,
        actorName: "system",
        eventType: EventType.OVERDUE_ESCALATED,
        note: `SLA overdue at ${ticket.dueAt?.toISOString() ?? "unknown"}`
      }))
    });

    return overdueTickets.length;
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
  assigneeName?: string;
  query?: string;
  priority?: Priority;
  overdueOnly?: boolean;
};

export async function listTicketsWithFilters(filters: ListTicketFilters) {
  const where: Prisma.TicketWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.requesterName) {
    where.requesterName = filters.requesterName;
  }

  if (filters.assigneeName) {
    where.assigneeName = filters.assigneeName;
  }

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query } },
      { description: { contains: filters.query } }
    ];
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.overdueOnly) {
    where.AND = [
      {
        dueAt: {
          lt: new Date()
        }
      },
      {
        status: {
          not: Status.DONE
        }
      }
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
        resolvedAt: input.toStatus === Status.DONE ? new Date() : null
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

type AddTicketCommentInput = {
  ticketId: string;
  actorName: string;
  note: string;
};

export async function addTicketComment(input: AddTicketCommentInput) {
  return prisma.ticketHistory.create({
    data: {
      ticketId: input.ticketId,
      actorName: input.actorName,
      eventType: EventType.COMMENT,
      note: input.note
    }
  });
}

type UpdateTicketAssigneeInput = {
  ticketId: string;
  actorName: string;
  toAssigneeName: string | null;
  note?: string;
};

export async function updateTicketAssigneeWithHistory(input: UpdateTicketAssigneeInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.ticket.findUnique({
      where: { id: input.ticketId },
      select: { assigneeName: true }
    });

    const ticket = await tx.ticket.update({
      where: { id: input.ticketId },
      data: {
        assigneeName: input.toAssigneeName
      }
    });

    const fromAssignee = current?.assigneeName ?? "unassigned";
    const toAssignee = input.toAssigneeName ?? "unassigned";
    const defaultNote = `assignee: ${fromAssignee} -> ${toAssignee}`;

    await tx.ticketHistory.create({
      data: {
        ticketId: input.ticketId,
        actorName: input.actorName,
        eventType: EventType.ASSIGNEE_CHANGED,
        note: input.note ?? defaultNote
      }
    });

    return ticket;
  });
}

type CreateTicketAttachmentInput = {
  ticketId: string;
  originalName: string;
  normalizedName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
};

export async function createTicketAttachment(input: CreateTicketAttachmentInput) {
  return prisma.ticketAttachment.create({
    data: {
      ticketId: input.ticketId,
      originalName: input.originalName,
      normalizedName: input.normalizedName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      uploadedBy: input.uploadedBy
    }
  });
}

export async function listTicketAttachments(ticketId: string) {
  return prisma.ticketAttachment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "desc" }
  });
}

export async function findTicketAttachment(ticketId: string, attachmentId: string) {
  return prisma.ticketAttachment.findFirst({
    where: {
      id: attachmentId,
      ticketId
    }
  });
}
