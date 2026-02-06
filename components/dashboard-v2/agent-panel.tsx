"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import { AgentListItem } from "./agent-list-item";
import { AgentSummary } from "./agent-summary";
import { Id } from "@/convex/_generated/dataModel";

/** AGT-157: X (formerly Twitter) logo — custom SVG */
function XIcon({ size = 16, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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
      <div className="flex h-full flex-col border-r border-gray-800 bg-base">
        <div className="border-b border-border-default px-3 py-3">
          <h2 className="text-sm font-semibold text-primary">Agents</h2>
          <AgentSummary total={agents.length} active={activeCount} />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
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
            <XIcon size={20} className="shrink-0" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
