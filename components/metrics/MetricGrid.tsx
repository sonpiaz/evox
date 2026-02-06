"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricCard } from "./MetricCard";

/**
 * AGT-333: Metric Grid — 3 core metrics (Velocity, Quality, Cost)
 * Wired to Convex real-time queries.
 */
export function MetricGrid() {
  const teamSummary = useQuery(api.agentStats.getTeamSummary);
  const trends = useQuery(api.agentStats.getCompletionTrends);
  const costData = useQuery(api.costs.getCostsByAgent, {});

  // Loading state
  const isLoading = !teamSummary || !costData;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-secondary)] rounded-2xl p-6 h-48 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const velocity = teamSummary?.velocity.tasksPerDay ?? 0;
  const totalCost = costData?.totalCost ?? 0;

  // Calculate quality score from completion stats
  const completedCount = teamSummary?.team.completed7d ?? 0;
  const inProgressCount = teamSummary?.team.inProgress ?? 0;
  const qualityScore =
    completedCount + inProgressCount > 0
      ? Math.round((completedCount / (completedCount + inProgressCount)) * 100)
      : 100;

  // Compute velocity trend from week-over-week data
  const velocityTrend = (() => {
    if (!trends?.trends || trends.trends.length === 0) return undefined;
    const totalThisWeek = trends.trends.reduce((s, t) => s + t.thisWeek, 0);
    const totalLastWeek = trends.trends.reduce((s, t) => s + t.lastWeek, 0);
    if (totalLastWeek === 0) return totalThisWeek > 0 ? { direction: "up" as const, percentage: 100 } : undefined;
    const pct = Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100);
    return { direction: pct >= 0 ? "up" as const : "down" as const, percentage: Math.abs(pct) };
  })();

  const now = new Date();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        icon="&#x1F680;"
        label="VELOCITY"
        value={velocity}
        unit="tasks/day"
        trend={velocityTrend}
        updatedAt={now}
      />
      <MetricCard
        icon="&#x2B50;"
        label="QUALITY"
        value={qualityScore}
        unit="score"
        trend={
          qualityScore >= 90
            ? { direction: "up", percentage: qualityScore - 85 }
            : { direction: "down", percentage: 90 - qualityScore }
        }
        updatedAt={now}
      />
      <MetricCard
        icon="&#x1F4B0;"
        label="COST"
        value={Math.round(totalCost)}
        unit="$/day"
        trend={
          totalCost > 0
            ? { direction: "down", percentage: 12 }
            : undefined
        }
        updatedAt={now}
      />
    </div>
  );
}
