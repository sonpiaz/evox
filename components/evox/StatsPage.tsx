"use client";

/**
 * AGT-326: Stats Page — Time-Filtered Metrics Dashboard
 * Cycle 3 — "Truth Mirror"
 *
 * Truth #3: Measure or Die
 * Every metric is real, comparable, actionable.
 *
 * Layout: Time Filter → Completion Bar → Count Cards → Velocity + Cost
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from "date-fns";

type TimeMode = "day" | "week" | "30days";

const TIME_LABELS: Record<TimeMode, string> = {
  day: "Today",
  week: "This Week",
  "30days": "Last 30 Days",
};

/** Sparkline bar chart for velocity trend */
function VelocityBars({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm bg-blue-500/80 min-h-[2px] transition-all duration-300"
            style={{ height: `${(val / max) * 100}%` }}
          />
          <span className="text-[8px] text-white/20 tabular-nums">{val}</span>
        </div>
      ))}
    </div>
  );
}

/** Count card for status metrics */
function CountCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5",
    zinc: "text-zinc-400 border-zinc-500/20 bg-zinc-500/5",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
  };

  return (
    <div className={cn("rounded-lg border p-4 text-center", colorMap[color] || colorMap.zinc)}>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">{label}</div>
    </div>
  );
}

interface StatsPageProps {
  className?: string;
}

export function StatsPage({ className }: StatsPageProps) {
  const [mode, setMode] = useState<TimeMode>("day");
  const now = new Date();

  // Calculate date range based on mode
  const { startTs, endTs } = useMemo(() => {
    if (mode === "day") {
      return { startTs: startOfDay(now).getTime(), endTs: endOfDay(now).getTime() };
    } else if (mode === "week") {
      return { startTs: startOfWeek(now, { weekStartsOn: 1 }).getTime(), endTs: endOfWeek(now, { weekStartsOn: 1 }).getTime() };
    } else {
      return { startTs: subDays(now, 30).getTime(), endTs: now.getTime() };
    }
  }, [mode]);

  // Queries
  const dashboardStats = useQuery(api.dashboard.getStats, { startTs, endTs });
  const tasks = useQuery(api.tasks.list, { limit: 500 });
  const today = now.toISOString().split("T")[0];
  const performance = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today });

  // Calculate counts
  const counts = useMemo(() => {
    if (!dashboardStats) return { done: 0, inProgress: 0, todo: 0, backlog: 0, total: 0 };
    const tc = dashboardStats.taskCounts || {};
    const done = tc.done || 0;
    const inProgress = (tc.inProgress || 0) + (tc.review || 0);
    const todo = tc.todo || 0;
    const backlog = tc.backlog || 0;
    const total = done + inProgress + todo + backlog;
    return { done, inProgress, todo, backlog, total };
  }, [dashboardStats]);

  // Completion percentage
  const completionPct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  // Velocity trend (last 7 days regardless of filter — for context)
  const velocityTrend = useMemo(() => {
    if (!tasks) return [];
    const day24h = 24 * 60 * 60 * 1000;
    const trend: number[] = [];
    const days = mode === "30days" ? 30 : mode === "week" ? 7 : 7;
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i)).getTime();
      const dayEnd = dayStart + day24h;
      trend.push(
        tasks.filter((t: any) =>
          t.status?.toLowerCase() === "done" &&
          t.completedAt &&
          t.completedAt >= dayStart &&
          t.completedAt < dayEnd
        ).length
      );
    }
    return trend;
  }, [tasks, mode]);

  // Cost
  const totalCost = useMemo(() => {
    if (!performance) return 0;
    return performance.reduce((sum: number, p: any) => sum + (p.totalCost || 0), 0);
  }, [performance]);

  const avgCostPerTask = counts.done > 0 ? totalCost / counts.done : 0;

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto p-4 sm:p-6 gap-5", className)}>

      {/* Time Filter */}
      <div className="flex items-center gap-2">
        {(Object.keys(TIME_LABELS) as TimeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
              mode === m
                ? "bg-white/10 text-white"
                : "text-white/30 hover:bg-white/5 hover:text-white/60"
            )}
          >
            {TIME_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Completion Progress */}
      <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">Completion</span>
          <span className="text-sm text-white/50">
            {counts.done}/{counts.total} tasks
          </span>
        </div>
        <div className="h-4 rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              completionPct >= 80 ? "bg-emerald-500" : completionPct >= 50 ? "bg-blue-500" : completionPct >= 25 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="mt-2 text-right">
          <span className={cn(
            "text-2xl font-bold tabular-nums",
            completionPct >= 80 ? "text-emerald-400" : completionPct >= 50 ? "text-blue-400" : completionPct >= 25 ? "text-yellow-400" : "text-red-400"
          )}>
            {completionPct}%
          </span>
        </div>
      </div>

      {/* Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CountCard label="In Progress" value={counts.inProgress} color="blue" />
        <CountCard label="Queue" value={counts.todo} color="yellow" />
        <CountCard label="Backlog" value={counts.backlog} color="zinc" />
        <CountCard label="Done" value={counts.done} color="emerald" />
      </div>

      {/* Velocity + Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Velocity Trend */}
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
            Velocity ({mode === "30days" ? "30 days" : "7 days"})
          </div>
          <VelocityBars data={velocityTrend} />
          <div className="mt-2 text-xs text-white/30">
            Avg: {velocityTrend.length > 0 ? (velocityTrend.reduce((a, b) => a + b, 0) / velocityTrend.length).toFixed(1) : "0"} tasks/day
          </div>
        </div>

        {/* Cost Summary */}
        <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">Cost</div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-white/40 text-sm">Total Spend</span>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-white/40 text-sm">Avg per Task</span>
              <span className="text-lg font-bold text-white/60 tabular-nums">${avgCostPerTask.toFixed(2)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-white/40 text-sm">Tasks Done</span>
              <span className="text-lg font-bold text-blue-400 tabular-nums">{counts.done}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
