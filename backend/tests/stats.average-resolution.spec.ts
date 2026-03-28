import { Status } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db/client";
import {
  getAverageResolutionTime,
  getResolutionSummary
} from "../src/modules/stats/stats.service";

describe("Average resolution time stats", () => {
  it("includes only DONE tickets with resolvedAt", async () => {
    const base = new Date("2026-01-01T00:00:00.000Z");

    await prisma.ticket.create({
      data: {
        title: "done-1",
        description: "done-1",
        requesterName: "tester-f",
        status: Status.DONE,
        createdAt: base,
        resolvedAt: new Date(base.getTime() + 30 * 60 * 1000)
      }
    });

    await prisma.ticket.create({
      data: {
        title: "done-2",
        description: "done-2",
        requesterName: "tester-g",
        status: Status.DONE,
        createdAt: new Date(base.getTime() + 60 * 60 * 1000),
        resolvedAt: new Date(base.getTime() + 120 * 60 * 1000)
      }
    });

    await prisma.ticket.create({
      data: {
        title: "done-no-resolvedAt",
        description: "invalid-complete",
        requesterName: "tester-h",
        status: Status.DONE,
        createdAt: base,
        resolvedAt: null
      }
    });

    await prisma.ticket.create({
      data: {
        title: "in-progress-with-resolvedAt",
        description: "should-be-excluded",
        requesterName: "tester-i",
        status: Status.IN_PROGRESS,
        createdAt: base,
        resolvedAt: new Date(base.getTime() + 10 * 60 * 1000)
      }
    });

    const result = await getAverageResolutionTime();

    expect(result.completedCount).toBe(2);
    expect(result.averageResolutionMinutes).toBeCloseTo(45, 5);
  });

  it("calculates SLA over-24-hours completed count", async () => {
    const base = new Date("2026-02-01T00:00:00.000Z");

    await prisma.ticket.create({
      data: {
        title: "within-sla",
        description: "within-sla",
        requesterName: "tester-j",
        status: Status.DONE,
        createdAt: base,
        resolvedAt: new Date(base.getTime() + 12 * 60 * 60 * 1000)
      }
    });

    await prisma.ticket.create({
      data: {
        title: "over-sla",
        description: "over-sla",
        requesterName: "tester-k",
        status: Status.DONE,
        createdAt: base,
        resolvedAt: new Date(base.getTime() + 30 * 60 * 60 * 1000)
      }
    });

    const summary = await getResolutionSummary();
    expect(summary.completedCount).toBe(2);
    expect(summary.slaOver24HoursCompletedCount).toBe(1);
  });

  it("counts overdue open tickets", async () => {
    const now = new Date();
    const pastDue = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await prisma.ticket.create({
      data: {
        title: "overdue-open",
        description: "overdue-open",
        requesterName: "tester-z",
        status: Status.IN_PROGRESS,
        dueAt: pastDue
      }
    });

    await prisma.ticket.create({
      data: {
        title: "overdue-done",
        description: "overdue-done",
        requesterName: "tester-y",
        status: Status.DONE,
        dueAt: pastDue,
        resolvedAt: now
      }
    });

    const summary = await getResolutionSummary();
    expect(summary.overdueCount).toBe(1);
  });
});
