import { apiRequest } from "./client";

export type AverageResolutionStats = {
  completedCount: number;
  averageResolutionMinutes: number;
};

export async function getAverageResolutionStats() {
  return apiRequest<AverageResolutionStats>("/api/stats/average-resolution-time");
}

export type ResolutionSummary = {
  completedCount: number;
  averageResolutionMinutes: number;
  medianResolutionMinutes: number;
  dailyCompleted: Array<{ date: string; count: number }>;
};

export async function getResolutionSummary() {
  return apiRequest<ResolutionSummary>("/api/stats/resolution-summary");
}
