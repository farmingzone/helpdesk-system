import { Priority, Status } from "@prisma/client";

export type SlaStatus = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "RESOLVED";

const SLA_HOURS_BY_PRIORITY: Record<Priority, number> = {
  LOW: 72,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 4
};

const DUE_SOON_MINUTES = 60;

export function calculateDueAt(priority: Priority, createdAt = new Date()) {
  const hours = SLA_HOURS_BY_PRIORITY[priority];
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function getSlaStatus(status: Status, dueAt: Date | null, now = new Date()): SlaStatus {
  if (status === Status.DONE) {
    return "RESOLVED";
  }

  if (!dueAt) {
    return "ON_TRACK";
  }

  const remainingMs = dueAt.getTime() - now.getTime();
  if (remainingMs < 0) {
    return "OVERDUE";
  }

  if (remainingMs <= DUE_SOON_MINUTES * 60 * 1000) {
    return "DUE_SOON";
  }

  return "ON_TRACK";
}

