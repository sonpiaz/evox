"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AgentStatus = "online" | "idle" | "offline";
type AgentRole = "pm" | "backend" | "frontend";

interface AgentCardProps {
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  avatar: string;
  lastHeartbeat?: Date;
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

const statusColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  idle: "bg-yellow-500",
  offline: "bg-red-500",
};

const statusLabels: Record<AgentStatus, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
};

export function AgentCard({ name, role, status, currentTask, avatar, lastHeartbeat }: AgentCardProps) {
  // Format last heartbeat as relative time
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

  // Get status based on last heartbeat
  const getAgentStatus = () => {
    if (!lastHeartbeat) return { status: "offline", color: "bg-red-500", label: "Offline" };
    const minutesAgo = Math.floor((Date.now() - lastHeartbeat.getTime()) / 60000);
    if (minutesAgo < 5) return { status: "active", color: "bg-green-500", label: "Active" };
    if (minutesAgo < 15) return { status: "idle", color: "bg-yellow-500", label: "Idle" };
    return { status: "offline", color: "bg-red-500", label: "Offline" };
  };

  const liveStatus = getAgentStatus();
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar with live status indicator */}
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
                  liveStatus.color
                )}
              />
              {liveStatus.status === "active" && (
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full animate-ping",
                    liveStatus.color,
                    "opacity-75"
                  )}
                />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block">
              <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-50 shadow-lg whitespace-nowrap">
                {liveStatus.label} — last seen {getRelativeTime(lastHeartbeat)}
              </div>
            </div>
          </div>

          {/* Agent info */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-50">{name}</h3>
              <Badge
                variant="outline"
                className={cn("text-xs", roleColors[role])}
              >
                {roleLabels[role]}
              </Badge>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  status === "online" && "border-green-500/20 bg-green-500/10 text-green-500",
                  status === "idle" && "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
                  status === "offline" && "border-red-500/20 bg-red-500/10 text-red-500"
                )}
              >
                {statusLabels[status]}
              </Badge>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">{getRelativeTime(lastHeartbeat)}</span>
            </div>

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
