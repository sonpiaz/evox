"use client";

/**
 * AGT-269: CEO Dashboard — Single Glanceable View
 * AGT-272: Git Activity Feed — Recent commits from agents
 *
 * Unified dashboard merging CEO + Elon metrics:
 * - North Star metrics at top (Automation, Velocity, Cost, Team Health)
 * - Agent status with utilization bars
 * - Real-time activity feed
 * - Git commits from agents
 * - Critical alerts
 * - All visible without scrolling
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, formatDistanceToNow, subDays } from "date-fns";
import { AgentTerminals } from "./AgentTerminals";
import { SystemHealthWidget } from "./SystemHealthWidget";
import { AgentCommunicationFeed } from "./AgentCommunicationFeed";

interface CEODashboardProps {
  className?: string;
}

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastHeartbeat?: number;
  lastSeen?: number;
};

type TaskDoc = {
  _id: string;
  status: string;
  title: string;
  linearIdentifier?: string;
  priority?: string;
  agentName?: string;
  updatedAt: number;
  completedAt?: number;
  createdAt: number;
};

type PerformanceMetric = {
  agentName: string;
  totalTasksCompleted: number;
  totalTasksFailed: number;
  totalCost: number;
  avgDurationMinutes?: number;
};

type ActivityEvent = {
  _id: string;
  agentName: string;
  description: string;
  timestamp: number;
  category?: string;
};

type GitCommit = {
  _id: string;
  shortHash: string;
  message: string;
  agentName?: string;
  linkedTicketId?: string;
  url?: string;
  pushedAt: number;
  branch: string;
};

/** Sparkline component for trends */
function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const padding = 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Metric Card with optional sparkline */
function MetricCard({
  title,
  value,
  unit = "",
  subtitle,
  sparklineData,
  sparklineColor,
  color = "emerald"
}: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  color?: "emerald" | "blue" | "yellow" | "red";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  };

  return (
    <div className="rounded border border-white/10 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[9px] font-medium uppercase tracking-wider text-white/30">
          {title}
        </div>
        {sparklineData && <Sparkline data={sparklineData} color={sparklineColor || "#3b82f6"} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold tabular-nums", colorMap[color])}>
          {value}
        </span>
        {unit && <span className="text-sm text-white/50">{unit}</span>}
      </div>
      {subtitle && (
        <div className="mt-0.5 text-[9px] text-white/40">{subtitle}</div>
      )}
    </div>
  );
}

/** Agent row with status and utilization */
function AgentRow({ agent, tasksToday, cost, isActive }: {
  agent: AgentDoc;
  tasksToday: number;
  cost: number;
  isActive: boolean;
}) {
  const status = agent.status?.toLowerCase() || "offline";

  // AGT-285: Use consistent status colors per AGT-273
  const statusColors = {
    online: "bg-green-500",
    busy: "bg-yellow-500",
    idle: "bg-zinc-500",
    offline: "bg-red-500",
  };

  const dotColor = statusColors[status as keyof typeof statusColors] || statusColors.offline;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded border border-white/5 bg-zinc-900/30 px-3 py-2",
      !isActive && "opacity-50"
    )}>
      <div className="text-xl">{agent.avatar || "🤖"}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", dotColor, isActive && status === "busy" && "animate-pulse")} />
          <span className="text-xs font-semibold uppercase text-white/90">{agent.name}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-white">{tasksToday}</div>
        <div className="text-[9px] text-white/40">${cost.toFixed(2)}</div>
      </div>
    </div>
  );
}

/** Compact Alert Row */
function AlertRow({ icon, text, severity }: {
  icon: string;
  text: string;
  severity: "critical" | "warning" | "info";
}) {
  const colors = {
    critical: "text-red-400 border-red-500/30 bg-red-500/10",
    warning: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    info: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  };

  return (
    <div className={cn("flex items-center gap-2 rounded border px-2 py-1.5 text-xs", colors[severity])}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

/** Activity Item */
function ActivityItem({ event }: { event: ActivityEvent }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="text-white/30 shrink-0 w-12">
        {formatDistanceToNow(event.timestamp, { addSuffix: false })}
      </span>
      <span className="font-medium text-blue-400 uppercase shrink-0">{event.agentName}</span>
      <span className="text-white/60 truncate">{event.description.slice(0, 60)}</span>
    </div>
  );
}

/** Git Commit Item — AGT-272 */
function GitCommitItem({ commit }: { commit: GitCommit }) {
  const messageFirstLine = commit.message.split('\n')[0].slice(0, 50);
  const hasMore = commit.message.length > 50 || commit.message.includes('\n');

  return (
    <a
      href={commit.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 text-[11px] hover:bg-white/5 rounded px-1 py-0.5 -mx-1 transition-colors"
    >
      <span className="text-white/30 shrink-0 w-10">
        {formatDistanceToNow(commit.pushedAt, { addSuffix: false })}
      </span>
      <code className="text-emerald-400 font-mono shrink-0">{commit.shortHash}</code>
      <span className="font-medium text-purple-400 uppercase shrink-0 text-[10px]">
        {commit.agentName || "—"}
      </span>
      <span className="text-white/60 truncate flex-1">
        {messageFirstLine}{hasMore ? "…" : ""}
      </span>
      {commit.linkedTicketId && (
        <span className="text-blue-400 shrink-0">{commit.linkedTicketId}</span>
      )}
    </a>
  );
}

/** Main CEO Dashboard */
export function CEODashboard({ className }: CEODashboardProps) {
  const now = new Date().getTime();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();
  const day24h = 24 * 60 * 60 * 1000;

  // Queries
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as TaskDoc[] | undefined;
  const dashboardStats = useQuery(api.dashboard.getStats, { startTs: todayStart, endTs: todayEnd });
  const automationProgress = useQuery(api.automationMetrics.getProgress);
  const recentActivity = useQuery(api.activityEvents.list, { limit: 8 }) as ActivityEvent[] | undefined;
  const recentCommits = useQuery(api.gitActivity.getRecent, { limit: 6 }) as GitCommit[] | undefined;

  // Get performance metrics for cost
  const today = new Date().toISOString().split('T')[0];
  const performance = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today }) as PerformanceMetric[] | undefined;

  // Calculate velocity trend (last 7 days)
  const velocityTrend = useMemo(() => {
    if (!tasks) return [];
    const trend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayCompleted = tasks.filter(t =>
        t.status?.toLowerCase() === "done" &&
        t.completedAt &&
        t.completedAt >= dayStart &&
        t.completedAt < dayEnd
      ).length;
      trend.push(dayCompleted);
    }
    return trend;
  }, [tasks]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!agents || !tasks || !dashboardStats) {
      return {
        automationPercent: 0,
        velocity: 0,
        costPerDay: 0,
        teamHealth: 0,
        activeAgents: 0,
        totalAgents: 0,
        roi: 0,
      };
    }

    const activeAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);
    }).length;

    const totalAgents = agents.length;
    const teamHealth = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;
    const automationPercent = automationProgress?.progressPercent || 0;
    const velocity = dashboardStats.taskCounts?.done || 0;
    const costPerDay = performance?.reduce((sum, p) => sum + (p.totalCost || 0), 0) || 0;

    // ROI estimate: assume $50 value per task
    const VALUE_PER_TASK = 50;
    const valueGenerated = velocity * VALUE_PER_TASK;
    const roi = costPerDay > 0 ? Math.round((valueGenerated / costPerDay) * 10) / 10 : velocity > 0 ? 99 : 0;

    return {
      automationPercent,
      velocity,
      costPerDay,
      teamHealth,
      activeAgents,
      totalAgents,
      roi,
    };
  }, [agents, tasks, performance, dashboardStats, now, automationProgress]);

  // Agent metrics
  const agentMetrics = useMemo(() => {
    if (!agents || !performance) return [];

    return agents.map(agent => {
      const agentPerf = performance.find(p =>
        p.agentName.toLowerCase() === agent.name.toLowerCase()
      );
      const lastSeen = agent.lastSeen || agent.lastHeartbeat || 0;
      const status = agent.status?.toLowerCase() || "offline";
      const isActive = (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);

      return {
        agent,
        tasksToday: agentPerf?.totalTasksCompleted || 0,
        cost: agentPerf?.totalCost || 0,
        isActive,
      };
    }).sort((a, b) => b.tasksToday - a.tasksToday);
  }, [agents, performance, now]);

  // Alerts
  const alerts = useMemo(() => {
    const items: Array<{ icon: string; text: string; severity: "critical" | "warning" | "info" }> = [];

    if (!agents || !tasks) return items;

    // Offline agents
    const offlineAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return status === "offline" || (now - lastSeen > 15 * 60 * 1000);
    });

    if (offlineAgents.length > 0) {
      items.push({
        icon: "⚠️",
        text: `${offlineAgents.length} agent${offlineAgents.length > 1 ? "s" : ""} offline`,
        severity: offlineAgents.length > 2 ? "critical" : "warning",
      });
    }

    // Blocked urgent tasks
    const blockedUrgent = tasks.filter(t =>
      t.priority?.toLowerCase() === "urgent" &&
      (t.status?.toLowerCase() === "backlog" || t.status?.toLowerCase() === "todo")
    );

    if (blockedUrgent.length > 0) {
      items.push({
        icon: "🚨",
        text: `${blockedUrgent.length} urgent task${blockedUrgent.length > 1 ? "s" : ""} blocked`,
        severity: "critical",
      });
    }

    // Stale in-progress tasks
    const staleInProgress = tasks.filter(t =>
      (t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review") &&
      (now - t.updatedAt > 24 * 60 * 60 * 1000)
    );

    if (staleInProgress.length > 0) {
      items.push({
        icon: "⏰",
        text: `${staleInProgress.length} stale task${staleInProgress.length > 1 ? "s" : ""} (24h+)`,
        severity: "warning",
      });
    }

    // All clear
    if (items.length === 0) {
      items.push({
        icon: "✅",
        text: "All systems operational",
        severity: "info",
      });
    }

    return items;
  }, [agents, tasks, now]);

  // Today's progress
  const todayProgress = useMemo(() => {
    if (!dashboardStats) return { completed: 0, inProgress: 0, blocked: 0 };
    return {
      completed: dashboardStats.taskCounts?.done || 0,
      inProgress: (dashboardStats.taskCounts?.inProgress || 0) + (dashboardStats.taskCounts?.review || 0),
      blocked: dashboardStats.taskCounts?.backlog || 0,
    };
  }, [dashboardStats]);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden p-2 sm:p-4", className)}>
      {/* Row 1: North Star Metrics - Mobile responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
        <MetricCard
          title="Automation"
          value={metrics.automationPercent}
          unit="%"
          subtitle="Tasks by agents"
          color={metrics.automationPercent > 80 ? "emerald" : metrics.automationPercent > 50 ? "blue" : "yellow"}
        />
        <MetricCard
          title="Velocity"
          value={metrics.velocity}
          subtitle="Tasks today"
          color="blue"
          sparklineData={velocityTrend}
          sparklineColor="#3b82f6"
        />
        <MetricCard
          title="Cost"
          value={`$${metrics.costPerDay.toFixed(2)}`}
          subtitle="Spend today"
          color={metrics.costPerDay < 5 ? "emerald" : metrics.costPerDay < 20 ? "yellow" : "red"}
        />
        <MetricCard
          title="Team"
          value={metrics.teamHealth}
          unit="%"
          subtitle={`${metrics.activeAgents}/${metrics.totalAgents} online`}
          color={metrics.teamHealth > 75 ? "emerald" : metrics.teamHealth > 50 ? "yellow" : "red"}
        />
        <MetricCard
          title="ROI"
          value={`${metrics.roi}x`}
          subtitle="Value/cost"
          color={metrics.roi >= 10 ? "emerald" : metrics.roi >= 5 ? "blue" : "yellow"}
        />
        <div className="rounded border border-white/10 bg-zinc-900/50 p-3 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-400">{todayProgress.completed}</div>
              <div className="text-[8px] uppercase text-white/30">Done</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{todayProgress.inProgress}</div>
              <div className="text-[8px] uppercase text-white/30">WIP</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">{todayProgress.blocked}</div>
              <div className="text-[8px] uppercase text-white/30">Queue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Team + Alerts + Activity - Mobile responsive */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Team Status */}
        <div className="flex flex-col min-h-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Team Status
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {agentMetrics.map(({ agent, tasksToday, cost, isActive }) => (
              <AgentRow
                key={agent._id}
                agent={agent}
                tasksToday={tasksToday}
                cost={cost}
                isActive={isActive}
              />
            ))}
          </div>
        </div>

        {/* Alerts + System Health */}
        <div className="flex flex-col min-h-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Alerts
          </div>
          <div className="space-y-2 mb-3">
            {alerts.map((alert, i) => (
              <AlertRow key={i} {...alert} />
            ))}
          </div>

          {/* System Health Widget — AGT-281 */}
          <SystemHealthWidget className="mb-3" />

          {/* Quick Stats */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
              24h Summary
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Total Tasks</span>
                <span className="text-white font-medium">{metrics.velocity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Total Spend</span>
                <span className="text-white font-medium">${metrics.costPerDay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Avg $/task</span>
                <span className="text-white font-medium">
                  ${metrics.velocity > 0 ? (metrics.costPerDay / metrics.velocity).toFixed(2) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Value Est.</span>
                <span className="text-emerald-400 font-medium">${metrics.velocity * 50}</span>
              </div>
            </div>
          </div>

          {/* Git Activity — AGT-272 */}
          <div className="mt-3 pt-2 border-t border-white/10 flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
              <span>🔀</span> Recent Commits
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {recentCommits && recentCommits.length > 0 ? (
                recentCommits.map((commit) => (
                  <GitCommitItem key={commit._id} commit={commit} />
                ))
              ) : (
                <div className="text-[10px] text-white/30 text-center py-2">No recent commits</div>
              )}
            </div>
          </div>
        </div>

        {/* Activity + Agent Comms */}
        <div className="flex flex-col min-h-0">
          {/* Agent Communications with Keywords */}
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1">
              <span>💬</span> Agent Comms
            </div>
            <div className="rounded border border-white/5 bg-zinc-900/30 p-2 max-h-40 overflow-y-auto">
              <AgentCommunicationFeed limit={5} compact />
            </div>
          </div>

          {/* Live Activity */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
            Live Activity
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 rounded border border-white/5 bg-zinc-900/30 p-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((event) => (
                <ActivityItem key={event._id} event={event} />
              ))
            ) : (
              <div className="text-xs text-white/30 text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Agent Terminals */}
      <div className="mt-4">
        <AgentTerminals />
      </div>
    </div>
  );
}
