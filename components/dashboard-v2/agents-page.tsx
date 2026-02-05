"use client";

import { useState, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { AgentProfile } from "./agent-profile";
import { cn } from "@/lib/utils";

/** AGT-169: Agent list item — status dot + name + role */
const statusDot: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
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
      <aside className="w-[200px] shrink-0 flex flex-col border-r border-[#222] bg-[#0a0a0a]">
        <div className="border-b border-[#222] px-3 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Agents</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {agents.map((agent) => {
            const dot = statusDot[(agent.status ?? "offline").toLowerCase()] ?? statusDot.offline;
            const isSelected = selectedId === agent._id;
            return (
              <button
                key={agent._id}
                type="button"
                onClick={() => setSelectedId(isSelected ? null : agent._id)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-[#1a1a1a] px-3 py-2.5 text-left transition-colors",
                  isSelected ? "bg-[#222] text-zinc-50" : "hover:bg-[#1a1a1a] text-zinc-400"
                )}
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full border border-[#0a0a0a]", dot)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="text-[11px] text-zinc-500">{roleLabels[agent.role] ?? agent.role}</p>
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
          <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
            Select an agent
          </div>
        )}
      </main>
    </div>
  );
}
