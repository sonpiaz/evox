"use client";

/**
 * AGT-336: Loop Agent Accountability Grid
 *
 * Shows per-agent Loop stats: messages, avg reply time, SLA breaches, compliance %.
 * Color-coded rows: green (on track), yellow (warning), red (breached).
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { AGENT_ORDER } from "@/lib/constants";

const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

const COMPLIANCE_COLORS: Record<string, string> = {
  good: "text-emerald-400",
  warning: "text-yellow-400",
  breach: "text-red-400",
};

const ROW_BG: Record<string, string> = {
  good: "bg-emerald-500/5",
  warning: "bg-yellow-500/5",
  breach: "bg-red-500/5",
};

function complianceLevel(rate: number): string {
  if (rate >= 0.9) return "good";
  if (rate >= 0.7) return "warning";
  return "breach";
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "\u2014";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

interface LoopAgentGridProps {
  className?: string;
}

export function LoopAgentGrid({ className }: LoopAgentGridProps) {
  const metrics = useQuery(api.loopMetrics.getLoopDashboard, {
    period: "daily",
    limit: 50,
  });
  const alerts = useQuery(api.loopMetrics.getActiveAlerts, {});

  if (!metrics) {
    return (
      <div className={cn("bg-surface-1/40 border border-border-default/60 rounded-xl p-6", className)}>
        <div className="text-xs text-tertiary text-center">Loading agent grid...</div>
      </div>
    );
  }

  // Latest daily entry per agent
  const agentMap = new Map<string, (typeof metrics)[0]>();
  for (const m of metrics) {
    if (!agentMap.has(m.agentName)) {
      agentMap.set(m.agentName, m);
    }
  }

  // Active alerts per agent
  const alertsByAgent = new Map<string, number>();
  if (alerts) {
    for (const a of alerts) {
      alertsByAgent.set(a.agentName, (alertsByAgent.get(a.agentName) ?? 0) + 1);
    }
  }

  // Build rows in AGENT_ORDER (skip evox — system agent)
  const agents = AGENT_ORDER.filter((name) => name !== "evox");
  const rows = agents.map((name) => {
    const m = agentMap.get(name);
    return {
      name,
      totalMessages: m?.totalMessages ?? 0,
      avgReplyTime: m?.avgReplyTimeMs,
      slaBreaches: (m?.slaBreaches ?? 0) + (alertsByAgent.get(name) ?? 0),
      completionRate: m?.completionRate ?? 0,
    };
  });

  const hasData = rows.some((r) => r.totalMessages > 0);

  return (
    <div className={cn("bg-surface-1/40 border border-border-default/60 rounded-xl overflow-hidden", className)}>
      <div className="px-4 py-2.5 border-b border-border-default/40">
        <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">
          Agent Loop Accountability
        </span>
      </div>
      {hasData ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-tertiary border-b border-border-default/30">
                <th className="text-left px-4 py-2 font-medium">Agent</th>
                <th className="text-right px-3 py-2 font-medium">Messages</th>
                <th className="text-right px-3 py-2 font-medium">Avg Reply</th>
                <th className="text-right px-3 py-2 font-medium">Breaches</th>
                <th className="text-right px-4 py-2 font-medium">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/20">
              {rows.map((row) => {
                const level = complianceLevel(row.completionRate);
                return (
                  <tr key={row.name} className={cn(ROW_BG[level])}>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-bold uppercase", AGENT_COLORS[row.name] ?? "text-secondary")}>
                        {row.name}
                      </span>
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-secondary">
                      {row.totalMessages}
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-secondary">
                      {formatDuration(row.avgReplyTime)}
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums">
                      <span className={cn(row.slaBreaches > 0 ? "text-red-400" : "text-tertiary")}>
                        {row.slaBreaches}
                      </span>
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">
                      <span className={cn("font-medium", COMPLIANCE_COLORS[level])}>
                        {Math.round(row.completionRate * 100)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-xs text-tertiary">
          No loop data yet
        </div>
      )}
    </div>
  );
}
