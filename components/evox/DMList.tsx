"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface Agent {
  name: string;
  avatar: string;
  status: string;
}

interface DMListProps {
  currentAgentName: string;
  agents: Agent[];
  selectedAgent: string | null;
  onSelectAgent: (agentName: string, avatar: string) => void;
  className?: string;
}

const statusDot: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
};

/**
 * AGT-118: DM List - Shows available agents with unread badges
 */
export function DMList({
  currentAgentName,
  agents,
  selectedAgent,
  onSelectAgent,
  className,
}: DMListProps) {
  // Get unread counts
  const unreadCounts = useQuery(api.agentMessages.getUnreadCounts);

  // Filter out current agent
  const otherAgents = agents.filter(
    (a) => a.name.toLowerCase() !== currentAgentName.toLowerCase()
  );

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary0">
          Direct Messages
        </span>
      </div>

      {otherAgents.map((agent) => {
        const agentNameLower = agent.name.toLowerCase();
        const unread = unreadCounts?.[agentNameLower] ?? 0;
        const isSelected = selectedAgent === agentNameLower;

        return (
          <button
            key={agent.name}
            type="button"
            onClick={() => onSelectAgent(agentNameLower, agent.avatar)}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
              isSelected
                ? "bg-surface-4 text-white"
                : "text-secondary hover:bg-surface-1 hover:text-primary"
            )}
          >
            {/* Avatar */}
            <span className="text-lg">{agent.avatar}</span>

            {/* Name */}
            <span className="flex-1 text-sm font-medium uppercase">{agent.name}</span>

            {/* Status dot */}
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                statusDot[agent.status?.toLowerCase()] ?? statusDot.offline
              )}
            />

            {/* Unread badge */}
            {unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        );
      })}

      {otherAgents.length === 0 && (
        <p className="px-2 text-xs text-tertiary">No other agents available</p>
      )}
    </div>
  );
}
