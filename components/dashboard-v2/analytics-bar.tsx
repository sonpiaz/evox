"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsBarProps {
  taskCounts: {
    backlog: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

/** AGT-181 fix: Analytics bar — horizontal stats above kanban */
export function AnalyticsBar({ taskCounts }: AnalyticsBarProps) {
  const dashboardStats = useQuery(api.dashboard.getStats);

  const stats = useMemo(() => {
    const total = taskCounts.backlog + taskCounts.todo + taskCounts.inProgress + taskCounts.review + taskCounts.done;
    const completed = taskCounts.done;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgress = taskCounts.inProgress + taskCounts.review;
    const lastSyncTime = dashboardStats?.lastSyncTime ?? null;

    return {
      total,
      completed,
      completionRate,
      inProgress,
      todo: taskCounts.todo,
      backlog: taskCounts.backlog,
      lastSyncTime,
    };
  }, [taskCounts, dashboardStats]);

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
      {/* Completion Chip */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.06]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Completion</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-amber-400">{stats.completionRate}%</span>
            <span className="text-xs text-white/40">({stats.completed}/{stats.total})</span>
          </div>
        </div>
      </div>

      {/* In Progress Chip */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.06]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">In Progress</span>
          <span className="text-lg font-semibold text-white/90">{stats.inProgress}</span>
        </div>
      </div>

      {/* Queue Chip */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.06]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Queue</span>
          <span className="text-lg font-semibold text-white/90">{stats.todo}</span>
        </div>
      </div>

      {/* Backlog Chip */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.06]">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Backlog</span>
          <span className="text-lg font-semibold text-white/90">{stats.backlog}</span>
        </div>
      </div>

      {/* Last Sync Chip (if available) */}
      {stats.lastSyncTime && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.06]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">Last Sync</span>
            <span className="text-sm font-semibold text-white/70">{formatDistanceToNow(stats.lastSyncTime, { addSuffix: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
