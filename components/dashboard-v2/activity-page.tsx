"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/** Activity event type */
type ActivityEvent = {
  _id: string;
  eventType?: string;
  agentName?: string;
  linearIdentifier?: string;
  timestamp?: number;
  title?: string;
  description?: string;
  category?: string;
  metadata?: { toStatus?: string; assignedTo?: string; content?: string };
};

/** AGT-181: Activity feed with filter tabs */
const EVENT_FILTERS = ["all", "task", "message"] as const;
type EventFilter = (typeof EVENT_FILTERS)[number];

/** Event type icons and colors - Linear style */
const eventConfig: Record<string, { icon: string; color: string }> = {
  created: { icon: "🟢", color: "text-green-500" },
  status_change: { icon: "🔵", color: "text-blue-500" },
  moved: { icon: "🔵", color: "text-blue-500" },
  completed: { icon: "✅", color: "text-emerald-500" },
  assigned: { icon: "👤", color: "text-gray-400" },
  updated: { icon: "📝", color: "text-yellow-500" },
  commented: { icon: "💬", color: "text-purple-400" },
  push: { icon: "📤", color: "text-orange-400" },
  pr_merged: { icon: "🔀", color: "text-purple-500" },
  deploy_success: { icon: "🚀", color: "text-green-400" },
  sync_completed: { icon: "🔄", color: "text-blue-400" },
};

const eventVerbs: Record<string, string> = {
  created: "created",
  status_change: "moved",
  moved: "moved",
  completed: "completed",
  assigned: "assigned",
  updated: "updated",
  commented: "commented on",
  push: "pushed",
  pr_merged: "merged",
  deploy_success: "deployed",
  sync_completed: "synced",
};

export function ActivityPage() {
  const [filter, setFilter] = useState<EventFilter>("all");

  // Real-time subscription to activity events
  // @ts-expect-error - TS2589 deep type instantiation in Convex types
  const events: ActivityEvent[] | undefined = useQuery(api.activityEvents.list, { limit: 50 });

  // Filter events based on selected filter (by category)
  const filteredEvents = (events as ActivityEvent[] | undefined)?.filter((event) => {
    if (filter === "all") return true;
    const category = event.category ?? "";
    if (filter === "task") return category === "task";
    if (filter === "message") return category === "message";
    return true;
  }) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Filter tabs */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-4 py-3">
        <div className="flex gap-1">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded border px-2 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors",
                filter === f
                  ? "border-white/20 bg-white/[0.05] text-primary"
                  : "border-border-default text-secondary hover:border-gray-500 hover:text-primary"
              )}
            >
              {f === "all" ? "All" : f === "task" ? "Tasks" : "Messages"}
            </button>
          ))}
        </div>
      </div>

      {/* Activity list - Linear style */}
      <div className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-secondary">
            No activity found
          </div>
        ) : (
          filteredEvents.map((event) => {
            const eventType = event.eventType ?? "updated";
            const config = eventConfig[eventType] ?? { icon: "•", color: "text-secondary" };
            const verb = eventVerbs[eventType] ?? eventType;
            const agentName = (event.agentName ?? "unknown").toUpperCase();
            const ticketId = event.linearIdentifier ?? "";
            const title = event.title ?? "";
            const description = event.description ?? event.metadata?.content ?? "";
            const metadata = event.metadata as { toStatus?: string; assignedTo?: string; content?: string } | undefined;

            // Build action detail
            let actionDetail = "";
            if (eventType === "status_change" || eventType === "moved") {
              const toStatus = metadata?.toStatus?.replace("_", " ") ?? "";
              if (toStatus) actionDetail = ` → ${toStatus}`;
            } else if (eventType === "assigned") {
              const assignedTo = metadata?.assignedTo?.toUpperCase() ?? "";
              if (assignedTo) actionDetail = ` → ${assignedTo}`;
            }

            return (
              <div
                key={event._id}
                className="flex flex-col gap-1 border-b border-border-default px-4 py-2.5 transition-colors hover:bg-surface-1"
              >
                {/* Main row */}
                <div className="flex items-center gap-2">
                  {/* Icon */}
                  <span className="shrink-0 text-sm">{config.icon}</span>

                  {/* Agent name */}
                  <span className="w-10 shrink-0 truncate text-xs font-medium text-primary">
                    {agentName}
                  </span>

                  {/* Action verb */}
                  <span className={cn("shrink-0 text-xs", config.color)}>
                    {verb}
                  </span>

                  {/* Ticket ID */}
                  {ticketId && (
                    <span className="shrink-0 font-mono text-xs text-primary">
                      {ticketId}
                    </span>
                  )}

                  {/* Action detail */}
                  {actionDetail && (
                    <span className="shrink-0 text-xs text-secondary">
                      {actionDetail}
                    </span>
                  )}

                  {/* Spacer */}
                  <span className="flex-1" />

                  {/* Timestamp */}
                  <span className="shrink-0 text-[10px] text-secondary">
                    {formatDistanceToNow(event.timestamp ?? new Date().getTime(), { addSuffix: false })}
                  </span>
                </div>

                {/* Title/Description row - if available */}
                {(title || description) && (
                  <div className="ml-6 text-xs text-secondary truncate max-w-[90%]">
                    {title || description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
