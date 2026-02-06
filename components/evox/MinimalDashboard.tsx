"use client";

/**
 * v0.3-MINIMAL: Minimal Dashboard
 *
 * Two panels. Zero clutter.
 * Left: AgentStatusStrip — who's online, what are they doing
 * Right: ExecutionTerminal with agent tabs — watch agents work live
 *
 * Mobile: stack vertically (agents on top, terminal below)
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { AgentStatusStrip } from "@/components/evox/AgentStatusStrip";
import { ExecutionTerminal } from "@/components/evox/ExecutionTerminal";
import { formatDistanceToNow } from "date-fns";

const AGENT_TABS = [
  { id: "all", label: "ALL" },
  { id: "max", label: "MAX" },
  { id: "sam", label: "SAM" },
  { id: "leo", label: "LEO" },
  { id: "quinn", label: "QUINN" },
] as const;

type AgentTab = (typeof AGENT_TABS)[number]["id"];

const TAB_COLORS: Record<string, string> = {
  all: "text-white",
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

export function MinimalDashboard() {
  const [activeTab, setActiveTab] = useState<AgentTab>("all");
  const agents = useQuery(api.agents.list);

  const onlineCount = useMemo(() => {
    if (!agents) return 0;
    return agents.filter((a) => {
      const s = a.status?.toLowerCase();
      return s === "online" || s === "busy";
    }).length;
  }, [agents]);

  // Last heartbeat info for footer
  const heartbeats = useMemo(() => {
    if (!agents) return [];
    return agents
      .filter((a) => a.lastSeen || a.lastHeartbeat)
      .map((a) => ({
        name: a.name.toUpperCase(),
        time: a.lastHeartbeat || a.lastSeen,
      }))
      .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      .slice(0, 4);
  }, [agents]);

  const handleAgentClick = (agentName: string) => {
    const tab = agentName.toLowerCase() as AgentTab;
    setActiveTab(tab);
  };

  // ExecutionTerminal defaultAgent: "" for ALL (empty string is falsy → query returns all logs)
  const terminalAgent = activeTab === "all" ? "" : activeTab;

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold tracking-tight text-white">
            EVOX{" "}
            <span className="text-zinc-600 font-normal text-sm">
              Mission Control
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              onlineCount > 0
                ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                : "bg-red-500"
            )}
          />
          <span className="text-xs text-zinc-500 tabular-nums">
            {onlineCount}/{agents?.length ?? 0} online
          </span>
        </div>
      </header>

      {/* Content — 2 panels */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
        {/* Left: Agent Status Strip — capped on mobile so terminal stays visible */}
        <div className="max-h-[30vh] md:max-h-none md:w-[220px] md:shrink-0 md:border-r border-b md:border-b-0 border-zinc-800/80 overflow-y-auto">
          <AgentStatusStrip
            onAgentClick={handleAgentClick}
            selectedAgent={activeTab === "all" ? undefined : activeTab}
          />
        </div>

        {/* Right: Terminal with agent tabs — min-h ensures terminal is usable on mobile */}
        <div className="flex-1 min-w-0 min-h-[50vh] md:min-h-0 flex flex-col overflow-hidden">
          {/* Agent tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/80 overflow-x-auto scrollbar-hide">
            {AGENT_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-2.5 rounded-md text-xs font-medium transition-all min-h-[44px] shrink-0 touch-manipulation",
                  activeTab === tab.id
                    ? cn("bg-white/10", TAB_COLORS[tab.id])
                    : "text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Terminal */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ExecutionTerminal
              key={activeTab}
              defaultAgent={terminalAgent}
              hideHeader
              className="h-full rounded-none border-0"
            />
          </div>
        </div>
      </div>

      {/* Footer — last heartbeats */}
      {heartbeats.length > 0 && (
        <footer className="flex items-center gap-4 px-4 sm:px-6 py-2 border-t border-zinc-800/80 text-[11px] text-zinc-600 overflow-x-auto">
          <span className="shrink-0 text-zinc-700">Last heartbeat:</span>
          {heartbeats.map((hb) => (
            <span key={hb.name} className="shrink-0">
              <span className="text-zinc-500">{hb.name}</span>{" "}
              <span className="text-zinc-700">
                {hb.time
                  ? formatDistanceToNow(hb.time, { addSuffix: true })
                  : "never"}
              </span>
            </span>
          ))}
        </footer>
      )}
    </div>
  );
}
