import { Status } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { canChangeStatus, getUserContext } from "../auth/auth";
import {
  changeTicketStatus,
  createTicket,
  getTicketDetailWithAccess,
  getTicketListWithFilters
} from "./tickets.service";

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  requesterName: z.string().min(1)
});

const statusQuerySchema = z.object({
  status: z.nativeEnum(Status).optional(),
  requesterName: z.string().min(1).optional(),
  q: z.string().min(1).optional()
});

const statusParamsSchema = z.object({
  ticketId: z.string().min(1)
});

const changeStatusSchema = z.object({
  toStatus: z.nativeEnum(Status),
  actorName: z.string().min(1),
  note: z.string().optional()
});

export const ticketsRouter = Router();

ticketsRouter.post("/", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const body = createTicketSchema.parse(req.body);
    const requesterName =
      user.role === "REQUESTER" ? user.userName : body.requesterName;
    const ticket = await createTicket({
      ...body,
      requesterName
    });
    return res.status(201).json(ticket);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.get("/", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    const { status, requesterName, q } = statusQuerySchema.parse(req.query);
    const effectiveRequesterName =
      user.role === "REQUESTER" ? user.userName : requesterName;

    const tickets = await getTicketListWithFilters({
      status,
      requesterName: effectiveRequesterName,
      query: q
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
      return res.status(result.code).json({ message: result.message });
    }

    return res.json(result.ticket);
  } catch (err) {
    return next(err);
  }
});

ticketsRouter.patch("/:ticketId/status", async (req, res, next) => {
  try {
    const user = getUserContext(req);
    if (!canChangeStatus(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
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
      return res.status(result.code).json({ message: result.message });
    }

    return res.json(result.ticket);
  } catch (err) {
    return next(err);
  }
});
