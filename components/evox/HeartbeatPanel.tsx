"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HeartbeatPanelProps {
  className?: string;
  compact?: boolean;
}

type AgentHealth = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastHeartbeat?: number;
  lastSeen?: number;
};

/** Thresholds for health status */
const HEALTHY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes

/** Get health status based on last heartbeat */
function getHealthStatus(lastHeartbeat?: number): "healthy" | "stale" | "offline" {
  if (!lastHeartbeat) return "offline";
  const currentTime = new Date().getTime();
  const elapsed = currentTime - lastHeartbeat;
  if (elapsed < HEALTHY_THRESHOLD) return "healthy";
  if (elapsed < STALE_THRESHOLD) return "stale";
  return "offline";
}

/** Health status colors */
const healthColors: Record<string, { dot: string; text: string; bg: string }> = {
  healthy: { dot: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  stale: { dot: "bg-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" },
  offline: { dot: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" },
};

/**
 * AGT-204: Heartbeat Status Panel
 * Shows system health with per-agent heartbeat status
 */
export function HeartbeatPanel({ className, compact = false }: HeartbeatPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const agents = useQuery(api.agents.list) as AgentHealth[] | undefined;

  if (!agents) {
    return (
      <div className={cn("rounded-lg border border-border-default bg-surface-1 p-3", className)}>
        <div className="flex items-center gap-2 text-xs text-tertiary">
          <span className="animate-pulse">Loading health status...</span>
        </div>
      </div>
    );
  }

  // Calculate overall health
  const healthStatuses = agents.map((a) => getHealthStatus(a.lastHeartbeat));
  const healthyCount = healthStatuses.filter((s) => s === "healthy").length;
  const staleCount = healthStatuses.filter((s) => s === "stale").length;
  const offlineCount = healthStatuses.filter((s) => s === "offline").length;

  const overallHealth =
    offlineCount > 0 ? "offline" : staleCount > 0 ? "stale" : "healthy";
  const overallColors = healthColors[overallHealth];

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border-default bg-surface-1 px-3 py-2 transition-colors hover:bg-surface-1",
          className
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", overallColors.dot, overallHealth === "healthy" && "animate-pulse")} />
        <span className="text-xs text-secondary">
          {healthyCount}/{agents.length} healthy
        </span>
      </button>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border-default bg-surface-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", overallColors.dot, overallHealth === "healthy" && "animate-pulse")} />
          <span className="text-xs font-medium uppercase tracking-wider text-secondary">
            System Health
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {healthyCount > 0 && (
            <span className="text-emerald-400">{healthyCount} healthy</span>
          )}
          {staleCount > 0 && (
            <span className="text-yellow-400">{staleCount} stale</span>
          )}
          {offlineCount > 0 && (
            <span className="text-red-400">{offlineCount} offline</span>
          )}
        </div>
      </div>

      {/* Agent list */}
      <div className="divide-y divide-border-default">
        {agents.map((agent) => {
          const health = getHealthStatus(agent.lastHeartbeat);
          const colors = healthColors[health];
          const timeAgo = agent.lastHeartbeat
            ? formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true })
            : "never";

          return (
            <div
              key={agent._id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/[0.02]",
                health === "offline" && "opacity-60"
              )}
            >
              {/* Status indicator */}
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  colors.dot,
                  health === "healthy" && "animate-pulse"
                )}
              />

              {/* Avatar */}
              <span className="text-lg">{agent.avatar}</span>

              {/* Name */}
              <span className="flex-1 text-sm font-medium text-primary">
                {agent.name}
              </span>

              {/* Time ago */}
              <span className={cn("text-xs", colors.text)}>
                {timeAgo}
              </span>

              {/* Status badge */}
              {health !== "healthy" && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    colors.bg,
                    colors.text
                  )}
                >
                  {health}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-border-default px-3 py-2">
        <div className="flex items-center justify-between text-[10px] text-tertiary">
          <span>Heartbeat interval: 15 min</span>
          <span>Stale threshold: 15 min</span>
        </div>
      </div>
    </div>
  );
}
