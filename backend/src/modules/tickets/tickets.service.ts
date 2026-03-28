import { Priority, Status } from "@prisma/client";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { UserRole } from "../auth/auth";
import {
  addTicketComment,
  appendOverdueEscalationHistories,
  createTicketAttachment,
  createTicketWithCreatedHistory,
  findTicketAttachment,
  findTicketDetailById,
  findTicketById,
  listTicketAttachments,
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
  dueAt?: Date;
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
    dueAt: params.dueAt ?? calculateDueAt(priority)
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

const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  ".txt",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".csv",
  ".doc",
  ".docx"
]);
const ATTACHMENT_STORAGE_ROOT = path.resolve(process.cwd(), "uploads", "attachments");

type UploadTicketAttachmentParams = {
  ticketId: string;
  role: UserRole;
  userName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  fileBuffer: Buffer;
};

type TicketAttachmentResultCode = 400 | 403 | 404;

type UploadTicketAttachmentResult =
  | { ok: true; attachment: Awaited<ReturnType<typeof createTicketAttachment>> }
  | { ok: false; code: TicketAttachmentResultCode; message: string };

type GetTicketAttachmentsResult =
  | { ok: true; attachments: Awaited<ReturnType<typeof listTicketAttachments>> }
  | { ok: false; code: 403 | 404; message: string };

type DownloadTicketAttachmentResult =
  | {
      ok: true;
      attachment: Awaited<ReturnType<typeof findTicketAttachment>> extends infer T
        ? NonNullable<T>
        : never;
      fileBuffer: Buffer;
    }
  | { ok: false; code: 403 | 404; message: string };

function normalizeFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext);
  const normalizedBase = baseName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  const safeBase = normalizedBase.length > 0 ? normalizedBase : "file";

  return {
    ext,
    normalizedName: `${safeBase}${ext}`
  };
}

async function assertTicketAccess(ticketId: string, role: UserRole, userName: string) {
  return getTicketDetailWithAccess(ticketId, role, userName);
}

export function getAttachmentConstraints() {
  return {
    maxSizeBytes: MAX_ATTACHMENT_SIZE_BYTES,
    allowedExtensions: [...ALLOWED_ATTACHMENT_EXTENSIONS]
  };
}

export async function uploadTicketAttachment(
  params: UploadTicketAttachmentParams
): Promise<UploadTicketAttachmentResult> {
  const access = await assertTicketAccess(params.ticketId, params.role, params.userName);
  if (!access.ok) {
    return access;
  }

  if (!params.originalName) {
    return { ok: false, code: 400, message: "Attachment file name is required" };
  }

  if (params.sizeBytes <= 0) {
    return { ok: false, code: 400, message: "Empty attachment is not allowed" };
  }

  if (params.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, code: 400, message: "Attachment exceeds max size (5MB)" };
  }

  const { ext, normalizedName } = normalizeFileName(params.originalName);
  if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      code: 400,
      message: `Unsupported file extension: ${ext || "(none)"}`
    };
  }

  const attachmentId = randomUUID();
  const storedFileName = `${attachmentId}${ext}`;
  const absolutePath = path.join(ATTACHMENT_STORAGE_ROOT, storedFileName);

  await fs.mkdir(ATTACHMENT_STORAGE_ROOT, { recursive: true });
  await fs.writeFile(absolutePath, params.fileBuffer);

  try {
    const attachment = await createTicketAttachment({
      ticketId: params.ticketId,
      originalName: params.originalName,
      normalizedName,
      mimeType: params.mimeType || "application/octet-stream",
      sizeBytes: params.sizeBytes,
      storagePath: storedFileName,
      uploadedBy: params.userName
    });

    return { ok: true, attachment };
  } catch (error) {
    await fs.unlink(absolutePath).catch(() => undefined);
    throw error;
  }
}

export async function getTicketAttachmentsWithAccess(
  ticketId: string,
  role: UserRole,
  userName: string
): Promise<GetTicketAttachmentsResult> {
  const access = await assertTicketAccess(ticketId, role, userName);
  if (!access.ok) {
    return access;
  }

  const attachments = await listTicketAttachments(ticketId);
  return { ok: true, attachments };
}

export async function downloadTicketAttachmentWithAccess(
  ticketId: string,
  attachmentId: string,
  role: UserRole,
  userName: string
): Promise<DownloadTicketAttachmentResult> {
  const access = await assertTicketAccess(ticketId, role, userName);
  if (!access.ok) {
    return access;
  }

  const attachment = await findTicketAttachment(ticketId, attachmentId);
  if (!attachment) {
    return { ok: false, code: 404, message: "Attachment not found" };
  }

  const filePath = path.join(ATTACHMENT_STORAGE_ROOT, attachment.storagePath);
  try {
    const fileBuffer = await fs.readFile(filePath);
    return { ok: true, attachment, fileBuffer };
  } catch {
    return { ok: false, code: 404, message: "Attachment file is missing on disk" };
  }
}
