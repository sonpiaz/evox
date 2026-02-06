"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, subDays, startOfDay, format } from "date-fns";

interface HealthDashboardProps {
  className?: string;
}

type TaskDoc = {
  _id: string;
  status: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  retryCount?: number;
  lastError?: string;
  agentName?: string;
  linearIdentifier?: string;
};

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastHeartbeat?: number;
  lastSeen?: number;
};

/** Uptime thresholds */
const UPTIME_EXCELLENT = 99;
const UPTIME_GOOD = 95;
const UPTIME_WARNING = 90;

/** Calculate uptime percentage based on heartbeat frequency */
function calculateUptime(lastHeartbeat: number | undefined, periodMs: number): number {
  if (!lastHeartbeat) return 0;
  const now = new Date().getTime();
  const elapsed = now - lastHeartbeat;
  // If last heartbeat is recent (within 15 min), assume 100% uptime
  if (elapsed < 15 * 60 * 1000) return 100;
  // Estimate uptime based on how long since last heartbeat
  // This is a simplified calculation - real uptime would need historical heartbeat data
  const uptimeRatio = Math.max(0, 1 - elapsed / periodMs);
  return Math.round(uptimeRatio * 100);
}

/** Get uptime badge color */
function getUptimeColor(uptime: number): { text: string; bg: string; border: string } {
  if (uptime >= UPTIME_EXCELLENT) {
    return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  }
  if (uptime >= UPTIME_GOOD) {
    return { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" };
  }
  if (uptime >= UPTIME_WARNING) {
    return { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" };
  }
  return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" };
}

/** Simple sparkline SVG */
function Sparkline({ data, color = "#22c55e", className }: { data: number[]; color?: string; className?: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mini bar chart for error trends */
function ErrorBars({ data, className }: { data: { label: string; value: number }[]; className?: string }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className={cn("flex items-end gap-1 h-16", className)}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={cn(
              "w-full rounded-t transition-all",
              d.value > 0 ? "bg-red-500/60" : "bg-surface-4"
            )}
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "2px" }}
          />
          <span className="text-[8px] text-tertiary">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * AGT-217: Health Dashboard
 * Shows system health metrics: uptime, success rate, error trends, MTTR
 */
export function HealthDashboard({ className }: HealthDashboardProps) {
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as TaskDoc[] | undefined;

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!tasks || !agents) return null;

    const now = new Date().getTime();
    const day24h = 24 * 60 * 60 * 1000;
    const day7 = 7 * day24h;
    const day30 = 30 * day24h;

    // Filter tasks by time period
    const tasks24h = tasks.filter(t => t.updatedAt > now - day24h);
    const tasks7d = tasks.filter(t => t.updatedAt > now - day7);
    const tasks30d = tasks.filter(t => t.updatedAt > now - day30);

    // Completed tasks
    const completed24h = tasks24h.filter(t => t.status?.toLowerCase() === "done");
    const completed7d = tasks7d.filter(t => t.status?.toLowerCase() === "done");
    const completed30d = tasks30d.filter(t => t.status?.toLowerCase() === "done");

    // Tasks with errors/retries
    const withErrors = tasks.filter(t => t.retryCount && t.retryCount > 0 || t.lastError);
    const errors24h = withErrors.filter(t => t.updatedAt > now - day24h);
    const errors7d = withErrors.filter(t => t.updatedAt > now - day7);

    // Success rate (completed without errors / total attempted)
    const attempted24h = tasks24h.filter(t => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "in_progress");
    const successRate24h = attempted24h.length > 0
      ? Math.round((completed24h.filter(t => !t.lastError && (!t.retryCount || t.retryCount === 0)).length / attempted24h.length) * 100)
      : 100;

    const attempted7d = tasks7d.filter(t => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "in_progress");
    const successRate7d = attempted7d.length > 0
      ? Math.round((completed7d.filter(t => !t.lastError && (!t.retryCount || t.retryCount === 0)).length / attempted7d.length) * 100)
      : 100;

    // MTTR: Mean Time To Recovery (for tasks that had errors but were completed)
    const recoveredTasks = completed30d.filter(t => t.retryCount && t.retryCount > 0 && t.completedAt);
    const mttrMinutes = recoveredTasks.length > 0
      ? Math.round(
          recoveredTasks.reduce((sum, t) => {
            const duration = (t.completedAt || t.updatedAt) - t.createdAt;
            return sum + duration / 60000; // Convert to minutes
          }, 0) / recoveredTasks.length
        )
      : 0;

    // Error trend by day (last 7 days)
    const errorsByDay: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayErrors = withErrors.filter(t => t.updatedAt >= dayStart && t.updatedAt < dayEnd);
      errorsByDay.push({
        label: format(dayStart, "EEE"),
        value: dayErrors.length,
      });
    }

    // Success rate trend by day (last 7 days)
    const successByDay: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayTasks = tasks.filter(t => t.updatedAt >= dayStart && t.updatedAt < dayEnd);
      const dayCompleted = dayTasks.filter(t => t.status?.toLowerCase() === "done" && !t.lastError);
      const dayAttempted = dayTasks.filter(t => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "in_progress");
      successByDay.push(dayAttempted.length > 0 ? (dayCompleted.length / dayAttempted.length) * 100 : 100);
    }

    // Per-agent metrics
    const agentMetrics = agents.map(agent => {
      const agentName = agent.name.toLowerCase();
      const agentTasks = tasks.filter(t => t.agentName?.toLowerCase() === agentName);
      const agentCompleted = agentTasks.filter(t => t.status?.toLowerCase() === "done");
      const agentErrors = agentTasks.filter(t => t.lastError || (t.retryCount && t.retryCount > 0));
      const successRate = agentCompleted.length > 0
        ? Math.round(((agentCompleted.length - agentErrors.filter(t => t.status?.toLowerCase() === "done").length) / agentCompleted.length) * 100)
        : 100;

      // Per-agent success trend
      const agentSuccessTrend: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(now, i)).getTime();
        const dayEnd = dayStart + day24h;
        const dayTasks = agentTasks.filter(t => t.updatedAt >= dayStart && t.updatedAt < dayEnd);
        const dayCompleted = dayTasks.filter(t => t.status?.toLowerCase() === "done" && !t.lastError);
        agentSuccessTrend.push(dayTasks.length > 0 ? (dayCompleted.length / Math.max(1, dayTasks.length)) * 100 : 100);
      }

      return {
        ...agent,
        uptime24h: calculateUptime(agent.lastHeartbeat, day24h),
        uptime7d: calculateUptime(agent.lastHeartbeat, day7),
        uptime30d: calculateUptime(agent.lastHeartbeat, day30),
        tasksCompleted: agentCompleted.length,
        errorCount: agentErrors.length,
        successRate,
        successTrend: agentSuccessTrend,
      };
    });

    return {
      completed24h: completed24h.length,
      completed7d: completed7d.length,
      completed30d: completed30d.length,
      errors24h: errors24h.length,
      errors7d: errors7d.length,
      successRate24h,
      successRate7d,
      mttrMinutes,
      errorsByDay,
      successByDay,
      agentMetrics,
      totalTasks: tasks.length,
    };
  }, [tasks, agents]);

  if (!agents || !metrics) {
    return (
      <div className={cn("flex items-center justify-center h-full text-tertiary", className)}>
        <span className="animate-pulse">Loading health metrics...</span>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6 overflow-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">System Health</h2>
        <span className="text-xs text-tertiary">
          Last updated {formatDistanceToNow(new Date().getTime(), { addSuffix: true })}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Success Rate */}
        <div className="rounded-lg border border-border-default bg-surface-1 p-4">
          <div className="text-xs text-tertiary mb-1">Success Rate (24h)</div>
          <div className={cn(
            "text-2xl font-bold",
            metrics.successRate24h >= 95 ? "text-emerald-400" :
            metrics.successRate24h >= 80 ? "text-yellow-400" : "text-red-400"
          )}>
            {metrics.successRate24h}%
          </div>
          <div className="mt-2">
            <Sparkline
              data={metrics.successByDay}
              color={metrics.successRate24h >= 95 ? "#22c55e" : metrics.successRate24h >= 80 ? "#eab308" : "#ef4444"}
            />
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="rounded-lg border border-border-default bg-surface-1 p-4">
          <div className="text-xs text-tertiary mb-1">Completed (7d)</div>
          <div className="text-2xl font-bold text-white">{metrics.completed7d}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-tertiary">24h:</span>
            <span className="text-xs text-secondary">{metrics.completed24h}</span>
            <span className="text-xs text-tertiary">30d:</span>
            <span className="text-xs text-secondary">{metrics.completed30d}</span>
          </div>
        </div>

        {/* Errors */}
        <div className="rounded-lg border border-border-default bg-surface-1 p-4">
          <div className="text-xs text-tertiary mb-1">Errors (7d)</div>
          <div className={cn(
            "text-2xl font-bold",
            metrics.errors7d === 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {metrics.errors7d}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-tertiary">24h:</span>
            <span className={cn("text-xs", metrics.errors24h > 0 ? "text-red-400" : "text-secondary")}>
              {metrics.errors24h}
            </span>
          </div>
        </div>

        {/* MTTR */}
        <div className="rounded-lg border border-border-default bg-surface-1 p-4">
          <div className="text-xs text-tertiary mb-1">MTTR</div>
          <div className="text-2xl font-bold text-white">
            {metrics.mttrMinutes > 0 ? `${metrics.mttrMinutes}m` : "—"}
          </div>
          <div className="mt-2 text-xs text-tertiary">
            Mean time to recovery
          </div>
        </div>
      </div>

      {/* Error Trend Chart */}
      <div className="rounded-lg border border-border-default bg-surface-1 p-4">
        <div className="text-xs text-tertiary mb-3">Error Trend (7 days)</div>
        <ErrorBars data={metrics.errorsByDay} />
      </div>

      {/* Agent Health Grid */}
      <div>
        <div className="text-xs text-tertiary mb-3 uppercase tracking-wider">Agent Health</div>
        <div className="grid grid-cols-3 gap-4">
          {metrics.agentMetrics.map((agent) => {
            const uptimeColors = getUptimeColor(agent.uptime24h);
            return (
              <div
                key={agent._id}
                className="rounded-lg border border-border-default bg-surface-1 p-4"
              >
                {/* Agent Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{agent.avatar}</span>
                  <div>
                    <div className="font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-tertiary capitalize">{agent.status}</div>
                  </div>
                </div>

                {/* Uptime Badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-tertiary">Uptime:</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs font-medium border",
                      uptimeColors.text,
                      uptimeColors.bg,
                      uptimeColors.border
                    )}
                  >
                    24h: {agent.uptime24h}%
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-tertiary">Completed</div>
                    <div className="text-white font-medium">{agent.tasksCompleted}</div>
                  </div>
                  <div>
                    <div className="text-tertiary">Success Rate</div>
                    <div className={cn(
                      "font-medium",
                      agent.successRate >= 95 ? "text-emerald-400" :
                      agent.successRate >= 80 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {agent.successRate}%
                    </div>
                  </div>
                </div>

                {/* Success Sparkline */}
                <div className="mt-3 pt-3 border-t border-border-default">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-tertiary">7-day trend</span>
                    <Sparkline
                      data={agent.successTrend}
                      color={agent.successRate >= 95 ? "#22c55e" : agent.successRate >= 80 ? "#eab308" : "#ef4444"}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
