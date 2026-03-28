import { Priority, Status } from "@prisma/client";
import { UserRole } from "../auth/auth";
import {
  addTicketComment,
  createTicketWithCreatedHistory,
  findTicketDetailById,
  findTicketById,
  listTickets,
  listTicketsWithFilters,
  updateTicketAssigneeWithHistory,
  updateTicketStatusWithHistory
} from "./tickets.repository";

type CreateTicketParams = {
  title: string;
  description: string;
  requesterName: string;
  assigneeName?: string;
  priority?: Priority;
  dueAt?: Date;
};

export async function createTicket(params: CreateTicketParams) {
  return createTicketWithCreatedHistory(params);
}

export async function getTicketList(status?: Status) {
  return listTickets(status);
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
  return listTicketsWithFilters(filters);
}

type GetTicketDetailResult =
  | { ok: true; ticket: NonNullable<Awaited<ReturnType<typeof findTicketDetailById>>> }
  | { ok: false; code: 404; message: string };

export async function getTicketDetail(ticketId: string): Promise<GetTicketDetailResult> {
  const ticket = await findTicketDetailById(ticketId);
  if (!ticket) {
    return { ok: false, code: 404, message: "Ticket not found" };
  }

  return { ok: true, ticket };
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

  return { ok: true, ticket: updatedTicket };
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

  return { ok: true, ticket: updatedTicket };
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
