"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

/** AGT-172: Status dots — Active (emerald), Idle (amber), Error (red), Offline (white/20) */
const statusDot: Record<string, string> = {
  online: "bg-emerald-400",
  busy: "bg-emerald-400",
  idle: "bg-amber-400",
  offline: "bg-white/20",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
};

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

/** AGT-172: Left sidebar 200px — agent list, status dot + current task or Idle, selected border-l-2 border-amber-400 */
export function AgentSidebar({ selectedAgentId, onAgentClick, className = "" }: AgentSidebarProps) {
  const listAgents = useQuery(api.agents.list);

  const agents: SidebarAgent[] = (Array.isArray(listAgents) ? listAgents : []).map((a) => ({
    _id: a._id,
    name: a.name,
    role: a.role,
    status: a.status,
    avatar: a.avatar,
    currentTaskIdentifier: null,
  }));

  if (!agents.length) return null;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.02]",
        "w-14 min-[1200px]:w-[200px]",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-center border-b border-white/[0.06] px-2 py-2.5 min-[1200px]:justify-between min-[1200px]:px-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-white/40 hidden min-[1200px]:inline">
          Agents
        </span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60 hidden min-[1200px]:inline">
          {agents.length}
        </span>
        <span className="text-[11px] font-medium text-white/40 min-[1200px]:hidden">{agents.length}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-1.5 min-[1200px]:p-2">
        {agents.map((a) => {
          const dot = statusDot[(a.status ?? "").toLowerCase()] ?? statusDot.offline;
          const label = a.currentTaskIdentifier ?? "Idle";
          const isSelected = selectedAgentId === a._id;
          return (
            <button
              key={a._id}
              type="button"
              onClick={() => onAgentClick(a._id)}
              className={cn(
                "mb-1 flex w-full items-center rounded-md px-2 py-2 text-left transition-colors min-[1200px]:flex-col min-[1200px]:items-stretch",
                "hover:bg-white/[0.04]",
                isSelected && "border-l-2 border-amber-400 bg-white/[0.04] pl-1.5 min-[1200px]:pl-2"
              )}
            >
              <span className="text-lg leading-none shrink-0 min-[1200px]:text-base" aria-hidden>
                {a.avatar}
              </span>
              <div className="ml-2 min-w-0 flex-1 min-[1200px]:ml-0 min-[1200px]:mt-0">
                <div className="flex items-center justify-between gap-1 hidden min-[1200px]:flex">
                  <span className="truncate text-sm font-semibold text-white/90">{a.name}</span>
                  <span className="shrink-0 text-[11px] text-white/40">{roleLabels[a.role] ?? a.role}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 hidden min-[1200px]:flex">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} aria-hidden />
                  <span className="font-mono text-xs text-white/40 truncate">{label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
