import { apiRequest } from "./client";

export type Status = "RECEIVED" | "IN_PROGRESS" | "DONE";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type TicketHistory = {
  id: string;
  ticketId: string;
  actorName: string;
  eventType: "CREATED" | "STATUS_CHANGED";
  fromStatus: Status | null;
  toStatus: Status | null;
  note: string | null;
  createdAt: string;
};

export type TicketDetail = Ticket & {
  histories: TicketHistory[];
};

export async function createTicket(payload: {
  title: string;
  description: string;
  requesterName: string;
}) {
  return apiRequest<Ticket>("/api/tickets", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listTickets(status?: Status) {
  const query = status ? `?status=${status}` : "";
  return apiRequest<Ticket[]>(`/api/tickets${query}`);
}

export async function listTicketsWithFilters(filters: {
  status?: Status;
  requesterName?: string;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.requesterName) {
    params.set("requesterName", filters.requesterName);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  const qs = params.toString();
  return apiRequest<Ticket[]>(`/api/tickets${qs ? `?${qs}` : ""}`);
}

export async function getTicketDetail(ticketId: string) {
  return apiRequest<TicketDetail>(`/api/tickets/${ticketId}`);
}

export async function changeTicketStatus(payload: {
  ticketId: string;
  toStatus: Status;
  actorName: string;
  note?: string;
}) {
  return apiRequest<Ticket>(`/api/tickets/${payload.ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      toStatus: payload.toStatus,
      actorName: payload.actorName,
      note: payload.note
    })
  });
}
