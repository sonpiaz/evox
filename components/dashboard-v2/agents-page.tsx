"use client";

import { useState, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AgentProfile } from "./agent-profile";
import { cn } from "@/lib/utils";
import { AgentStatusIndicator } from "@/components/evox/AgentStatusIndicator";

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
};

interface Agent {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  lastSeen?: number;
}

interface AgentsPageProps {
  agents: Agent[];
}

/** AGT-169: Agents page — left 200px agent list, right AgentProfile 6 tabs */
export function AgentsPage({ agents }: AgentsPageProps) {
  const [selectedId, setSelectedId] = useState<Id<"agents"> | null>(null);

  const selectedAgent = useMemo(
    () => (selectedId ? agents.find((a) => a._id === selectedId) ?? null : null),
    [agents, selectedId]
  );

  return (
    <div className="flex h-full">
      {/* Left panel: 200px agent list */}
      <aside className="w-[200px] shrink-0 flex flex-col border-r border-border-default bg-base">
        <div className="border-b border-border-default px-3 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-primary0">Agents</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {agents.map((agent) => {
            const isSelected = selectedId === agent._id;
            return (
              <button
                key={agent._id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : agent._id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border-default px-3 py-2.5 text-left transition-colors",
                  isSelected ? "bg-surface-4 text-primary" : "hover:bg-surface-1 text-secondary"
                )}
              >
                <AgentStatusIndicator status={agent.status} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="text-[11px] text-primary0">{roleLabels[agent.role] ?? agent.role}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right panel: Agent detail (6 tabs) — full width */}
      <main className="flex-1 min-w-0 flex flex-col">
        {selectedAgent ? (
          <AgentProfile
            agentId={selectedAgent._id}
            name={selectedAgent.name}
            role={selectedAgent.role}
            status={selectedAgent.status}
            avatar={selectedAgent.avatar ?? "?"}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-primary0 text-sm">
            Select an agent
          </div>
        )}
      </main>
    </div>
  );
}
