"use client";

/**
 * AgentGrid - Team Status with inline performance metrics
 * CEO requirement: See agent performance at a glance without clicking
 *
 * Format per agent:
 * [dot] MAX | PM | 5 tasks | 95% | Working on AGT-108 | 0.3/h | 2m ago
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Agent {
  name: string;
  computedStatus: "online" | "busy" | "idle" | "offline";
  currentTask?: string;
  lastSeen?: number;
}

interface AgentGridProps {
  agents: Agent[];
}

const statusColors: Record<string, string> = {
  online: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]",
  busy: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.4)]",
  idle: "bg-zinc-500",
  offline: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
  devops: "DevOps",
  content: "Content",
  security: "Security",
  data: "Data",
  research: "Research",
};

function getStatusColor(status: string): string {
  return statusColors[status.toLowerCase()] || statusColors.offline;
}

function formatLastSeen(timestamp?: number): string {
  if (!timestamp) return "—";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function AgentGrid({ agents }: AgentGridProps) {
  const completionStats = useQuery(api.agentStats.getCompletionStats);
  const perfMetrics = useQuery(api.performanceMetrics.getAllAgentsMetrics, {});

  const onlineCount = agents.filter(
    (a) => a.computedStatus === "online" || a.computedStatus === "busy"
  ).length;

  // Completion stats lookup (tasks completed 24h)
  const statsMap = new Map<string, { last24h: number; allTime: number; role?: string }>();
  if (completionStats?.stats) {
    for (const s of completionStats.stats) {
      statsMap.set(s.name.toUpperCase(), {
        last24h: s.last24h,
        allTime: s.allTime,
        role: s.role,
      });
    }
  }

  // Performance metrics lookup (velocity, success rate)
  const perfMap = new Map<
    string,
    { velocity: number; successRate: number; totalCompleted: number; totalFailed: number }
  >();
  if (perfMetrics) {
    for (const m of perfMetrics) {
      const total = m.totalTasksCompleted + m.totalTasksFailed;
      perfMap.set(m.agentName.toUpperCase(), {
        velocity: m.velocityPerHour || 0,
        successRate: total > 0 ? Math.round((m.totalTasksCompleted / total) * 100) : 100,
        totalCompleted: m.totalTasksCompleted,
        totalFailed: m.totalTasksFailed,
      });
    }
  }

  const isLoading = completionStats === undefined;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-400">Team Status</h2>
        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
          {onlineCount}/{agents.length} online
        </span>
      </div>

      {/* Agent rows */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 divide-y divide-zinc-800/50">
        {agents.map((agent, i) => {
          const nameUpper = (agent.name || "?").toUpperCase();
          const stats = statsMap.get(nameUpper);
          const perf = perfMap.get(nameUpper);
          const role = stats?.role || "";
          const tasksToday = stats?.last24h ?? 0;
          const successRate = perf?.successRate ?? 100;
          const velocity = perf?.velocity ?? 0;

          return (
            <div
              key={agent.name || i}
              className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 active:bg-zinc-800/50 transition-colors"
            >
              {/* Status dot */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(agent.computedStatus)}`}
              />

              {/* Name + Role */}
              <div className="w-16 sm:w-20 shrink-0">
                <span className="text-xs font-semibold text-zinc-200 block leading-tight">
                  {nameUpper}
                </span>
                <span className="text-[10px] text-zinc-600 leading-tight">
                  {roleLabels[role] || role}
                </span>
              </div>

              {/* Tasks today badge */}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                  tasksToday > 0
                    ? "bg-green-900/40 text-green-400"
                    : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {isLoading ? (
                  <Skeleton className="h-3 w-8 inline-block" />
                ) : (
                  `${tasksToday} tasks`
                )}
              </span>

              {/* Success rate */}
              <span
                className={`text-[10px] shrink-0 hidden sm:inline ${
                  successRate >= 90
                    ? "text-zinc-500"
                    : successRate >= 70
                      ? "text-yellow-500"
                      : "text-red-400"
                }`}
              >
                {isLoading ? (
                  <Skeleton className="h-3 w-6 inline-block" />
                ) : (
                  `${successRate}%`
                )}
              </span>

              {/* Current task or status */}
              <span className="text-[10px] text-zinc-400 truncate flex-1 min-w-0">
                {agent.currentTask ? (
                  agent.currentTask
                ) : agent.computedStatus === "offline" ? (
                  <span className="text-red-400/60">Offline</span>
                ) : agent.computedStatus === "idle" ? (
                  <span className="text-zinc-600">Idle</span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </span>

              {/* Velocity */}
              <span className="text-[10px] text-zinc-600 shrink-0 hidden sm:inline w-8 text-right">
                {isLoading ? (
                  <Skeleton className="h-3 w-6 inline-block" />
                ) : velocity > 0 ? (
                  `${velocity}/h`
                ) : (
                  ""
                )}
              </span>

              {/* Last active */}
              <span className="text-[10px] text-zinc-700 shrink-0 w-8 text-right">
                {formatLastSeen(agent.lastSeen)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
