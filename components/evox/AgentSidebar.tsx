"use client";

import { useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useViewerMode } from "@/contexts/ViewerModeContext";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import { ROLE_LABELS as roleLabels, sortAgents, AGENT_ORDER } from "@/lib/constants";
import Link from "next/link";

interface AgentSidebarProps {
  selectedAgentId: Id<"agents"> | null;
  onAgentClick: (agentId: Id<"agents">) => void;
  onAgentDoubleClick?: (agentId: Id<"agents">) => void;
  className?: string;
}

type SidebarAgent = {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  currentTaskIdentifier: string | null;
  currentTaskTitle: string | null;
  statusSince: number | null;
};

export function AgentSidebar({
  selectedAgentId,
  onAgentClick,
  onAgentDoubleClick,
  className = "",
}: AgentSidebarProps) {
  const listAgents = useQuery(api.agents.listForStrip);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isViewerMode } = useViewerMode();

  // Handle click with delay to distinguish single vs double click
  const handleClick = useCallback((agentId: Id<"agents">) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    clickTimeoutRef.current = setTimeout(() => {
      onAgentClick(agentId);
      clickTimeoutRef.current = null;
    }, 200);
  }, [onAgentClick]);

  const handleDoubleClick = useCallback((agentId: Id<"agents">) => {
    // Disable settings in viewer mode
    if (isViewerMode) return;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onAgentDoubleClick?.(agentId);
  }, [onAgentDoubleClick, isViewerMode]);

  const agents: SidebarAgent[] = sortAgents(
    (Array.isArray(listAgents) ? listAgents : [])
      .filter((a) => (AGENT_ORDER as readonly string[]).includes(a.name.toLowerCase()))
      .map((a) => ({
        _id: a._id,
        name: a.name,
        role: a.role,
        status: a.status,
        avatar: a.avatar,
        currentTaskIdentifier: a.currentTaskIdentifier ?? null,
        currentTaskTitle: a.currentTaskTitle ?? null,
        statusSince: a.statusSince ?? null,
      }))
  );

  if (!agents.length) return null;

  const isWorking = (status: string) => {
    const s = status.toLowerCase();
    return s === "working" || s === "busy";
  };

  return (
    <aside
      className={cn(
        "flex w-[220px] shrink-0 flex-col border-r border-border-default bg-surface-1",
        className
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-tertiary">
          Agents
        </span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/agents"
            className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-secondary hover:bg-white/10 hover:text-primary transition-colors"
          >
            Performance
          </Link>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-tertiary">
            {agents.length}
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto" aria-label="Agent list">
        {agents.map((agent) => {
          const status = (agent.status ?? "offline").toLowerCase();
          const isSelected = selectedAgentId === agent._id;
          const working = isWorking(status);

          return (
            <button
              key={agent._id}
              type="button"
              onClick={() => handleClick(agent._id)}
              onDoubleClick={() => handleDoubleClick(agent._id)}
              aria-label={`${agent.name}, ${roleLabels[agent.role] ?? agent.role}, ${working ? "working" : status}`}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex h-16 w-full cursor-pointer items-center gap-3 border-b border-border-default px-3 text-left transition-colors duration-150",
                "hover:bg-surface-4",
                isSelected && "border-l-2 border-white bg-surface-4"
              )}
            >
              {/* Status dot — AGT-285: Use AgentStatusIndicator for consistency */}
              <AgentStatusIndicator
                status={status}
                showPulse={working}
                size="md"
              />

              {/* Avatar */}
              <span className="shrink-0 text-2xl leading-none" aria-hidden>
                {agent.avatar}
              </span>

              {/* Name + Role + Task */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-primary">
                    {agent.name}
                  </span>
                  <span className="shrink-0 text-xs text-tertiary">
                    {roleLabels[agent.role] ?? agent.role}
                  </span>
                </div>
                {working && agent.currentTaskIdentifier && (
                  <>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-xs text-blue-500">
                        {agent.currentTaskIdentifier}
                      </span>
                      {agent.statusSince && (
                        <span className="text-[10px] text-tertiary">
                          {formatDistanceToNow(agent.statusSince, { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    {agent.currentTaskTitle && (
                      <div className="mt-0.5 truncate text-[11px] text-tertiary">
                        {agent.currentTaskTitle}
                      </div>
                    )}
                  </>
                )}
                {!working && (
                  <div className="mt-0.5 text-xs text-tertiary">
                    {status === "idle" || status === "online" ? "Idle" : "Offline"}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
