"use client";

/**
 * AGT-324: CEO Dashboard v0.3 — LEAN
 *
 * CEO understands status in 3 seconds. No noise.
 *
 * Sections:
 * 1. Header — EVOX + Live
 * 2. Metric Cards — Velocity, Cost, Team, Today
 * 3. Alerts — Offline agents, blocked tasks (conditional)
 * 4. Team Strip — Dot + name, single line
 * 5. Live Activity + Recent Commits (2-col on desktop)
 * 6. Agent Comms — last 3-5 messages
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

/** Agent colors */
const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-zinc-500",
  offline: "bg-red-500",
};

function agentColor(name: string) {
  return AGENT_COLORS[name.toLowerCase()] || "text-zinc-400";
}

function timeAgo(ts: number) {
  return formatDistanceToNow(ts, { addSuffix: false });
}

export function CEODashboardV3() {
  // Data queries
  const agentStatus = useQuery(api.ceoMetrics.getAgentStatus);
  const todayMetrics = useQuery(api.ceoMetrics.getTodayMetrics);
  const blockers = useQuery(api.ceoMetrics.getBlockers);
  const liveFeed = useQuery(api.ceoMetrics.getLiveFeed, { limit: 5 });
  const commits = useQuery(api.gitActivity.getRecent, { limit: 5 });
  const velocityTrend = useQuery(api.dashboard.getVelocityTrend, { days: 7 });
  const costData = useQuery(api.costs.getCostsByAgent, {});
  const comms = useQuery(api.dashboard.getMessagesWithKeywords, { limit: 5 });

  // Computed values
  const velocity = useMemo(() => {
    if (!velocityTrend || velocityTrend.length === 0) return 0;
    const total = velocityTrend.reduce((sum, d) => sum + d.tasksCompleted, 0);
    return Math.round(total / velocityTrend.length);
  }, [velocityTrend]);

  const sparkline = useMemo(() => {
    if (!velocityTrend) return [];
    return velocityTrend.map((d) => d.tasksCompleted);
  }, [velocityTrend]);

  const totalCost = costData?.totalCost ?? 0;
  const onlineCount = agentStatus?.online ?? 0;
  const totalAgents = agentStatus?.total ?? 0;
  const completed = todayMetrics?.completed ?? 0;
  const inProgress = todayMetrics?.inProgress ?? 0;
  const blocked = todayMetrics?.blocked ?? 0;

  // Alerts: offline agents + blockers
  const offlineAgents = agentStatus?.agents.filter((a) => !a.isOnline) ?? [];
  const hasAlerts = offlineAgents.length > 0 || (blockers && blockers.length > 0);

  const isLoading = !agentStatus || !todayMetrics;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-800/60">
        <h1 className="text-lg font-bold tracking-tight">
          EVOX
        </h1>
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            onlineCount > 0
              ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]"
              : "bg-red-500"
          )} />
          <span className="text-xs text-zinc-500">Live</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* ─── Metric Cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Velocity */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Velocity
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {isLoading ? "—" : velocity}
            </div>
            <div className="text-[10px] text-zinc-600">tasks/day</div>
            {sparkline.length > 0 && (
              <div className="flex items-end gap-[2px] h-6 mt-2">
                {sparkline.map((v, i) => {
                  const max = Math.max(...sparkline, 1);
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-blue-500/60 min-h-[2px]"
                      style={{ height: `${(v / max) * 100}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Cost */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Cost
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-400">
              {isLoading ? "—" : `$${totalCost.toFixed(2)}`}
            </div>
            <div className="text-[10px] text-zinc-600">today</div>
          </div>

          {/* Team */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Team
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums text-white">
                {isLoading ? "—" : `${onlineCount}/${totalAgents}`}
              </span>
              {onlineCount > 0 && (
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            <div className="text-[10px] text-zinc-600">online</div>
          </div>

          {/* Today */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Today
            </div>
            {isLoading ? (
              <div className="text-2xl font-bold text-zinc-700">—</div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-emerald-400">{completed} done</span>
                <span className="text-blue-400">{inProgress} wip</span>
                <span className="text-zinc-500">{blocked} blocked</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Alerts Banner ─── */}
        {hasAlerts && (
          <div className="space-y-2">
            {offlineAgents.length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-red-400 shrink-0">!</span>
                <span className="text-red-300">
                  {offlineAgents.length} agent{offlineAgents.length > 1 ? "s" : ""} offline:{" "}
                  {offlineAgents.map((a) => a.name).join(", ")}
                </span>
              </div>
            )}
            {blockers && blockers.length > 0 && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2.5 text-sm">
                <span className="text-yellow-400 shrink-0">!</span>
                <span className="text-yellow-300">
                  {blockers.length} task{blockers.length > 1 ? "s" : ""} blocked
                </span>
              </div>
            )}
          </div>
        )}

        {/* ─── Team Strip ─── */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mr-2 shrink-0">
            Team
          </span>
          {agentStatus?.agents.map((agent) => {
            const status = agent.isOnline ? (agent.status === "busy" ? "busy" : "online") : "offline";
            return (
              <div
                key={agent.name}
                className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0"
              >
                <div className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[status] || STATUS_DOT.offline)} />
                <span className={cn("text-xs font-medium", agent.isOnline ? "text-zinc-300" : "text-zinc-600")}>
                  {agent.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* ─── Activity + Commits (2-col desktop) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Activity */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Live Activity
              </span>
            </div>
            <div className="divide-y divide-zinc-800/30">
              {liveFeed && liveFeed.length > 0 ? (
                liveFeed.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 w-8 pt-0.5 text-right">
                      {timeAgo(item.timestamp)}
                    </span>
                    <span className={cn("text-xs font-bold uppercase shrink-0 w-10", agentColor(item.agent))}>
                      {item.agent}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">
                      {item.action}
                      {item.detail && (
                        <span className="text-zinc-600 ml-1">{item.detail}</span>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-zinc-700">
                  No recent activity
                </div>
              )}
            </div>
          </div>

          {/* Recent Commits */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Recent Commits
              </span>
            </div>
            <div className="divide-y divide-zinc-800/30">
              {commits && commits.length > 0 ? (
                commits.slice(0, 5).map((commit) => (
                  <div key={commit._id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span className="text-[10px] text-zinc-700 font-mono shrink-0 w-12">
                      {commit.shortHash || commit.commitHash?.slice(0, 7)}
                    </span>
                    <span className={cn("text-xs font-bold uppercase shrink-0 w-10", agentColor(commit.agentName || ""))}>
                      {commit.agentName || "?"}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">
                      {commit.message.split("\n")[0].slice(0, 60)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-zinc-700">
                  No recent commits
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Agent Comms ─── */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Agent Comms
            </span>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {comms && comms.length > 0 ? (
              comms.slice(0, 5).map((msg, i) => (
                <div key={msg._id || i} className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("text-xs font-bold uppercase", agentColor(msg.from || ""))}>
                      {msg.from || "?"}
                    </span>
                    <span className="text-[10px] text-zinc-700">&rarr;</span>
                    <span className="text-[10px] text-zinc-600">
                      {msg.to || "team"}
                    </span>
                    <span className="flex-1" />
                    <span className="text-[10px] text-zinc-700 tabular-nums">
                      {msg.timestamp ? timeAgo(msg.timestamp) : ""}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {msg.content?.slice(0, 80) || msg.summary || ""}
                  </div>
                  {msg.keywords && msg.keywords.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {msg.keywords.slice(0, 4).map((kw: string, j: number) => (
                        <span
                          key={j}
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded",
                            /^AGT-\d+$/i.test(kw)
                              ? "bg-purple-500/20 text-purple-400"
                              : /done|shipped|completed|merged/i.test(kw)
                              ? "bg-emerald-500/20 text-emerald-400"
                              : /blocked|failed/i.test(kw)
                              ? "bg-red-500/20 text-red-400"
                              : "bg-zinc-800 text-zinc-500"
                          )}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-xs text-zinc-700">
                No recent comms
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
