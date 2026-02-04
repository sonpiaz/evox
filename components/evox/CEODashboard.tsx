"use client";

/**
 * AGT-254: CEO Dashboard — North Star Metrics View
 *
 * High-level overview for leadership:
 * - North Star metrics (Automation %, Velocity, Cost, Team Health)
 * - Team status grid
 * - Today's progress
 * - Critical alerts
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { startOfDay, endOfDay, formatDistanceToNow } from "date-fns";

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
};

type PerformanceMetric = {
  agentName: string;
  tasksCompleted: number;
  tasksFailed: number;
  totalCost: number;
  avgDurationMinutes?: number;
};

/** North Star Metric Card */
function MetricCard({
  title,
  value,
  unit = "",
  subtitle,
  trend,
  color = "emerald"
}: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: "emerald" | "blue" | "yellow" | "red";
}) {
  const colorMap = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    blue: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    yellow: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    red: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };

  const colors = colorMap[color];
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-zinc-500";

  return (
    <div className="rounded border border-white/10 bg-zinc-900/50 p-4">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/30">
        {title}
      </div>
      <div className="text-3xl font-bold tabular-nums text-white">
        {value}
        {unit && <span className="text-xl text-white/70">{unit}</span>}
      </div>
      {subtitle && (
        <div className="mt-1 text-[10px] text-white/40">{subtitle}</div>
      )}
    </div>
  );
}

/** Agent Status Badge */
function AgentBadge({ agent }: { agent: AgentDoc }) {
  const currentTime = new Date().getTime();
  const status = agent.status?.toLowerCase() || "offline";
  const lastSeen = agent.lastSeen || agent.lastHeartbeat || 0;
  const isOnline = status === "online" || status === "busy";
  const isRecent = currentTime - lastSeen < 5 * 60 * 1000; // 5 min

  const statusColors = {
    online: { bg: "bg-emerald-500/20", border: "border-emerald-500", text: "text-emerald-400" },
    busy: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-400" },
    idle: { bg: "bg-yellow-500/20", border: "border-yellow-500", text: "text-yellow-400" },
    offline: { bg: "bg-zinc-800/50", border: "border-zinc-700", text: "text-zinc-500" },
  };

  const colors = statusColors[status as keyof typeof statusColors] || statusColors.offline;

  return (
    <div className={cn(
      "flex flex-col items-center gap-2 rounded border p-3",
      isOnline && isRecent ? "border-white/20 bg-zinc-900/50" : "border-white/5 bg-zinc-900/30 opacity-50"
    )}>
      <div className="text-2xl">{agent.avatar || "🤖"}</div>
      <div className="text-center">
        <div className="text-[11px] font-semibold uppercase text-white/90">
          {agent.name}
        </div>
        <div className="mt-0.5 text-[9px] text-white/30">
          {isRecent ? "Active" : formatDistanceToNow(lastSeen, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

/** Alert Item */
function AlertItem({
  icon,
  title,
  subtitle,
  severity = "warning"
}: {
  icon: string;
  title: string;
  subtitle: string;
  severity?: "critical" | "warning" | "info";
}) {
  const colors = {
    critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
    warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
  };

  const color = colors[severity];

  return (
    <div className="flex items-start gap-3 rounded border border-white/10 bg-zinc-900/50 p-3">
      <div className="text-lg">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white/90">{title}</div>
        <div className="mt-0.5 text-xs text-white/40">{subtitle}</div>
      </div>
    </div>
  );
}

/** Main CEO Dashboard */
export function CEODashboard({ className }: CEODashboardProps) {
  const now = new Date().getTime();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  // Queries
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list) as TaskDoc[] | undefined;
  const dashboardStats = useQuery(api.dashboard.getStats, { startTs: todayStart, endTs: todayEnd });
  const automationProgress = useQuery(api.automationMetrics.getProgress);

  // Get last 7 days of performance data
  const today = new Date().toISOString().split('T')[0];
  const performance = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today }) as PerformanceMetric[] | undefined;

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!agents || !tasks || !performance || !dashboardStats) {
      return {
        automationPercent: 0,
        velocity: 0,
        costPerDay: 0,
        teamHealth: 0,
        activeAgents: 0,
        totalAgents: 0,
      };
    }

    const activeAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);
    }).length;

    const totalAgents = agents.length;
    const teamHealth = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;

    // Automation % — Real-time from AGT-257 automation metrics API
    const automationPercent = automationProgress?.progressPercent || 0;

    // Velocity = tasks completed today
    const velocity = dashboardStats.taskCounts?.done || 0;

    // Cost = sum of all agent costs today (from performance metrics)
    const costPerDay = performance.reduce((sum, p) => sum + (p.totalCost || 0), 0);

    return {
      automationPercent,
      velocity,
      costPerDay,
      teamHealth,
      activeAgents,
      totalAgents,
    };
  }, [agents, tasks, performance, dashboardStats, now, todayStart, todayEnd]);

  // Today's progress
  const todayProgress = useMemo(() => {
    if (!tasks) return { completed: 0, inProgress: 0, blocked: 0 };

    const today = tasks.filter(t => t.updatedAt >= todayStart);
    return {
      completed: today.filter(t => t.status === "done").length,
      inProgress: today.filter(t => t.status === "in_progress" || t.status === "review").length,
      blocked: today.filter(t =>
        t.priority === "urgent" &&
        (t.status === "backlog" || t.status === "todo")
      ).length,
    };
  }, [tasks, todayStart]);

  // Alerts
  const alerts = useMemo(() => {
    const items: Array<{ icon: string; title: string; subtitle: string; severity: "critical" | "warning" | "info" }> = [];

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
        title: `${offlineAgents.length} Agent${offlineAgents.length > 1 ? "s" : ""} Offline`,
        subtitle: offlineAgents.map(a => a.name).join(", "),
        severity: offlineAgents.length > 2 ? "critical" : "warning",
      });
    }

    // Blocked urgent tasks
    const blockedUrgent = tasks.filter(t =>
      t.priority === "urgent" &&
      (t.status === "backlog" || t.status === "todo")
    );

    if (blockedUrgent.length > 0) {
      items.push({
        icon: "🚨",
        title: `${blockedUrgent.length} Urgent Task${blockedUrgent.length > 1 ? "s" : ""} Blocked`,
        subtitle: blockedUrgent.slice(0, 2).map(t => t.linearIdentifier || t.title).join(", "),
        severity: "critical",
      });
    }

    // Stale in-progress tasks (not updated in 24h)
    const staleInProgress = tasks.filter(t =>
      (t.status === "in_progress" || t.status === "review") &&
      (now - t.updatedAt > 24 * 60 * 60 * 1000)
    );

    if (staleInProgress.length > 0) {
      items.push({
        icon: "⏰",
        title: `${staleInProgress.length} Stale Task${staleInProgress.length > 1 ? "s" : ""}`,
        subtitle: "No activity in 24h",
        severity: "warning",
      });
    }

    // All clear
    if (items.length === 0) {
      items.push({
        icon: "✅",
        title: "All Systems Operational",
        subtitle: "No critical alerts",
        severity: "info",
      });
    }

    return items;
  }, [agents, tasks, now]);

  return (
    <div className={cn("flex flex-col gap-6 overflow-auto p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Control</h1>
          <p className="mt-1 text-sm text-white/50">North Star metrics at a glance</p>
        </div>
        <div className="text-right text-xs text-white/40">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* North Star Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Automation"
          value={metrics.automationPercent}
          unit="%"
          subtitle="Tasks completed by agents"
          color="emerald"
          trend={metrics.automationPercent > 80 ? "up" : metrics.automationPercent > 50 ? "neutral" : "down"}
        />
        <MetricCard
          title="Velocity"
          value={metrics.velocity}
          subtitle="Tasks completed today"
          color="blue"
          trend={metrics.velocity > 5 ? "up" : "neutral"}
        />
        <MetricCard
          title="Cost"
          value={`$${metrics.costPerDay.toFixed(2)}`}
          subtitle="Agent spend (7d avg)"
          color={metrics.costPerDay < 5 ? "emerald" : metrics.costPerDay < 20 ? "yellow" : "red"}
          trend={metrics.costPerDay < 10 ? "down" : "up"}
        />
        <MetricCard
          title="Team Health"
          value={metrics.teamHealth}
          unit="%"
          subtitle={`${metrics.activeAgents}/${metrics.totalAgents} agents online`}
          color={metrics.teamHealth > 75 ? "emerald" : metrics.teamHealth > 50 ? "yellow" : "red"}
          trend={metrics.teamHealth > 75 ? "up" : metrics.teamHealth > 50 ? "neutral" : "down"}
        />
      </div>

      {/* Team Status Grid */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
          Team Status
        </h2>
        <div className="grid grid-cols-5 gap-3">
          {agents?.map(agent => (
            <AgentBadge key={agent._id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Today's Progress + Alerts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Progress */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
            Today's Progress
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div>
                <div className="text-xs font-semibold uppercase text-white/40">Completed</div>
                <div className="mt-1 text-2xl font-bold text-emerald-400">{todayProgress.completed}</div>
              </div>
              <div className="text-3xl">✅</div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <div>
                <div className="text-xs font-semibold uppercase text-white/40">In Progress</div>
                <div className="mt-1 text-2xl font-bold text-blue-400">{todayProgress.inProgress}</div>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <div>
                <div className="text-xs font-semibold uppercase text-white/40">Blocked</div>
                <div className="mt-1 text-2xl font-bold text-red-400">{todayProgress.blocked}</div>
              </div>
              <div className="text-3xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/50">
            Critical Alerts
          </h2>
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <AlertItem key={i} {...alert} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
