import { Priority, Status } from "@prisma/client";
import { UserRole } from "../auth/auth";
import {
  addTicketComment,
  appendOverdueEscalationHistories,
  createTicketWithCreatedHistory,
  findTicketDetailById,
  findTicketById,
  listTickets,
  listTicketsWithFilters,
  updateTicketAssigneeWithHistory,
  updateTicketStatusWithHistory
} from "./tickets.repository";
import { calculateDueAt, getSlaStatus, SlaStatus } from "./tickets.sla";

type CreateTicketParams = {
  title: string;
  description: string;
  requesterName: string;
  assigneeName?: string;
  priority?: Priority;
};

type TicketWithSla<T extends { status: Status; dueAt: Date | null }> = T & {
  slaStatus: SlaStatus;
};

function toTicketWithSla<T extends { status: Status; dueAt: Date | null }>(ticket: T): TicketWithSla<T> {
  return {
    ...ticket,
    slaStatus: getSlaStatus(ticket.status, ticket.dueAt)
  };
}

export async function createTicket(params: CreateTicketParams) {
  const priority = params.priority ?? Priority.MEDIUM;
  const ticket = await createTicketWithCreatedHistory({
    ...params,
    priority,
    dueAt: calculateDueAt(priority)
  });
  return toTicketWithSla(ticket);
}

export async function getTicketList(status?: Status) {
  await appendOverdueEscalationHistories();
  const tickets = await listTickets(status);
  return tickets.map(toTicketWithSla);
}

type TicketListFilters = {
  status?: Status;
  requesterName?: string;
  assigneeName?: string;
  query?: string;
  priority?: Priority;
  overdueOnly?: boolean;
};

export async function getTicketListWithFilters(filters: TicketListFilters) {
  await appendOverdueEscalationHistories();
  const tickets = await listTicketsWithFilters(filters);
  return tickets.map(toTicketWithSla);
}

type GetTicketDetailResult =
  | { ok: true; ticket: NonNullable<Awaited<ReturnType<typeof findTicketDetailById>>> }
  | { ok: false; code: 404; message: string };

export async function getTicketDetail(ticketId: string): Promise<GetTicketDetailResult> {
  await appendOverdueEscalationHistories();
  const ticket = await findTicketDetailById(ticketId);
  if (!ticket) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  return { ok: true, ticket: toTicketWithSla(ticket) };
}

export async function getTicketDetailWithAccess(
  ticketId: string,
  role: UserRole,
  userName: string
): Promise<GetTicketDetailResult | { ok: false; code: 403; message: string }> {
  const detail = await getTicketDetail(ticketId);
  if (!detail.ok) {
    return detail;
  }

  if (role === "REQUESTER" && detail.ticket.requesterName !== userName) {
    return { ok: false, code: 403, message: "Forbidden" };
  }

  return detail;
}

type ChangeTicketStatusParams = {
  ticketId: string;
  toStatus: Status;
  actorName: string;
  note?: string;
};

type ChangeTicketStatusResult =
  | { ok: true; ticket: Awaited<ReturnType<typeof updateTicketStatusWithHistory>> }
  | { ok: false; code: 400 | 404; message: string };

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  [Status.RECEIVED]: [Status.IN_PROGRESS],
  [Status.IN_PROGRESS]: [Status.DONE],
  [Status.DONE]: [Status.IN_PROGRESS]
};

export async function changeTicketStatus(
  params: ChangeTicketStatusParams
): Promise<ChangeTicketStatusResult> {
  const currentTicket = await findTicketById(params.ticketId);
  if (!currentTicket) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  if (currentTicket.status === params.toStatus) {
    return {
      ok: false,
      code: 400,
      message: "Same status transition is not allowed"
    };
  }

  const allowedTo = ALLOWED_TRANSITIONS[currentTicket.status];
  if (!allowedTo.includes(params.toStatus)) {
    return {
      ok: false,
      code: 400,
      message: `Invalid status transition: ${currentTicket.status} -> ${params.toStatus}`
    };
  }

  const updatedTicket = await updateTicketStatusWithHistory({
    ticketId: params.ticketId,
    fromStatus: currentTicket.status,
    toStatus: params.toStatus,
    actorName: params.actorName,
    note: params.note
  });

  await appendOverdueEscalationHistories();
  return { ok: true, ticket: toTicketWithSla(updatedTicket) };
}

type ChangeTicketAssigneeParams = {
  ticketId: string;
  actorName: string;
  toAssigneeName: string | null;
  note?: string;
};

type ChangeTicketAssigneeResult =
  | { ok: true; ticket: Awaited<ReturnType<typeof updateTicketAssigneeWithHistory>> }
  | { ok: false; code: 400 | 404; message: string };

export async function changeTicketAssignee(
  params: ChangeTicketAssigneeParams
): Promise<ChangeTicketAssigneeResult> {
  const currentTicket = await findTicketById(params.ticketId);
  if (!currentTicket) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  const currentAssignee = currentTicket.assigneeName ?? null;
  if (currentAssignee === params.toAssigneeName) {
    return {
      ok: false,
      code: 400,
      message: "Same assignee change is not allowed"
    };
  }

  const updatedTicket = await updateTicketAssigneeWithHistory({
    ticketId: params.ticketId,
    actorName: params.actorName,
    toAssigneeName: params.toAssigneeName,
    note: params.note
  });

  await appendOverdueEscalationHistories();
  return { ok: true, ticket: toTicketWithSla(updatedTicket) };
}

type AddTicketCommentParams = {
  ticketId: string;
  actorName: string;
  note: string;
};

type AddTicketCommentResult =
  | { ok: true; comment: Awaited<ReturnType<typeof addTicketComment>> }
  | { ok: false; code: 404; message: string };

export async function addCommentToTicket(
  params: AddTicketCommentParams
): Promise<AddTicketCommentResult> {
  const ticket = await findTicketById(params.ticketId);
  if (!ticket) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  const comment = await addTicketComment({
    ticketId: params.ticketId,
    actorName: params.actorName,
    note: params.note
  });

  return { ok: true, comment };
}
