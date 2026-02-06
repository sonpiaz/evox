"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface DailyNoteCardProps {
  date: string;
  content: string;
  updatedAt?: number;
  className?: string;
}

/**
 * AGT-113: Individual daily note card with expand/collapse
 */
export function DailyNoteCard({ date, content, updatedAt, className }: DailyNoteCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Show first 3 lines when collapsed
  const lines = content.split("\n").filter((l) => l.trim());
  const previewLines = lines.slice(0, 3);
  const hasMore = lines.length > 3;

  // Format date nicely
  const dateObj = new Date(date);
  const isToday = new Date().toISOString().split("T")[0] === date;
  const displayDate = isToday ? "Today" : format(dateObj, "MMM d, yyyy");

  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-1 transition-colors",
        expanded ? "bg-surface-1/80" : "",
        className
      )}
    >
      {/* Header - clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-secondary">{displayDate}</span>
          {isToday && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {updatedAt != null && (
            <span className="text-xs text-tertiary">
              {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </span>
          )}
          <span className="text-xs text-primary0">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Content */}
      <div className={cn("px-3 pb-3", !expanded && "line-clamp-3")}>
        {expanded ? (
          <div className="whitespace-pre-wrap text-sm text-secondary">{content}</div>
        ) : (
          <div className="text-sm text-primary0">
            {previewLines.map((line, i) => (
              <div key={i} className="truncate">
                {line}
              </div>
            ))}
            {hasMore && <span className="text-primary0">...</span>}
          </div>
        )}
      </div>
    </div>
  );
}
