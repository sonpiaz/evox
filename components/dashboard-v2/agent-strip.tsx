"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/** AGT-170: Status dots — 8px, green / yellow / gray */
const statusDot: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
};

interface AgentStripProps {
  onAgentClick: (agentId: Id<"agents">) => void;
}

/** AGT-170: 40px horizontal bar below header stats, above Kanban. bg-surface (#111), border-bottom 1px #222, gap 12px. */
export function AgentStrip({ onAgentClick }: AgentStripProps) {
  const stripAgents = useQuery(api.agents.listForStrip);

  if (!stripAgents?.length) return null;

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[#222] bg-[#111] px-4">
      {stripAgents.map((a) => {
        const dot = statusDot[(a.status ?? "").toLowerCase()] ?? statusDot.offline;
        const label = a.currentTaskIdentifier ?? "Idle";
        return (
          <button
            key={a._id}
            type="button"
            onClick={() => onAgentClick(a._id)}
            className="inline-flex items-center gap-2 rounded border border-[#222] bg-[#0a0a0a] px-2.5 py-1.5 text-left transition-colors hover:border-[#333] hover:bg-[#1a1a1a]"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
            <span className="text-xs font-semibold text-zinc-50">{a.name}</span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="font-mono text-xs text-[#888]">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
