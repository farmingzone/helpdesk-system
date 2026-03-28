import { apiRequest, getAuthHeaders } from "./client";

export type Status = "RECEIVED" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  assigneeName: string | null;
  status: Status;
  priority: Priority;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type TicketHistory = {
  id: string;
  ticketId: string;
  actorName: string;
  eventType: "CREATED" | "STATUS_CHANGED" | "COMMENT" | "ASSIGNEE_CHANGED";
  fromStatus: Status | null;
  toStatus: Status | null;
  note: string | null;
  createdAt: string;
};

export type TicketDetail = Ticket & {
  histories: TicketHistory[];
};

export type TicketAttachment = {
  id: string;
  ticketId: string;
  originalName: string;
  normalizedName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
};

export async function createTicket(payload: {
  title: string;
  description: string;
  requesterName: string;
  assigneeName?: string;
  priority?: Priority;
  dueAt?: string;
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
  priority?: Priority;
  requesterName?: string;
  assigneeName?: string;
  q?: string;
  overdueOnly?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.requesterName) {
    params.set("requesterName", filters.requesterName);
  }
  if (filters.priority) {
    params.set("priority", filters.priority);
  }
  if (filters.assigneeName) {
    params.set("assigneeName", filters.assigneeName);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.overdueOnly) {
    params.set("overdueOnly", "true");
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

export async function addTicketComment(payload: {
  ticketId: string;
  actorName: string;
  note: string;
}) {
  return apiRequest<TicketHistory>(`/api/tickets/${payload.ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      actorName: payload.actorName,
      note: payload.note
    })
  });
}

export async function changeTicketAssignee(payload: {
  ticketId: string;
  actorName: string;
  toAssigneeName: string | null;
  note?: string;
}) {
  return apiRequest<Ticket>(`/api/tickets/${payload.ticketId}/assignee`, {
    method: "PATCH",
    body: JSON.stringify({
      actorName: payload.actorName,
      toAssigneeName: payload.toAssigneeName,
      note: payload.note
    })
  });
}

export async function listTicketAttachments(ticketId: string) {
  return apiRequest<TicketAttachment[]>(`/api/tickets/${ticketId}/attachments`);
}

export async function uploadTicketAttachment(payload: { ticketId: string; file: File }) {
  const form = new FormData();
  form.append("file", payload.file);

  const response = await fetch(`/api/tickets/${payload.ticketId}/attachments`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form
  });

  if (!response.ok) {
    const fallback = `HTTP ${response.status}`;
    let message = fallback;
    try {
      const err = (await response.json()) as { message?: string };
      if (err.message) {
        message = err.message;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return (await response.json()) as TicketAttachment;
}

export async function downloadTicketAttachment(payload: {
  ticketId: string;
  attachmentId: string;
  fileName: string;
}) {
  const response = await fetch(
    `/api/tickets/${payload.ticketId}/attachments/${payload.attachmentId}`,
    {
      headers: getAuthHeaders()
    }
  );

  if (!response.ok) {
    const fallback = `HTTP ${response.status}`;
    let message = fallback;
    try {
      const err = (await response.json()) as { message?: string };
      if (err.message) {
        message = err.message;
      }
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = payload.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
