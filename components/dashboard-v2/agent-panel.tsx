"use client";

import Link from "next/link";
import { Github, Twitter } from "lucide-react";
import { AgentListItem } from "./agent-list-item";
import { AgentSummary } from "./agent-summary";
import { Id } from "@/convex/_generated/dataModel";

interface Agent {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  lastSeen?: number;
}

interface AgentPanelProps {
  agents: Agent[];
  selectedAgentId: Id<"agents"> | null;
  onSelectAgent: (id: Id<"agents"> | null) => void;
  className?: string;
}

const GITHUB_URL = "https://github.com/sonpiaz";
const X_URL = "https://x.com/sonxpiaz";

export function AgentPanel({ agents, selectedAgentId, onSelectAgent, className = "" }: AgentPanelProps) {
  const activeCount = agents.filter((a) => (a.status ?? "offline").toLowerCase() === "online" || (a.status ?? "").toLowerCase() === "busy").length;

  return (
    <aside className={className}>
      <div className="flex h-full flex-col border-r border-gray-800 bg-[#0a0a0a]">
        <div className="border-b border-gray-800 px-3 py-3">
          <h2 className="text-sm font-semibold text-zinc-50">Agents</h2>
          <AgentSummary total={agents.length} active={activeCount} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {agents.map((agent) => (
            <AgentListItem
              key={agent._id}
              id={agent._id}
              name={agent.name}
              role={agent.role}
              status={(agent.status?.toLowerCase?.() ?? "offline") as "online" | "idle" | "offline" | "busy"}
              avatar={agent.avatar ?? "?"}
              isSelected={selectedAgentId === agent._id}
              onClick={() => onSelectAgent(selectedAgentId === agent._id ? null : agent._id)}
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-gray-800 p-4">
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
          <Link
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="X"
          >
            <Twitter className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
