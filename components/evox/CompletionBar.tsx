"use client";

import { cn } from "@/lib/utils";

interface CompletionBarProps {
  percentage: number;
  done: number;
  inProgress: number;
  backlog: number;
  className?: string;
}

/**
 * AGT-205: Completion progress bar with breakdown
 */
export function CompletionBar({
  percentage,
  done,
  inProgress,
  backlog,
  className,
}: CompletionBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 rounded-full bg-surface-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-[width] duration-500"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <span className="text-lg font-semibold text-white w-14 text-right">
          {percentage}%
        </span>
      </div>

      {/* Breakdown */}
      <div className="flex items-center gap-4 text-xs text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{done} Done</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span>{inProgress} In Progress</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-500" />
          <span>{backlog} Backlog</span>
        </span>
      </div>
    </div>
  );
}
