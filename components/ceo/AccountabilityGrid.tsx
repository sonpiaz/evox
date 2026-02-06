"use client";

/**
 * AccountabilityGrid — AGT-336: Per-agent loop performance
 *
 * Shows each agent's loop metrics: completion rate, SLA breaches, avg times.
 * Uses loopMetrics.getAgentBreakdown query.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface AccountabilityGridProps {
  className?: string;
}

const AGENT_COLORS: Record<string, string> = {
  max: "border-purple-500/30",
  sam: "border-blue-500/30",
  leo: "border-emerald-500/30",
  quinn: "border-amber-500/30",
};

function formatMs(ms: number | null): string {
  if (ms === null) return "--";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function rateColor(rate: number): string {
  if (rate >= 80) return "text-emerald-400";
  if (rate >= 50) return "text-amber-400";
  return "text-red-400";
}

export function AccountabilityGrid({ className }: AccountabilityGridProps) {
  const agents = useQuery(api.loopMetrics.getAgentBreakdown, { sinceDays: 7 });

  if (!agents) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-4 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className={className}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-primary0 mb-2">
          Accountability
        </h2>
        <div className="text-center py-4 text-tertiary text-sm">
          No loop data yet
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-primary0 mb-2">
        Accountability
      </h2>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.agentName}
            className={cn(
              "bg-surface-1 border rounded-lg p-3",
              AGENT_COLORS[agent.agentName] ?? "border-gray-500/30"
            )}
          >
            {/* Row 1: Name + completion rate */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white text-sm uppercase">
                {agent.agentName}
              </span>
              <span className={cn("font-bold text-lg tabular-nums", rateColor(agent.completionRate))}>
                {agent.completionRate}%
              </span>
            </div>

            {/* Row 2: Stats */}
            <div className="flex items-center gap-3 text-xs text-secondary">
              <span>
                <span className="text-primary font-medium">{agent.closed}</span>/{agent.total} closed
              </span>
              {agent.broken > 0 && (
                <span className="text-red-400">
                  {agent.broken} broken
                </span>
              )}
              {agent.slaBreaches > 0 && (
                <span className="text-amber-400">
                  {agent.slaBreaches} SLA
                </span>
              )}
              <span className="ml-auto text-primary0">
                reply {formatMs(agent.avgReplyTimeMs)} / act {formatMs(agent.avgActionTimeMs)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-1 bg-surface-4 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  agent.completionRate >= 80 && "bg-emerald-500",
                  agent.completionRate >= 50 && agent.completionRate < 80 && "bg-amber-500",
                  agent.completionRate < 50 && "bg-red-500"
                )}
                style={{ width: `${agent.completionRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
