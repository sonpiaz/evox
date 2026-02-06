"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AgentCardProps {
  agentId: string;
  name: string;
  status: "online" | "offline" | "busy" | "idle";
  activity?: string;
  taskId?: string;
  lastSeen?: number;
  className?: string;
}

export function AgentCard({
  agentId,
  name,
  status,
  activity,
  taskId,
  lastSeen,
  className,
}: AgentCardProps) {
  const isOnline = status === "online" || status === "busy";

  return (
    <div
      className={cn(
        "bg-[var(--bg-secondary)] rounded-xl p-4 min-w-0 cursor-pointer hover:bg-[var(--bg-tertiary)] hover-lift transition-all duration-200",
        className
      )}
    >
      {/* Status + Name */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isOnline
              ? "bg-[var(--status-online)] animate-pulse-status"
              : status === "idle"
                ? "bg-[var(--status-warning)]"
                : "bg-[var(--status-offline)]"
          )}
        />
        <span className="text-base font-semibold text-[var(--text-primary)] uppercase">
          {name}
        </span>
      </div>

      {/* Activity */}
      {activity && (
        <div className="text-sm text-[var(--text-secondary)] mb-2 truncate">
          {activity}
        </div>
      )}

      {/* Task Link */}
      {taskId && (
        <div className="text-sm text-[var(--accent-primary)] font-medium">
          {taskId}
        </div>
      )}

      {/* Active Time */}
      <div className="text-xs text-[var(--text-tertiary)] mt-3">
        {lastSeen
          ? formatDistanceToNow(lastSeen, { addSuffix: true })
          : isOnline
            ? "Active now"
            : "No data"}
      </div>
    </div>
  );
}
