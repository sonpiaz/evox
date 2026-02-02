"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AgentStatus = "online" | "idle" | "offline" | "busy";
type AgentRole = "pm" | "backend" | "frontend";

/** AGT-147: Per-agent task counts for badge */
export interface AgentTaskCounts {
  backlog: number;
  inProgress: number;
  done: number;
}

interface AgentCardProps {
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  avatar: string;
  /** Last heartbeat (lastSeen) from agent */
  lastHeartbeat?: Date;
  /** Last activity timestamp from activities table (preferred for "Last active") */
  lastActivityAt?: Date;
  /** Unread message count (AGT-123 boot sequence) */
  unreadCount?: number;
  /** AGT-147: Per-agent task counts (backlog · in progress · done) */
  taskCounts?: AgentTaskCounts;
  /** AGT-147: Max is session-based; show "Session-based" instead of heartbeat time */
  sessionBased?: boolean;
}

const roleLabels: Record<AgentRole, string> = {
  pm: "Product Manager",
  backend: "Backend",
  frontend: "Frontend",
};

const roleColors: Record<AgentRole, string> = {
  pm: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  backend: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  frontend: "bg-green-500/10 text-green-500 border-green-500/20",
};

/** Status dot colors (AGT-101): Online=green, Busy=yellow, Idle=gray, Offline=red */
const statusDotColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-red-500",
};

const statusLabels: Record<AgentStatus, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
  busy: "Busy",
};

export function AgentCard({
  name,
  role,
  status,
  currentTask,
  avatar,
  lastHeartbeat,
  lastActivityAt,
  unreadCount = 0,
  taskCounts,
  sessionBased = false,
}: AgentCardProps) {
  const getRelativeTime = (date?: Date) => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Prefer last activity from activities table; fallback to lastHeartbeat (lastSeen)
  const lastActive = lastActivityAt ?? lastHeartbeat;

  // Get status based on last heartbeat (for tooltip)
  const getAgentStatus = () => {
    const ref = lastHeartbeat ?? lastActivityAt;
    if (!ref) return { status: "offline", color: "bg-red-500", label: "Offline" };
    const minutesAgo = Math.floor((Date.now() - ref.getTime()) / 60000);
    if (minutesAgo < 5) return { status: "active", color: "bg-green-500", label: "Active" };
    if (minutesAgo < 15) return { status: "idle", color: "bg-yellow-500", label: "Idle" };
    return { status: "offline", color: "bg-red-500", label: "Offline" };
  };

  const liveStatus = getAgentStatus();
  // BUG 2: Normalize status (case-insensitive) so Busy/busy → yellow, Idle/idle → gray
  const normalizedStatus = (status?.toLowerCase?.() ?? "offline") as AgentStatus;
  const statusDotColor = statusDotColors[normalizedStatus] ?? statusDotColors.offline;
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar with status dot (AGT-101: Online=green, Busy=yellow, Idle=gray, Offline=red) */}
          <div className="relative group">
            <Avatar className="h-12 w-12 border-2 border-zinc-800">
              <AvatarFallback className="bg-zinc-800 text-zinc-50">
                {avatar}
              </AvatarFallback>
            </Avatar>
            <div className="relative">
              <div
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900",
                  statusDotColor
                )}
              />
              {normalizedStatus === "online" && (
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full animate-ping",
                    statusDotColor,
                    "opacity-75"
                  )}
                />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block">
              <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-50 shadow-lg whitespace-nowrap">
                {liveStatus.label} — last active {getRelativeTime(lastActive)}
              </div>
            </div>
          </div>

          {/* Agent info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-50">{name}</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs"
                  >
                    {unreadCount} unread
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn("text-xs", roleColors[role])}
                >
                  {roleLabels[role]}
                </Badge>
              </div>
            </div>

            {/* Status badge + time or Session-based (AGT-147) */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  normalizedStatus === "online" && "border-green-500/20 bg-green-500/10 text-green-500",
                  normalizedStatus === "busy" && "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
                  normalizedStatus === "idle" && "border-gray-500/20 bg-gray-500/10 text-gray-400",
                  normalizedStatus === "offline" && "border-red-500/20 bg-red-500/10 text-red-500"
                )}
              >
                {statusLabels[normalizedStatus] ?? statusLabels.offline}
              </Badge>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">
                {sessionBased ? "Session-based" : getRelativeTime(lastActive)}
              </span>
            </div>

            {/* AGT-147: Task count badge */}
            {taskCounts && (
              <p className="text-xs text-zinc-500">
                {taskCounts.backlog} backlog · {taskCounts.inProgress} in progress · {taskCounts.done} done
              </p>
            )}

            {/* Current task */}
            {currentTask ? (
              <div className="space-y-1">
                <p className="text-xs text-zinc-600">Working on:</p>
                <p className="text-sm text-zinc-400 line-clamp-2">{currentTask}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 italic">No active task</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
