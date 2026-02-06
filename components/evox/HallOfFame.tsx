"use client";

/**
 * Hall of Fame — Agent Leaderboard (extracted from app/agents/page.tsx)
 *
 * Renders as a tab within the main dashboard.
 * Sections: Podium (top 3), Category Winners, Leaderboard table.
 * Click agent name → /agents/[name] career profile.
 */

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

const PODIUM_STYLES: Record<number, { border: string; bg: string; label: string; size: string }> = {
  1: { border: "border-yellow-500/40", bg: "bg-yellow-500/10", label: "1st", size: "text-3xl" },
  2: { border: "border-zinc-400/40", bg: "bg-zinc-400/10", label: "2nd", size: "text-2xl" },
  3: { border: "border-amber-700/40", bg: "bg-amber-700/10", label: "3rd", size: "text-2xl" },
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-zinc-500",
  offline: "bg-zinc-700",
};

const BADGE_COLORS: Record<string, string> = {
  "Top Performer": "bg-yellow-500/20 text-yellow-400",
  "Most Productive": "bg-emerald-500/20 text-emerald-400",
  "Loop Master": "bg-blue-500/20 text-blue-400",
  "Cost Efficient": "bg-purple-500/20 text-purple-400",
  "Quick Responder": "bg-cyan-500/20 text-cyan-400",
  "Mentor": "bg-pink-500/20 text-pink-400",
};

interface HallOfFameProps {
  className?: string;
}

export function HallOfFame({ className }: HallOfFameProps) {
  const data = useQuery(api.agentProfiles.getHallOfFame);

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center py-20", className)}>
        <div className="text-zinc-600 text-sm">Loading Hall of Fame...</div>
      </div>
    );
  }

  const { leaderboard, topPerformer, mostTasks, bestLoopRate } = data;
  const podium = leaderboard.slice(0, 3);
  const categoryWinners = [
    { label: "Most Tasks", agent: mostTasks },
    { label: "Best Loop", agent: bestLoopRate },
    { label: "Top Overall", agent: topPerformer },
  ].filter((c) => c.agent);

  return (
    <div className={cn("overflow-y-auto", className)}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Podium — Top 3 */}
        {podium.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {podium.map((agent) => {
              const style = PODIUM_STYLES[agent.rank] ?? PODIUM_STYLES[3];
              return (
                <Link
                  key={agent.name}
                  href={`/agents/${agent.name.toLowerCase()}`}
                  className={cn(
                    "border rounded-xl p-4 text-center transition-colors hover:bg-surface-2",
                    style.border, style.bg,
                    agent.rank === 1 && "sm:order-first"
                  )}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    {style.label}
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[agent.status?.toLowerCase()] ?? STATUS_DOT.offline)} />
                    <span className={cn("font-bold uppercase", style.size, AGENT_COLORS[agent.name.toLowerCase()] ?? "text-zinc-300")}>
                      {agent.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase mb-3">{agent.role}</div>
                  <div className="text-lg font-bold tabular-nums text-zinc-200">
                    {Math.round(agent.compositeScore * 100)}
                  </div>
                  <div className="text-[10px] text-zinc-600">score</div>
                  {agent.badges.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {agent.badges.map((b) => (
                        <span key={b} className={cn("text-[9px] px-1.5 py-0.5 rounded", BADGE_COLORS[b] ?? "bg-surface-4 text-text-secondary")}>
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Category Winners */}
        {categoryWinners.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 shrink-0">
              Winners
            </span>
            {categoryWinners.map((cat) => (
              <div key={cat.label} className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-zinc-500">{cat.label}:</span>
                <Link
                  href={`/agents/${cat.agent!.toLowerCase()}`}
                  className={cn("text-xs font-bold uppercase hover:underline", AGENT_COLORS[cat.agent!.toLowerCase()] ?? "text-zinc-300")}
                >
                  {cat.agent}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-default">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Leaderboard
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-zinc-600 border-b border-border-default">
                  <th className="text-left px-4 py-2 font-medium w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium">Agent</th>
                  <th className="text-right px-3 py-2 font-medium">Tasks</th>
                  <th className="text-right px-3 py-2 font-medium">Success</th>
                  <th className="text-right px-3 py-2 font-medium">Loop</th>
                  <th className="text-right px-3 py-2 font-medium">Rating</th>
                  <th className="text-left px-4 py-2 font-medium">Badges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {leaderboard.map((agent) => (
                  <tr key={agent.name} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-2.5 tabular-nums text-zinc-500">{agent.rank}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/agents/${agent.name.toLowerCase()}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[agent.status?.toLowerCase()] ?? STATUS_DOT.offline)} />
                        <span className={cn("font-bold uppercase", AGENT_COLORS[agent.name.toLowerCase()] ?? "text-zinc-300")}>
                          {agent.name}
                        </span>
                      </Link>
                    </td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-zinc-400">{agent.tasksCompleted}</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-zinc-400">{Math.round(agent.successRate * 100)}%</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-zinc-400">{Math.round(agent.loopCompletionRate * 100)}%</td>
                    <td className="text-right px-3 py-2.5 tabular-nums text-zinc-400">{agent.avgRating.toFixed(1)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {agent.badges.map((b) => (
                          <span key={b} className={cn("text-[9px] px-1.5 py-0.5 rounded", BADGE_COLORS[b] ?? "bg-surface-4 text-text-secondary")}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
