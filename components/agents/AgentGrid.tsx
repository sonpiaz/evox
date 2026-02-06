"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AgentCard } from "./AgentCard";

/**
 * AGT-333: Agent Grid — shows all agents with status from AGT-332 registry.
 */
export function AgentGrid() {
  const agents = useQuery(api.agents.list);

  if (!agents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-[var(--bg-secondary)] rounded-xl p-4 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {agents.map((agent) => {
        const normalizedStatus = (agent.status?.toLowerCase() ?? "offline") as
          | "online"
          | "offline"
          | "busy"
          | "idle";

        return (
          <AgentCard
            key={agent.agentId ?? agent._id}
            agentId={agent.agentId ?? ""}
            name={agent.name}
            status={normalizedStatus}
            activity={agent.statusReason ?? undefined}
            taskId={
              agent.currentTask
                ? String(agent.currentTask).slice(0, 12)
                : undefined
            }
            lastSeen={agent.lastSeen ?? undefined}
          />
        );
      })}
    </div>
  );
}
