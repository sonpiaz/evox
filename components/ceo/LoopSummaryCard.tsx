"use client";

/**
 * LoopSummaryCard — AGT-336: CEO Dashboard header
 *
 * Glanceable loop health: active loops, completed today, broken, avg time.
 * Uses loopMetrics.getDailySummary query.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface LoopSummaryCardProps {
  className?: string;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "--";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function LoopSummaryCard({ className }: LoopSummaryCardProps) {
  const summary = useQuery(api.loopMetrics.getDailySummary);

  if (!summary) {
    return (
      <div className={className}>
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: "Active",
      value: summary.totalActive,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Done Today",
      value: summary.completedToday,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Broken",
      value: summary.brokenToday,
      color: summary.brokenToday > 0 ? "text-red-400" : "text-zinc-500",
      bg: summary.brokenToday > 0
        ? "bg-red-500/10 border-red-500/20"
        : "bg-zinc-800/50 border-zinc-700/30",
    },
    {
      label: "Avg Time",
      value: formatDuration(summary.avgCompletionTimeMs),
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className={className}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
        The Loop
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`${m.bg} border rounded-lg p-2 text-center`}
          >
            <div className={`text-lg font-bold tabular-nums ${m.color}`}>
              {m.value}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
