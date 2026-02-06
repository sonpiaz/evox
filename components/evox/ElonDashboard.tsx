"use client";

/**
 * AGT-238: Elon Dashboard — First Principles Metrics
 *
 * Dashboard Elon would approve. No vanity metrics. Only actionable data.
 * - Numbers > text
 * - Trends > snapshots
 * - Actionable > informational
 * - Glanceable in 3 seconds
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, subDays, startOfDay, format } from "date-fns";

interface ElonDashboardProps {
  className?: string;
}

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastHeartbeat?: number;
};

type TaskDoc = {
  _id: string;
  status: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  agentName?: string;
  linearIdentifier?: string;
  priority?: string;
};

type PerformanceMetric = {
  agentName: string;
  hourBucket: string;
  date: string;
  tasksCompleted: number;
  tasksFailed: number;
  totalCost: number;
  avgDurationMinutes?: number;
  utilizationPercent?: number;
  velocityPerHour?: number;
};

/** Trend arrow indicator */
function TrendArrow({ value, baseline, invert = false }: { value: number; baseline: number; invert?: boolean }) {
  if (baseline === 0 && value === 0) return <span className="text-zinc-500">—</span>;

  const diff = value - baseline;
  const pctChange = baseline > 0 ? Math.round((diff / baseline) * 100) : value > 0 ? 100 : 0;

  // For some metrics (cost), down is good
  const isGood = invert ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;

  if (isNeutral) return <span className="text-zinc-500">→ 0%</span>;

  return (
    <span className={cn(
      "text-xs font-medium",
      isGood ? "text-emerald-400" : "text-red-400"
    )}>
      {diff > 0 ? "↑" : "↓"} {Math.abs(pctChange)}%
    </span>
  );
}

/** Simple sparkline SVG */
function Sparkline({ data, color = "#22c55e", className }: { data: number[]; color?: string; className?: string }) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Utilization bar */
function UtilizationBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-12 truncate">{label}</span>
      <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percent >= 70 ? "bg-emerald-500" :
            percent >= 40 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-medium w-10 text-right",
        percent >= 70 ? "text-emerald-400" :
        percent >= 40 ? "text-yellow-400" : "text-red-400"
      )}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

/** Big number display */
function BigNumber({
  value,
  unit,
  label,
  trend,
  trendBaseline,
  invertTrend,
  color = "white",
}: {
  value: number | string;
  unit?: string;
  label: string;
  trend?: number;
  trendBaseline?: number;
  invertTrend?: boolean;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-3xl font-bold", `text-${color}`)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-zinc-500">{unit}</span>}
      </div>
      {trend !== undefined && trendBaseline !== undefined && (
        <div className="mt-1">
          <TrendArrow value={trend} baseline={trendBaseline} invert={invertTrend} />
          <span className="text-xs text-zinc-600 ml-1">vs yesterday</span>
        </div>
      )}
    </div>
  );
}

export function ElonDashboard({ className }: ElonDashboardProps) {
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 500 }) as TaskDoc[] | undefined;

  // Get today's date string
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  }, []);

  const yesterday = useMemo(() => {
    const d = subDays(new Date(), 1);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }, []);

  // Query performance metrics
  const allMetrics = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today });
  const yesterdayMetrics = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: yesterday });
  const costBreakdown = useQuery(api.performanceMetrics.getCostBreakdown, { date: today });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!tasks || !agents) return null;

    const now = new Date().getTime();
    const day24h = 24 * 60 * 60 * 1000;

    // Filter tasks
    const todayTasks = tasks.filter(t => t.updatedAt > startOfDay(new Date()).getTime());
    const yesterdayStart = startOfDay(subDays(new Date(), 1)).getTime();
    const yesterdayEnd = startOfDay(new Date()).getTime();
    const yesterdayTasks = tasks.filter(t => t.updatedAt >= yesterdayStart && t.updatedAt < yesterdayEnd);

    // Completed today vs yesterday
    const completedToday = todayTasks.filter(t => t.status?.toLowerCase() === "done").length;
    const completedYesterday = yesterdayTasks.filter(t => t.status?.toLowerCase() === "done").length;

    // Calculate velocity (tasks per hour)
    const hoursElapsedToday = (now - startOfDay(new Date()).getTime()) / (60 * 60 * 1000);
    const velocityToday = hoursElapsedToday > 0 ? completedToday / hoursElapsedToday : 0;
    const velocityYesterday = completedYesterday / 24; // Full day

    // Velocity sparkline (last 7 days)
    const velocityTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(subDays(new Date(), i)).getTime();
      const dayEnd = dayStart + day24h;
      const dayCompleted = tasks.filter(t =>
        t.status?.toLowerCase() === "done" &&
        t.completedAt &&
        t.completedAt >= dayStart &&
        t.completedAt < dayEnd
      ).length;
      velocityTrend.push(dayCompleted);
    }

    // Cost metrics
    const todayCost = allMetrics?.reduce((sum, m) => sum + m.totalCost, 0) || 0;
    const yesterdayCost = yesterdayMetrics?.reduce((sum, m) => sum + m.totalCost, 0) || 0;
    const avgCostPerTask = completedToday > 0 ? todayCost / completedToday : 0;
    const avgCostYesterday = completedYesterday > 0 ? yesterdayCost / completedYesterday : 0;

    // Agent utilization
    const agentUtilization = agents.map(agent => {
      const agentMetric = allMetrics?.find(m => m.agentName.toLowerCase() === agent.name.toLowerCase());
      const agentStatus = agent.status?.toLowerCase() || "offline";
      return {
        name: agent.name,
        avatar: agent.avatar,
        status: agent.status,
        utilization: agentMetric?.utilizationPercent ||
          (agentStatus === "busy" ? 80 : agentStatus === "online" ? 50 : agentStatus === "idle" ? 20 : 0),
        tasksCompleted: agentMetric?.totalTasksCompleted || 0,
        cost: agentMetric?.totalCost || 0,
      };
    });

    // Find underutilized agent
    const sortedByUtil = [...agentUtilization].sort((a, b) => a.utilization - b.utilization);
    const underutilized = sortedByUtil.find(a => a.utilization < 50);

    // Bottlenecks
    const inProgressTasks = tasks.filter(t => t.status?.toLowerCase() === "in_progress");
    const waitingTasks = tasks.filter(t => t.status?.toLowerCase() === "todo" || t.status?.toLowerCase() === "backlog");
    const blockedTasks = tasks.filter(t =>
      t.status?.toLowerCase() === "in_progress" &&
      t.updatedAt < now - (30 * 60 * 1000) // Not updated in 30 min
    );

    // Find longest in-progress task (potential blocker)
    const oldestInProgress = inProgressTasks
      .sort((a, b) => a.updatedAt - b.updatedAt)[0];

    // ROI estimate (simplified: value = tasks * avg value, cost = API cost)
    // Assuming each task generates ~$50 value (conservative estimate)
    const VALUE_PER_TASK = 50;
    const valueGenerated = completedToday * VALUE_PER_TASK;
    const roi = todayCost > 0 ? valueGenerated / todayCost : valueGenerated > 0 ? Infinity : 0;

    // Average team utilization
    const avgUtilization = agentUtilization.length > 0
      ? agentUtilization.reduce((sum, a) => sum + a.utilization, 0) / agentUtilization.length
      : 0;

    return {
      // Velocity
      velocityToday: Math.round(velocityToday * 10) / 10,
      velocityYesterday: Math.round(velocityYesterday * 10) / 10,
      completedToday,
      completedYesterday,
      velocityTrend,

      // Cost
      todayCost,
      yesterdayCost,
      avgCostPerTask: Math.round(avgCostPerTask * 100) / 100,
      avgCostYesterday: Math.round(avgCostYesterday * 100) / 100,
      costBreakdown: costBreakdown || [],

      // Utilization
      agentUtilization,
      avgUtilization: Math.round(avgUtilization),
      underutilized,

      // Bottlenecks
      waitingCount: waitingTasks.length,
      blockedCount: blockedTasks.length,
      topBlocker: oldestInProgress ? {
        id: oldestInProgress.linearIdentifier ?? "—",
        agent: oldestInProgress.agentName || "—",
        stuckFor: formatDistanceToNow(oldestInProgress.updatedAt, { addSuffix: false }),
      } : null,

      // ROI
      valueGenerated,
      totalCost: todayCost,
      roi: roi === Infinity ? "∞" : Math.round(roi * 10) / 10,
    };
  }, [tasks, agents, allMetrics, yesterdayMetrics, costBreakdown]);

  if (!agents || !metrics) {
    return (
      <div className={cn("flex items-center justify-center h-full text-zinc-500", className)}>
        <span className="animate-pulse">Loading metrics...</span>
      </div>
    );
  }

  return (
    <div className={cn("p-6 space-y-6 overflow-auto", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Performance</h2>
        <span className="text-xs text-zinc-500">
          {format(new Date(), "MMM d, yyyy")}
        </span>
      </div>

      {/* Top Row: Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        {/* Velocity */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BigNumber
            value={metrics.velocityToday}
            unit="tasks/hr"
            label="Velocity"
            trend={metrics.velocityToday}
            trendBaseline={metrics.velocityYesterday}
          />
          <div className="mt-3">
            <Sparkline data={metrics.velocityTrend} color="#3b82f6" />
          </div>
        </div>

        {/* Cost per Task */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BigNumber
            value={`$${metrics.avgCostPerTask}`}
            label="$/task"
            trend={metrics.avgCostPerTask}
            trendBaseline={metrics.avgCostYesterday}
            invertTrend
          />
          <div className="mt-3 text-xs text-zinc-500">
            Total: ${metrics.todayCost.toFixed(2)}
          </div>
        </div>

        {/* Utilization */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BigNumber
            value={metrics.avgUtilization}
            unit="%"
            label="Utilization"
          />
          {metrics.underutilized && (
            <div className="mt-3 text-xs">
              <span className="text-yellow-400">⚠</span>
              <span className="text-zinc-400 ml-1">
                {metrics.underutilized.name} underutilized
              </span>
            </div>
          )}
        </div>

        {/* Bottlenecks */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BigNumber
            value={metrics.waitingCount}
            label="Waiting"
          />
          {metrics.topBlocker && (
            <div className="mt-3 text-xs">
              <span className="text-red-400">●</span>
              <span className="text-zinc-400 ml-1">
                {metrics.topBlocker.id} stuck {metrics.topBlocker.stuckFor}
              </span>
            </div>
          )}
        </div>

        {/* ROI */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <BigNumber
            value={`${metrics.roi}x`}
            label="ROI"
            color={Number(metrics.roi) >= 10 ? "emerald-400" : Number(metrics.roi) >= 5 ? "yellow-400" : "red-400"}
          />
          <div className="mt-3 text-xs text-zinc-500">
            ${metrics.valueGenerated} value / ${metrics.totalCost.toFixed(2)} cost
          </div>
        </div>
      </div>

      {/* Middle Row: Agent Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Agent Utilization */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Agent Utilization</div>
          <div className="space-y-3">
            {metrics.agentUtilization
              .sort((a, b) => b.utilization - a.utilization)
              .map(agent => (
                <UtilizationBar
                  key={agent.name}
                  label={agent.name}
                  percent={agent.utilization}
                />
              ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Cost Breakdown</div>
          <div className="space-y-2">
            {metrics.agentUtilization.map(agent => (
              <div key={agent.name} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{agent.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{agent.tasksCompleted} tasks</span>
                  <span className="text-white font-medium">${agent.cost.toFixed(2)}</span>
                </div>
              </div>
            ))}
            <div className="border-t border-zinc-800 pt-2 mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-500">Total</span>
              <span className="text-white font-bold">${metrics.todayCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Tasks Completed Today */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Tasks Completed Today</div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">{metrics.completedToday}</span>
            <TrendArrow value={metrics.completedToday} baseline={metrics.completedYesterday} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-8">
          {metrics.agentUtilization.map(agent => (
            <div key={agent.name} className="flex items-center gap-2">
              <span className="text-lg">{agent.avatar}</span>
              <span className="text-sm text-zinc-400">{agent.name}</span>
              <span className="text-sm font-medium text-white">{agent.tasksCompleted}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
