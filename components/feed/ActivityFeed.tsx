"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-blue-400",
  leo: "text-emerald-400",
  quinn: "text-amber-400",
};

/**
 * AGT-333: Live Activity Feed — real-time stream of agent actions.
 */
export function ActivityFeed() {
  const feed = useQuery(api.dashboard.getLiveStream, { limit: 10 });

  if (!feed) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-secondary)] rounded-lg h-14 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-tertiary)]">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {feed.map((item) => (
        <div
          key={item._id}
          className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          {/* Agent dot */}
          <div
            className="w-2 h-2 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: item.agentColor || "#666" }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-bold uppercase",
                  AGENT_COLORS[item.agentName?.toLowerCase() ?? ""] ??
                    "text-secondary"
                )}
              >
                {item.agentName || "system"}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                {item.category}
              </span>
            </div>
            <div className="text-sm text-[var(--text-secondary)] truncate">
              {item.title}
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums shrink-0">
            {item.timestamp
              ? formatDistanceToNow(item.timestamp, { addSuffix: false })
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
