"use client";

/**
 * Mobile CEO Dashboard — 3-Second Decision View
 *
 * North Star: CEO sees impact in 3 seconds.
 *
 * Layout (mobile-first):
 * 1. HeroStatus — Is everything OK? (GREEN/YELLOW/RED)
 * 2. MetricRow — Tasks, Cost (2 columns)
 * 3. AlertList — What needs attention
 * 4. TeamStrip — Agent status at a glance
 * 5. ActivityStream — Recent events
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, startOfDay, endOfDay } from "date-fns";
import { HeroStatus, calculateHeroStatus } from "./HeroStatus";
import { AlertList } from "./AlertList";

interface MobileCEODashboardProps {
  className?: string;
}

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
  lastSeen?: number;
};

type PerformanceMetric = {
  agentName: string;
  totalTasksCompleted: number;
  totalCost: number;
};

/**
 * Mobile CEO Dashboard
 * Optimized for phone screens (375px)
 * Shows impact in 3 seconds
 */
export function MobileCEODashboard({ className }: MobileCEODashboardProps) {
  const now = Date.now();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  // Queries
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const dashboardStats = useQuery(api.dashboard.getStats, { startTs: todayStart, endTs: todayEnd });
  const today = new Date().toISOString().split('T')[0];
  const performance = useQuery(api.performanceMetrics.getAllAgentsMetrics, { date: today }) as PerformanceMetric[] | undefined;
  const recentActivity = useQuery(api.activityEvents.list, { limit: 5 });

  // Calculate metrics for HeroStatus
  const heroData = useMemo(() => {
    if (!agents) {
      return {
        offlineAgents: 0,
        criticalTasks: 0,
        blockedTasks: 0,
        idleAgents: 0,
        activeAgents: 0,
        totalAgents: 0,
        tasksToday: 0,
        costToday: 0,
      };
    }

    const activeAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || 0;
      const status = a.status?.toLowerCase() || "offline";
      return (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);
    });

    const offlineAgents = agents.filter(a => {
      const lastSeen = a.lastSeen || 0;
      const status = a.status?.toLowerCase() || "offline";
      return status === "offline" || (now - lastSeen > 15 * 60 * 1000);
    });

    const idleAgents = agents.filter(a => {
      const status = a.status?.toLowerCase() || "offline";
      return status === "idle";
    });

    const tasksToday = dashboardStats?.taskCounts?.done || 0;
    const costToday = performance?.reduce((sum, p) => sum + (p.totalCost || 0), 0) || 0;
    const blockedTasks = dashboardStats?.taskCounts?.backlog || 0;

    return {
      offlineAgents: offlineAgents.length,
      criticalTasks: 0,
      blockedTasks,
      idleAgents: idleAgents.length,
      activeAgents: activeAgents.length,
      totalAgents: agents.length,
      tasksToday,
      costToday,
    };
  }, [agents, dashboardStats, performance, now]);

  // Calculate hero status
  const hero = calculateHeroStatus(heroData);

  // Build alerts from data
  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      severity: "critical" | "warning";
      message: string;
      detail?: string;
    }> = [];

    if (!agents) return items;

    // Offline agents = critical
    agents.forEach(agent => {
      const lastSeen = agent.lastSeen || 0;
      const status = agent.status?.toLowerCase() || "offline";
      const minutesAgo = Math.floor((now - lastSeen) / 60000);

      if (status === "offline" || (now - lastSeen > 15 * 60 * 1000)) {
        items.push({
          id: `offline-${agent._id}`,
          severity: "critical",
          message: `${agent.name} offline`,
          detail: minutesAgo > 0 ? `${minutesAgo}m ago` : "just now",
        });
      }
    });

    // Blocked tasks = warning
    if (heroData.blockedTasks > 0) {
      items.push({
        id: "blocked-tasks",
        severity: "warning",
        message: `${heroData.blockedTasks} tasks blocked`,
        detail: "In backlog",
      });
    }

    // Idle agents = warning (if > 1)
    if (heroData.idleAgents > 1) {
      items.push({
        id: "idle-agents",
        severity: "warning",
        message: `${heroData.idleAgents} agents idle`,
        detail: "Waiting for work",
      });
    }

    return items;
  }, [agents, heroData, now]);

  // Loading state
  if (!agents) {
    return (
      <div className={cn("flex items-center justify-center min-h-[50vh]", className)}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-500 border-t-blue-500 rounded-full mx-auto mb-4" />
          <p className="text-sm text-primary0">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 p-4 pb-20", className)}>
      {/* 1. Hero Status — Most important, shows first */}
      <HeroStatus
        status={hero.status}
        headline={hero.headline}
        subtext={hero.subtext}
      />

      {/* 2. Key Metrics — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="Tasks Today"
          value={heroData.tasksToday}
          color={heroData.tasksToday > 0 ? "emerald" : "zinc"}
        />
        <MetricBox
          label="Cost Today"
          value={`$${heroData.costToday.toFixed(2)}`}
          color={heroData.costToday < 10 ? "emerald" : heroData.costToday < 30 ? "yellow" : "red"}
        />
      </div>

      {/* 3. Alerts — What needs attention */}
      {alerts.length > 0 && (
        <AlertList alerts={alerts} title="Needs Attention" />
      )}

      {/* 4. Team Status — Quick view */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
          Team ({heroData.activeAgents}/{heroData.totalAgents} active)
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {agents.map((agent) => {
            const status = agent.status?.toLowerCase() || "offline";
            const lastSeen = agent.lastSeen || 0;
            const isActive = (status === "online" || status === "busy") && (now - lastSeen < 5 * 60 * 1000);

            return (
              <AgentPill
                key={agent._id}
                name={agent.name}
                avatar={agent.avatar}
                status={isActive ? (status === "busy" ? "busy" : "online") : status === "idle" ? "idle" : "offline"}
              />
            );
          })}
        </div>
      </div>

      {/* 5. Activity Stream — Recent events */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
          Live Activity
        </h3>
        <div className="space-y-1 rounded-lg border border-border-default bg-surface-1/50 p-2">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((event: any) => (
              <ActivityRow key={event._id} event={event} />
            ))
          ) : (
            <p className="text-xs text-primary0 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Internal components

function MetricBox({
  label,
  value,
  color = "zinc",
}: {
  label: string;
  value: string | number;
  color?: "emerald" | "yellow" | "red" | "zinc";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    zinc: "text-secondary",
  };

  return (
    <div className="rounded-lg border border-border-default bg-surface-1/50 p-3 text-center">
      <div className={cn("text-2xl font-bold tabular-nums", colorMap[color])}>
        {value}
      </div>
      <div className="text-[10px] uppercase text-white/40 mt-1">{label}</div>
    </div>
  );
}

function AgentPill({
  name,
  avatar,
  status,
}: {
  name: string;
  avatar: string;
  status: "online" | "busy" | "idle" | "offline";
}) {
  const statusColors = {
    online: "bg-green-500",
    busy: "bg-yellow-500",
    idle: "bg-gray-500",
    offline: "bg-red-500",
  };

  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-border-default bg-surface-1/50 shrink-0 min-w-[60px]">
      <span className="text-lg">{avatar || "🤖"}</span>
      <span className="text-[10px] font-medium text-white uppercase">{name}</span>
      <span className={cn("h-2 w-2 rounded-full", statusColors[status], status === "busy" && "animate-pulse")} />
    </div>
  );
}

function ActivityRow({ event }: { event: { agentName: string; description: string; timestamp: number } }) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span className="text-tertiary w-10 shrink-0">
        {formatDistanceToNow(event.timestamp, { addSuffix: false })}
      </span>
      <span className="font-medium text-blue-400 uppercase shrink-0">
        {event.agentName}
      </span>
      <span className="text-secondary truncate">
        {event.description?.slice(0, 40)}
      </span>
    </div>
  );
}
