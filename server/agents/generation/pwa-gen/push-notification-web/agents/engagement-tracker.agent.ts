import type { EngagementMetrics, EngagementReport } from "../types.js";

export interface EngagementTrackerInput {
  readonly currentMetrics: EngagementMetrics;
  readonly delivered: boolean;
  readonly opened: boolean;
  readonly clicked: boolean;
  readonly nowIso: string;
}

function toRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
}

export function trackEngagement(input: EngagementTrackerInput): EngagementReport {
  const delivered = input.currentMetrics.delivered + (input.delivered ? 1 : 0);
  const opened = input.currentMetrics.opened + (input.opened ? 1 : 0);
  const clicked = input.currentMetrics.clicked + (input.clicked ? 1 : 0);

  const metrics: EngagementMetrics = {
    delivered,
    opened,
    clicked,
  };

  return {
    openRate: toRate(opened, delivered),
    clickRate: toRate(clicked, delivered),
    deliveryLogs: [`${input.nowIso} delivered=${input.delivered} opened=${input.opened} clicked=${input.clicked}`],
    metrics,
  };
}
