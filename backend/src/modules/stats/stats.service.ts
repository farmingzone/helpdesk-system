import { Status } from "@prisma/client";
import { prisma } from "../../db/client";

export async function getAverageResolutionTime() {
  const completedTickets = await prisma.ticket.findMany({
    where: {
      status: Status.DONE,
      resolvedAt: {
        not: null
      }
    },
    select: {
      createdAt: true,
      resolvedAt: true
    }
  });

  const completedCount = completedTickets.length;
  if (completedCount === 0) {
    return {
      completedCount: 0,
      averageResolutionMinutes: 0
    };
  }

  const totalMinutes = completedTickets.reduce((sum, ticket) => {
    if (!ticket.resolvedAt) {
      return sum;
    }
    const diffMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
    return sum + diffMs / 1000 / 60;
  }, 0);

  return {
    completedCount,
    averageResolutionMinutes: totalMinutes / completedCount
  };
}

export async function getResolutionSummary() {
  const [receivedCount, inProgressCount, doneCount] = await Promise.all([
    prisma.ticket.count({ where: { status: Status.RECEIVED } }),
    prisma.ticket.count({ where: { status: Status.IN_PROGRESS } }),
    prisma.ticket.count({ where: { status: Status.DONE } })
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [todayCompletedCount, overdueCount] = await Promise.all([
    prisma.ticket.count({
      where: {
        status: Status.DONE,
        resolvedAt: {
          gte: todayStart,
          lt: todayEnd
        }
      }
    }),
    prisma.ticket.count({
      where: {
        dueAt: { lt: new Date() },
        status: { not: Status.DONE }
      }
    })
  ]);

  const completedTickets = await prisma.ticket.findMany({
    where: {
      status: Status.DONE,
      resolvedAt: {
        not: null
      }
    },
    select: {
      createdAt: true,
      resolvedAt: true
    },
    orderBy: {
      resolvedAt: "asc"
    }
  });

  const completedCount = completedTickets.length;
  if (completedCount === 0) {
    return {
      completedCount: 0,
      averageResolutionMinutes: 0,
      medianResolutionMinutes: 0,
      slaOver24HoursCompletedCount: 0,
      dailyCompleted: [] as Array<{ date: string; count: number }>,
      statusCounts: {
        RECEIVED: receivedCount,
        IN_PROGRESS: inProgressCount,
        DONE: doneCount
      },
      todayCompletedCount,
      overdueCount
    };
  }

  const resolutionMinutes = completedTickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => {
      const resolvedAt = ticket.resolvedAt as Date;
      return (resolvedAt.getTime() - ticket.createdAt.getTime()) / 1000 / 60;
    })
    .sort((a, b) => a - b);

  const total = resolutionMinutes.reduce((sum, current) => sum + current, 0);
  const averageResolutionMinutes = total / resolutionMinutes.length;

  const mid = Math.floor(resolutionMinutes.length / 2);
  const medianResolutionMinutes =
    resolutionMinutes.length % 2 === 0
      ? (resolutionMinutes[mid - 1] + resolutionMinutes[mid]) / 2
      : resolutionMinutes[mid];

  const dailyMap = new Map<string, number>();
  for (const ticket of completedTickets) {
    if (!ticket.resolvedAt) {
      continue;
    }
    const day = ticket.resolvedAt.toISOString().slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }

  const dailyCompleted = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  const slaThresholdMinutes = 24 * 60;
  const slaOver24HoursCompletedCount = resolutionMinutes.filter(
    (minutes) => minutes > slaThresholdMinutes
  ).length;

  return {
    completedCount,
    averageResolutionMinutes,
    medianResolutionMinutes,
    slaOver24HoursCompletedCount,
    dailyCompleted,
    statusCounts: {
      RECEIVED: receivedCount,
      IN_PROGRESS: inProgressCount,
      DONE: doneCount
    },
    todayCompletedCount,
    overdueCount
  };
}
