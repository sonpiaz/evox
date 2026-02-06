"use client";

/**
 * AGT-324: CEO Dashboard v0.4 — LEAN
 *
 * CEO understands status in 3 seconds. No noise.
 *
 * Sections:
 * 1. Header — EVOX + Live indicator (based on data loaded)
 * 2. Metric Cards — Velocity, Commits, Team, Today
 * 3. Alerts — Blocked tasks only
 * 4. Team Strip — Names only, no status dots
 * 5. Live Activity + Recent Commits (2-col on desktop)
 * 6. Agent Comms — last 3-5 messages
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { subDays, startOfDay, format } from "date-fns";

/** Agent colors */
const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

function agentColor(name: string) {
  return AGENT_COLORS[name.toLowerCase()] || "text-secondary";
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export type TimeRange = "1d" | "7d" | "30d";

interface CEODashboardProps {
  className?: string;
  onAgentClick?: (name: string) => void;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

const TIME_RANGE_DAYS: Record<TimeRange, number> = { "1d": 1, "7d": 7, "30d": 30 };
const TIME_RANGE_LABEL: Record<TimeRange, string> = { "1d": "Today", "7d": "7d", "30d": "30d" };

export function CEODashboard({ className, onAgentClick, timeRange: externalTimeRange, onTimeRangeChange }: CEODashboardProps = {}) {
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>("1d");
  const timeRange = externalTimeRange ?? internalTimeRange;
  const setTimeRange = onTimeRangeChange ?? setInternalTimeRange;
  const days = TIME_RANGE_DAYS[timeRange];

  // Data queries — only real data
  const agentStatus = useQuery(api.ceoMetrics.getAgentStatus);
  const todayMetrics = useQuery(api.ceoMetrics.getTodayMetrics, { days });
  const liveFeed = useQuery(api.ceoMetrics.getLiveFeed, { limit: 5 });
  const commits = useQuery(api.gitActivity.getRecent, { limit: 5 });
  const velocityTrend = useQuery(api.dashboard.getVelocityTrend, { days });
  const comms = useQuery(api.ceoMetrics.getRecentComms, { limit: 5 });

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

  // Health metrics merged from HealthDashboard
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as { _id: string; status: string; updatedAt: number; retryCount?: number; lastError?: string }[] | undefined;

  const healthMetrics = useMemo(() => {
    if (!tasks) return null;
    const now = Date.now();
    const day24h = 24 * 60 * 60 * 1000;
    const periodMs = days * day24h;

    const tasksInPeriod = tasks.filter(t => t.updatedAt > now - periodMs);
    const withErrors = tasks.filter(t => (t.retryCount && t.retryCount > 0) || t.lastError);

    const completedInPeriod = tasksInPeriod.filter(t => t.status?.toLowerCase() === "done");
    const attemptedInPeriod = tasksInPeriod.filter(t => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "in_progress");
    const successRate = attemptedInPeriod.length > 0
      ? Math.round((completedInPeriod.filter(t => !t.lastError && (!t.retryCount || t.retryCount === 0)).length / attemptedInPeriod.length) * 100)
      : 100;

    const errorsInPeriod = withErrors.filter(t => t.updatedAt > now - periodMs).length;

    // Success trend sparkline (per-day for the period)
    const successByDay: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayTasks = tasks.filter(t => t.updatedAt >= dayStart && t.updatedAt < dayEnd);
      const dayCompleted = dayTasks.filter(t => t.status?.toLowerCase() === "done" && !t.lastError);
      const dayAttempted = dayTasks.filter(t => t.status?.toLowerCase() === "done" || t.status?.toLowerCase() === "in_progress");
      successByDay.push(dayAttempted.length > 0 ? (dayCompleted.length / dayAttempted.length) * 100 : 100);
    }

    // Error bars (per-day for the period)
    const errorsByDay: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = startOfDay(subDays(now, i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayErrors = withErrors.filter(t => t.updatedAt >= dayStart && t.updatedAt < dayEnd);
      errorsByDay.push({ label: format(dayStart, "EEE"), value: dayErrors.length });
    }

    return { successRate, errorsInPeriod, successByDay, errorsByDay };
  }, [tasks, days]);

  const commitCount = commits?.length ?? 0;
  const totalAgents = agentStatus?.total ?? 0;
  const completed = todayMetrics?.completed ?? 0;
  const inProgress = todayMetrics?.inProgress ?? 0;
  const blocked = todayMetrics?.blocked ?? 0;

  const dataLoaded = !!agentStatus && !!todayMetrics;
  const isLoading = !dataLoaded;

  return (
    <div className="h-full overflow-y-auto bg-base text-white">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-end px-4 sm:px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-1 border border-border-default rounded-lg p-0.5">
            {(["1d", "7d", "30d"] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)}
                className={cn("px-2 py-1 text-[10px] rounded transition-colors", timeRange === r ? "bg-surface-4 text-primary" : "text-tertiary hover:text-secondary")}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              dataLoaded
                ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                : "bg-red-500"
            )} />
            <span className="text-xs text-secondary">Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* ─── Metric Cards ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Velocity */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Velocity
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {isLoading ? "—" : velocity}
            </div>
            <div className="text-[10px] text-tertiary">tasks/day</div>
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

          {/* Commits */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Commits
            </div>
            <div className="text-2xl font-bold tabular-nums text-emerald-400">
              {isLoading ? "—" : commitCount}
            </div>
            <div className="text-[10px] text-tertiary">recent</div>
          </div>

          {/* Team */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Team
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {isLoading ? "—" : totalAgents}
            </div>
            <div className="text-[10px] text-tertiary">agents</div>
          </div>

          {/* Period Summary */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              {TIME_RANGE_LABEL[timeRange]}
            </div>
            {isLoading ? (
              <div className="text-2xl font-bold text-tertiary">—</div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="text-emerald-400">{completed} done</span>
                <span className="text-blue-400">{inProgress} in progress</span>
                <span className="text-amber-400">{blocked} blocked</span>
              </div>
            )}
          </div>

          {/* Success Rate (merged from Health) */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Success Rate
            </div>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              !healthMetrics ? "text-tertiary" :
              healthMetrics.successRate >= 95 ? "text-emerald-400" :
              healthMetrics.successRate >= 80 ? "text-yellow-400" : "text-red-400"
            )}>
              {healthMetrics ? `${healthMetrics.successRate}%` : "—"}
            </div>
            <div className="text-[10px] text-tertiary">{timeRange}</div>
            {healthMetrics && healthMetrics.successByDay.length > 0 && (
              <svg width={80} height={24} className="mt-2">
                <polyline
                  points={healthMetrics.successByDay.map((val, i) => {
                    const max = Math.max(...healthMetrics.successByDay, 1);
                    const min = Math.min(...healthMetrics.successByDay, 0);
                    const range = max - min || 1;
                    const x = 2 + (i / (healthMetrics.successByDay.length - 1 || 1)) * 76;
                    const y = 22 - ((val - min) / range) * 20;
                    return `${x},${y}`;
                  }).join(" ")}
                  fill="none"
                  stroke={
                    healthMetrics.successRate >= 95 ? "#22c55e" :
                    healthMetrics.successRate >= 80 ? "#eab308" : "#ef4444"
                  }
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Errors (merged from Health) */}
          <div className="bg-surface-1 border border-border-default rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-secondary mb-1">
              Errors
            </div>
            <div className={cn(
              "text-2xl font-bold tabular-nums",
              !healthMetrics ? "text-tertiary" :
              healthMetrics.errorsInPeriod === 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {healthMetrics ? healthMetrics.errorsInPeriod : "—"}
            </div>
            <div className="text-[10px] text-tertiary">{timeRange}</div>
            {healthMetrics && healthMetrics.errorsByDay.length > 0 && (
              <div className="flex items-end gap-[2px] h-6 mt-2">
                {healthMetrics.errorsByDay.map((d, i) => {
                  const max = Math.max(...healthMetrics.errorsByDay.map(e => e.value), 1);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm min-h-[2px]",
                        d.value > 0 ? "bg-red-500/60" : "bg-surface-4"
                      )}
                      style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? "4px" : "2px" }}
                      title={`${d.label}: ${d.value}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Team Strip ─── */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary mr-2 shrink-0">
            Team
          </span>
          {agentStatus?.agents.map((agent) => (
            <button
              key={agent.name}
              onClick={() => onAgentClick?.(agent.name)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 shrink-0 hover:bg-surface-2 rounded-lg transition-colors"
            >
              <span className="text-xs font-medium text-primary">
                {agent.name}
              </span>
            </button>
          ))}
        </div>

        {/* ─── Activity + Commits (2-col desktop) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Live Activity */}
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-default">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Live Activity
              </span>
            </div>
            <div className="divide-y divide-border-default">
              {liveFeed && liveFeed.length > 0 ? (
                liveFeed.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span className="text-[10px] text-tertiary tabular-nums shrink-0 w-8 pt-0.5 text-right">
                      {timeAgo(item.timestamp)}
                    </span>
                    <span className={cn("text-xs font-bold uppercase shrink-0 w-10", agentColor(item.agent))}>
                      {item.agent}
                    </span>
                    <span className="text-xs text-secondary truncate">
                      {item.action}
                      {item.detail && (
                        <span className="text-tertiary ml-1">{item.detail}</span>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-tertiary">
                  No recent activity
                </div>
              )}
            </div>
          </div>

          {/* Recent Commits */}
          <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-default">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Recent Commits
              </span>
            </div>
            <div className="divide-y divide-border-default">
              {commits && commits.length > 0 ? (
                commits.slice(0, 5).map((commit) => (
                  <div key={commit._id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span className="text-[10px] text-tertiary font-mono shrink-0 w-12">
                      {commit.shortHash || commit.commitHash?.slice(0, 7)}
                    </span>
                    <span className={cn("text-xs font-bold uppercase shrink-0 w-10", agentColor(commit.agentName || ""))}>
                      {commit.agentName || "?"}
                    </span>
                    <span className="text-xs text-secondary truncate">
                      {commit.message.split("\n")[0].slice(0, 60)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-xs text-tertiary">
                  No recent commits
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Agent Comms ─── */}
        <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border-default">
            <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
              Agent Comms
            </span>
          </div>
          <div className="divide-y divide-border-default">
            {comms && comms.length > 0 ? (
              comms.slice(0, 5).map((msg, i) => (
                <div key={msg._id || i} className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("text-xs font-bold uppercase", agentColor(msg.from || ""))}>
                      {msg.from || "?"}
                    </span>
                    <span className="text-[10px] text-tertiary">&rarr;</span>
                    <span className="text-[10px] text-tertiary">
                      {msg.to || "team"}
                    </span>
                    <span className="flex-1" />
                    <span className="text-[10px] text-tertiary tabular-nums">
                      {msg.timestamp ? timeAgo(msg.timestamp) : ""}
                    </span>
                  </div>
                  <div className="text-xs text-secondary truncate">
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
                              : "bg-surface-4 text-secondary"
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
              <div className="px-4 py-6 text-center text-xs text-tertiary">
                No recent comms
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
