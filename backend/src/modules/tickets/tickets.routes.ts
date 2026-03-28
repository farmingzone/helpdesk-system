import { Priority, Status } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middlewares/http-error";
import { logInfo } from "../../observability/logger";
import { canChangeStatus, getUserContext } from "../auth/auth";
import {
  addCommentToTicket,
  changeTicketAssignee,
  changeTicketStatus,
  createTicket,
  getTicketDetailWithAccess,
  getTicketListWithFilters
} from "./tickets.service";

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requesterName: z.string().min(1),
  assigneeName: z.string().min(1).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueAt: z.string().datetime().optional()
});

const statusQuerySchema = z.object({
  status: z.nativeEnum(Status).optional(),
  requesterName: z.string().min(1).optional(),
  assigneeName: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  priority: z.nativeEnum(Priority).optional(),
  overdueOnly: z.coerce.boolean().optional()
});

const statusParamsSchema = z.object({
  ticketId: z.string().min(1)
});

const changeStatusSchema = z.object({
  toStatus: z.nativeEnum(Status),
  actorName: z.string().min(1),
  note: z.string().optional()
});

const addCommentSchema = z.object({
  actorName: z.string().min(1),
  note: z.string().min(1)
});

const changeAssigneeSchema = z.object({
  actorName: z.string().min(1),
  toAssigneeName: z.string().min(1).nullable(),
  note: z.string().optional()
});

function getRequestId(res: { locals: { requestId?: unknown } }) {
  if (typeof res.locals.requestId === "string" && res.locals.requestId.length > 0) {
    return res.locals.requestId;
  }

  return "unknown";
}

function toErrorCode(statusCode: number, message: string) {
  if (statusCode === 403) {
    return "FORBIDDEN";
  }

  if (statusCode === 404) {
    return "TICKET_NOT_FOUND";
  }

  if (statusCode === 400) {
    if (message.includes("transition")) {
      return "INVALID_STATUS_TRANSITION";
    }

    if (message.includes("assignee")) {
      return "INVALID_ASSIGNEE_CHANGE";
    }

    return "BAD_REQUEST";
  }

  return "UNKNOWN_ERROR";
}

export const ticketsRouter = Router();

ticketsRouter.post("/", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const body = createTicketSchema.parse(req.body);
    const requesterName =
      user.role === "REQUESTER" ? user.userName : body.requesterName;
    const ticket = await createTicket({
      ...body,
      requesterName,
      assigneeName: user.role === "REQUESTER" ? undefined : body.assigneeName,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined
    });
    return res.status(201).json(ticket);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.get("/", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const { status, requesterName, assigneeName, q, priority, overdueOnly } = statusQuerySchema.parse(req.query);
    const effectiveRequesterName =
      user.role === "REQUESTER" ? user.userName : requesterName;

    const tickets = await getTicketListWithFilters({
      status,
      requesterName: effectiveRequesterName,
      assigneeName,
      query: q,
      priority,
      overdueOnly
    });
    return res.json(tickets);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.get("/:ticketId", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const { ticketId } = statusParamsSchema.parse(req.params);
    const result = await getTicketDetailWithAccess(ticketId, user.role, user.userName);

    if (!result.ok) {
      return next(new AppError(result.code, toErrorCode(result.code, result.message), result.message));
    }

    return res.json(result.ticket);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.post("/:ticketId/comments", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const { ticketId } = statusParamsSchema.parse(req.params);
    const body = addCommentSchema.parse(req.body);
    const access = await getTicketDetailWithAccess(ticketId, user.role, user.userName);
    if (!access.ok) {
      return next(new AppError(access.code, toErrorCode(access.code, access.message), access.message));
    }
    const actorName = user.role === "REQUESTER" ? user.userName : body.actorName;

    const result = await addCommentToTicket({
      ticketId,
      actorName,
      note: body.note
    });

    if (!result.ok) {
      return next(new AppError(result.code, toErrorCode(result.code, result.message), result.message));
    }

    logInfo("business.ticket.comment_added", {
      requestId: getRequestId(res),
      ticketId,
      actorName
    });

    return res.status(201).json(result.comment);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.patch("/:ticketId/status", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    if (!canChangeStatus(user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Forbidden"));
    }

    const { ticketId } = statusParamsSchema.parse(req.params);
    const body = changeStatusSchema.parse(req.body);

    const result = await changeTicketStatus({
      ticketId,
      toStatus: body.toStatus,
      actorName: body.actorName,
      note: body.note
    });

    if (!result.ok) {
      return next(new AppError(result.code, toErrorCode(result.code, result.message), result.message));
    }

    logInfo("business.ticket.status_changed", {
      requestId: getRequestId(res),
      ticketId,
      actorName: body.actorName,
      toStatus: body.toStatus
    });

    return res.json(result.ticket);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.patch("/:ticketId/assignee", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    if (!canChangeStatus(user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Forbidden"));
    }

    const { ticketId } = statusParamsSchema.parse(req.params);
    const body = changeAssigneeSchema.parse(req.body);
    const result = await changeTicketAssignee({
      ticketId,
      actorName: body.actorName,
      toAssigneeName: body.toAssigneeName,
      note: body.note
    });

    if (!result.ok) {
      return next(new AppError(result.code, toErrorCode(result.code, result.message), result.message));
    }

    logInfo("business.ticket.assignee_changed", {
      requestId: getRequestId(res),
      ticketId,
      actorName: body.actorName,
      toAssigneeName: body.toAssigneeName
    });

    return res.json(result.ticket);
  } catch (err) {
    return next(err);
  }
});
