"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/** AGT-177: Status dots — green=active, gray=idle */
const statusDot: Record<string, string> = {
  online: "bg-emerald-400",
  busy: "bg-emerald-400",
  idle: "bg-white/40",
  offline: "bg-white/20",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
};

/** AGT-177: Agent order always MAX → SAM → LEO */
const AGENT_ORDER = ["max", "sam", "leo"];
function sortAgents<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const i = AGENT_ORDER.indexOf(a.name.toLowerCase());
    const j = AGENT_ORDER.indexOf(b.name.toLowerCase());
    if (i === -1 && j === -1) return a.name.localeCompare(b.name);
    if (i === -1) return 1;
    if (j === -1) return -1;
    return i - j;
  });
}

interface AgentSidebarProps {
  selectedAgentId: Id<"agents"> | null;
  onAgentClick: (agentId: Id<"agents">) => void;
  className?: string;
}

type SidebarAgent = {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  currentTaskIdentifier: string | null;
};

/** AGT-181: Left sidebar 180px — agent list, status dot + current task or Idle, selected border-l-2 border-amber-400 */
export function AgentSidebar({ selectedAgentId, onAgentClick, className = "" }: AgentSidebarProps) {
  const listAgents = useQuery(api.agents.list);

  const agents: SidebarAgent[] = sortAgents(
    (Array.isArray(listAgents) ? listAgents : []).map((a) => ({
      _id: a._id,
      name: a.name,
      role: a.role,
      status: a.status,
      avatar: a.avatar,
      currentTaskIdentifier: null,
    }))
  );

  if (!agents.length) return null;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02]",
        "w-14 min-[1200px]:w-[180px]",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-center border-b border-white/[0.06] px-3 py-2 min-[1200px]:justify-between">
        <span className="hidden min-[1200px]:inline text-[10px] tracking-[0.2em] uppercase text-white/30">
          AGENTS
        </span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60 hidden min-[1200px]:inline">
          {agents.length}
        </span>
        <span className="text-[11px] font-medium text-white/40 min-[1200px]:hidden">{agents.length}</span>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {agents.map((a) => {
          const dot = statusDot[(a.status ?? "").toLowerCase()] ?? statusDot.offline;
          const statusText = a.currentTaskIdentifier ?? "Idle";
          const isSelected = selectedAgentId === a._id;
          return (
            <button
              key={a._id}
              type="button"
              onClick={() => onAgentClick(a._id)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-2 border-b border-white/[0.06] px-3 py-3 text-left transition-colors duration-150 min-[1200px]:flex-col min-[1200px]:items-stretch min-[1200px]:gap-0",
                "hover:bg-white/[0.03]",
                isSelected && "border-l-2 border-amber-400 bg-white/[0.05] pl-2 min-[1200px]:pl-3"
              )}
            >
              <span className="text-lg leading-none shrink-0" aria-hidden>
                {a.avatar}
              </span>
              <div className="min-w-0 flex-1 min-[1200px]:mt-1">
                <div className="flex items-center gap-2 hidden min-[1200px]:flex">
                  <span className="truncate text-sm font-semibold text-white/90">{a.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-white/40">{roleLabels[a.role] ?? a.role}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 hidden min-[1200px]:flex">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
                  <span className="text-xs text-white/40 truncate">
                    {a.currentTaskIdentifier ? (
                      <span className="font-mono">{a.currentTaskIdentifier}</span>
                    ) : (
                      statusText
                    )}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
