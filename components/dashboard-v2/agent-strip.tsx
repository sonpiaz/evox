"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AgentStatusIndicator } from "@/components/evox/AgentStatusIndicator";

interface AgentStripProps {
  onAgentClick: (agentId: Id<"agents">) => void;
}

type StripAgent = {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  currentTaskIdentifier?: string | null;
};

/** AGT-170: 56px bar below header, above Kanban. Uses agents.list only so app works before Convex listForStrip is deployed. */
export function AgentStrip({ onAgentClick }: AgentStripProps) {
  const listAgents = useQuery(api.agents.list);

  const agents: StripAgent[] = (Array.isArray(listAgents) ? listAgents : []).map((a) => ({
    _id: a._id,
    name: a.name,
    role: a.role,
    status: a.status,
    avatar: a.avatar,
    currentTaskIdentifier: null,
  }));

  if (!agents.length) return null;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border-default bg-surface-1 px-4">
      {agents.map((a) => {
        const label = a.currentTaskIdentifier ?? "Idle";
        const isWorking = !!a.currentTaskIdentifier;
        return (
          <button
            key={a._id}
            type="button"
            onClick={() => onAgentClick(a._id)}
            className="inline-flex items-center gap-2 rounded border border-border-default bg-base px-2.5 py-1.5 text-left transition-colors hover:border-gray-500 hover:bg-surface-1"
          >
            <AgentStatusIndicator status={a.status} showPulse={isWorking} size="sm" />
            <span className="text-xs font-semibold text-primary">{a.name}</span>
            <span className="text-xs text-primary0">·</span>
            <span className="font-mono text-xs text-secondary">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
