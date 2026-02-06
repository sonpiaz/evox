"use client";

/**
 * LiveFeed - IMPACT FEED
 * Shows real work: commits, completions, deployments
 * Filtered for signal. No noise.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface LiveFeedProps {
  limit?: number;
  className?: string;
}

// Action icons for visual scanning
const ACTION_ICONS: Record<string, string> = {
  shipped: "!",
  completed: "!",
  finished: "!",
  merged: "!",
  deployed: "!",
  pushed: "!",
  created: "+",
  started: ">",
};

// Impact colors
const IMPACT_COLORS: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-blue-400",
  low: "text-secondary",
};

export function LiveFeed({ limit = 8, className }: LiveFeedProps) {
  const feed = useQuery(api.ceoMetrics.getLiveFeed, { limit });

  if (!feed) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-4 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-6 text-primary0 text-sm">
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-1">
        {feed.map((item) => {
          const icon = ACTION_ICONS[item.action] || "-";
          const impactColor = IMPACT_COLORS[item.impact] || IMPACT_COLORS.low;

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-2 py-2 px-2 rounded transition-colors",
                item.impact === "high" && "bg-surface-4/30 hover:bg-surface-4/50",
                item.impact !== "high" && "hover:bg-surface-4/30"
              )}
            >
              {/* Avatar */}
              <span className="text-base shrink-0">{item.avatar}</span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {/* Impact indicator */}
                  <span className={cn("font-bold text-sm", impactColor)}>
                    {icon}
                  </span>

                  {/* Agent */}
                  <span className="font-semibold text-white text-sm">
                    {item.agent}
                  </span>

                  {/* Action */}
                  <span className={cn("text-sm font-medium", impactColor)}>
                    {item.action}
                  </span>

                  {/* Detail */}
                  <span className="text-primary text-sm truncate flex-1">
                    {item.detail}
                  </span>
                </div>

                {/* Meta info (files, lines) - only for commits */}
                {item.meta && (
                  <div className="text-[10px] text-primary0 mt-0.5 font-mono">
                    {item.meta}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-tertiary shrink-0">
                {formatDistanceToNow(item.timestamp, { addSuffix: false })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
