"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { VelocityChart } from "./VelocityChart";
import { CompletionBar } from "./CompletionBar";
import { AgentBreakdown } from "./AgentBreakdown";
import { PredictionCard } from "./PredictionCard";

type TaskDoc = {
  _id: string;
  status: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  agentName?: string;
  linearIdentifier?: string;
  assignee?: string;
};

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
};

type CostByAgent = {
  agentName: string;
  totalCost: number;
};

interface AnalyticsPanelV2Props {
  className?: string;
}

type TimeFilter = "today" | "7days" | "30days" | "all";

const timeFilterOptions: { value: TimeFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7 days" },
  { value: "30days", label: "30 days" },
  { value: "all", label: "All time" },
];

/**
 * AGT-205: Analytics Panel v2 — Sparklines + Velocity Trends + Predictions
 */
export function AnalyticsPanelV2({ className }: AnalyticsPanelV2Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");

  // Capture current time once on mount for stable comparison
  const [now] = useState<number>(() => Date.now());

  // Get time range based on filter
  const timeRange = useMemo(() => {
    const today = startOfDay(new Date());
    switch (timeFilter) {
      case "today":
        return { start: today.getTime(), end: endOfDay(new Date()).getTime() };
      case "7days":
        return { start: subDays(today, 6).getTime(), end: endOfDay(new Date()).getTime() };
      case "30days":
        return { start: subDays(today, 29).getTime(), end: endOfDay(new Date()).getTime() };
      case "all":
        return { start: 0, end: now };
    }
  }, [timeFilter]);

  // Queries
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as TaskDoc[] | undefined;
  const costData = useQuery(api.costs.getCostsByAgent, {
    startTs: timeRange.start,
    endTs: timeRange.end,
  }) as { agents: CostByAgent[]; totalCost: number } | undefined;

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (!tasks || !agents) return null;

    const now = new Date().getTime();

    // Filter tasks by time range
    const filteredTasks = tasks.filter((t) => {
      const taskTime = t.completedAt ?? t.updatedAt;
      return taskTime >= timeRange.start && taskTime <= timeRange.end;
    });

    // Count by status (within time range for done, all for others)
    const done = tasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const inProgress = tasks.filter(
      (t) => t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review"
    ).length;
    const backlog = tasks.filter(
      (t) => t.status?.toLowerCase() === "backlog" || t.status?.toLowerCase() === "todo"
    ).length;
    const total = done + inProgress + backlog;
    const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

    // Velocity data by day (last 7 days for sparkline)
    const daysCount = timeFilter === "today" ? 1 : timeFilter === "7days" ? 7 : timeFilter === "30days" ? 30 : 14;
    const velocityData: { label: string; value: number; date: string }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i)).getTime();
      const dayEnd = endOfDay(subDays(new Date(), i)).getTime();
      const dayTasks = tasks.filter((t) => {
        const completedAt = t.completedAt ?? (t.status?.toLowerCase() === "done" ? t.updatedAt : 0);
        return completedAt >= dayStart && completedAt <= dayEnd;
      });

      velocityData.push({
        label: format(dayStart, "EEE"),
        value: dayTasks.length,
        date: format(dayStart, "MMM d, yyyy"),
      });
    }

    // Calculate velocity avg and trend
    const velocityTotal = velocityData.reduce((sum, d) => sum + d.value, 0);
    const velocityAvg = velocityData.length > 0 ? velocityTotal / velocityData.length : 0;

    // Calculate trend (compare recent half vs first half)
    let velocityTrend = 0;
    if (velocityData.length >= 4) {
      const mid = Math.floor(velocityData.length / 2);
      const recentHalf = velocityData.slice(mid).reduce((sum, d) => sum + d.value, 0);
      const firstHalf = velocityData.slice(0, mid).reduce((sum, d) => sum + d.value, 0);
      velocityTrend = firstHalf > 0 ? Math.round(((recentHalf - firstHalf) / firstHalf) * 100) : 0;
    }

    // Agent breakdown
    const agentStats = agents.map((agent) => {
      const agentName = agent.name.toLowerCase();
      const agentTasks = tasks.filter(
        (t) => t.agentName?.toLowerCase() === agentName && t.status?.toLowerCase() === "done"
      );
      const costEntry = costData?.agents.find(
        (c) => c.agentName.toLowerCase() === agentName
      );

      return {
        name: agent.name,
        avatar: agent.avatar,
        tasksCompleted: agentTasks.length,
        cost: costEntry?.totalCost ?? 0,
      };
    });

    // Predictions
    const predictions: { icon: string; label: string; value: string; type?: "normal" | "warning" | "success" }[] = [];

    // ETA prediction
    if (velocityAvg > 0 && backlog > 0) {
      const daysToComplete = Math.ceil(backlog / velocityAvg);
      predictions.push({
        icon: "🎯",
        label: "Backlog ETA",
        value: `~${daysToComplete} day${daysToComplete > 1 ? "s" : ""} (at current velocity)`,
        type: daysToComplete <= 3 ? "success" : daysToComplete <= 7 ? "normal" : "warning",
      });
    }

    // Projected cost
    if (costData && velocityAvg > 0 && backlog > 0) {
      const costPerTask = velocityTotal > 0 ? costData.totalCost / velocityTotal : 0;
      const projectedCost = backlog * costPerTask;
      if (projectedCost > 0) {
        predictions.push({
          icon: "💰",
          label: "Projected cost (remaining)",
          value: `$${projectedCost.toFixed(2)}`,
        });
      }
    }

    // Bottleneck warning
    const tasksPerAgent = agentStats.map((a) => ({
      name: a.name,
      queued: tasks.filter(
        (t) =>
          t.agentName?.toLowerCase() === a.name.toLowerCase() &&
          (t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "backlog")
      ).length,
    }));
    const bottleneck = tasksPerAgent.find((a) => a.queued >= 5);
    if (bottleneck) {
      predictions.push({
        icon: "⚠️",
        label: `${bottleneck.name.toUpperCase()} bottleneck`,
        value: `${bottleneck.queued} tasks queued`,
        type: "warning",
      });
    }

    return {
      completionPercentage,
      done,
      inProgress,
      backlog,
      velocityData,
      velocityAvg: Math.round(velocityAvg * 10) / 10,
      velocityTrend,
      agentStats,
      predictions,
      totalCost: costData?.totalCost ?? 0,
    };
  }, [tasks, agents, costData, timeRange, timeFilter]);

  if (!agents || !metrics) {
    return (
      <div className={cn("flex items-center justify-center h-full text-zinc-500", className)}>
        <span className="animate-pulse">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6 overflow-auto", className)}>
      {/* Header with time filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h2 className="text-lg font-semibold text-white">ANALYTICS</h2>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-zinc-700"
        >
          {timeFilterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Velocity Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
          VELOCITY
        </h3>
        <VelocityChart data={metrics.velocityData} />
      </div>

      {/* Completion Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
          COMPLETION
        </h3>
        <CompletionBar
          percentage={metrics.completionPercentage}
          done={metrics.done}
          inProgress={metrics.inProgress}
          backlog={metrics.backlog}
        />
      </div>

      {/* Agent Breakdown Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            BY AGENT
          </h3>
          <span className="text-xs text-zinc-500">
            Total: ${metrics.totalCost.toFixed(2)}
          </span>
        </div>
        <AgentBreakdown agents={metrics.agentStats} />
      </div>

      {/* Predictions Section */}
      {metrics.predictions.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
            PREDICTIONS
          </h3>
          <PredictionCard predictions={metrics.predictions} />
        </div>
      )}
    </div>
  );
}
