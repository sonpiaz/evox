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

/** AGT-184: Analytics bar — same source as top bar (dashboard.getStats), always visible */
export function AnalyticsBar({ taskCounts }: AnalyticsBarProps) {
  const dashboardStats = useQuery(api.dashboard.getStats);

  // AGT-184: Use dashboard.getStats when available (same as top bar per AGT-183); fallback to prop while loading
  const counts = dashboardStats?.taskCounts ?? taskCounts;
  const stats = useMemo(() => {
    const total = counts.backlog + counts.todo + counts.inProgress + counts.review + counts.done;
    const completed = counts.done;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const inProgress = counts.inProgress + counts.review;
    const lastSyncTime = dashboardStats?.lastSyncTime ?? null;

    return {
      total,
      completed,
      completionRate,
      inProgress,
      todo: counts.todo,
      backlog: counts.backlog,
      lastSyncTime,
    };
  }, [counts, dashboardStats]);

  const chipBase =
    "rounded-lg border border-white/[0.06] bg-white/[0.03] px-5 py-3 transition-colors duration-150 hover:bg-white/[0.05]";

  return (
    <div
      className="flex min-h-[4.5rem] shrink-0 items-center gap-4 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3"
      role="region"
      aria-label="Analytics"
    >
      {/* Completion Chip — highlight with progress bar */}
      <div className={chipBase}>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Completion</span>
          <span className="text-xl font-semibold text-amber-400">{stats.completionRate}%</span>
          <span className="text-sm text-white/30">({stats.completed}/{stats.total})</span>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
              style={{ width: `${Math.min(100, stats.completionRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* In Progress Chip */}
      <div className={chipBase}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">In Progress</span>
          </div>
          <span className="text-xl font-semibold text-blue-400">{stats.inProgress}</span>
        </div>
      </div>

      {/* Queue Chip */}
      <div className={chipBase}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Queue</span>
          </div>
          <span className="text-xl font-semibold text-yellow-400">{stats.todo}</span>
        </div>
      </div>

      {/* Backlog Chip */}
      <div className={chipBase}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" aria-hidden />
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Backlog</span>
          </div>
          <span className="text-xl font-semibold text-white/60">{stats.backlog}</span>
        </div>
      </div>

      {/* Last Sync Chip (if available) */}
      {stats.lastSyncTime && (
        <div className={chipBase}>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Last Sync</span>
            <span className="text-sm font-semibold text-white/60">{formatDistanceToNow(stats.lastSyncTime, { addSuffix: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
