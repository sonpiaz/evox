"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/** AGT-264: Real-time agent activity feed */

/** Agent order: MAX → SAM → LEO → QUINN */
const AGENT_ORDER = ["max", "sam", "leo", "quinn"];
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

/** Status emoji mapping */
const statusEmoji: Record<string, string> = {
  online: "🟢",
  busy: "🟢",
  working: "🟢",
  idle: "🟡",
  offline: "🔴",
};

interface AgentActivityFeedProps {
  className?: string;
}

export function AgentActivityFeed({ className }: AgentActivityFeedProps) {
  const agents = useQuery(api.agents.listForStrip);

  const sortedAgents = sortAgents(
    (Array.isArray(agents) ? agents : []).map((a) => ({
      name: a.name,
      status: a.status,
      currentTaskIdentifier: a.currentTaskIdentifier ?? null,
      currentTaskTitle: a.currentTaskTitle ?? null,
      statusSince: a.statusSince ?? null,
    }))
  );

  if (!sortedAgents.length) {
    return (
      <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900 p-4", className)}>
        <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
          Agent Activity
        </div>
        <div className="text-sm text-zinc-500">No agents available</div>
      </div>
    );
  }

  const getActivityText = (agent: typeof sortedAgents[0]) => {
    const status = (agent.status ?? "offline").toLowerCase();
    const isWorking = status === "busy" || status === "working";

    if (isWorking && agent.currentTaskIdentifier) {
      const duration = agent.statusSince
        ? formatDistanceToNow(agent.statusSince, { addSuffix: true })
        : "";
      const taskLabel = agent.currentTaskTitle
        ? `${agent.currentTaskIdentifier}: ${agent.currentTaskTitle}`
        : agent.currentTaskIdentifier;
      return `working on ${taskLabel}${duration ? ` (${duration})` : ""}`;
    }

    if (status === "idle" || status === "online") {
      return "idle - no tickets";
    }

    return "offline";
  };

  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900 p-4", className)}>
      <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
        Agent Activity
      </div>
      <div className="space-y-2">
        {sortedAgents.map((agent) => {
          const status = (agent.status ?? "offline").toLowerCase();
          const emoji = statusEmoji[status] ?? statusEmoji.offline;
          const activityText = getActivityText(agent);

          return (
            <div
              key={agent.name}
              className="flex items-start gap-2 rounded border border-zinc-900 bg-zinc-950 p-2 text-sm"
            >
              <span className="shrink-0 text-base leading-none">{emoji}</span>
              <div className="min-w-0 flex-1">
                <span className="font-semibold uppercase text-zinc-50">
                  {agent.name}
                </span>
                <span className="ml-1 text-zinc-400">{activityText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
