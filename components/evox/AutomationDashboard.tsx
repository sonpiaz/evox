"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface AutomationDashboardProps {
  className?: string;
}

type TimeRange = "1h" | "24h" | "7d";

type TaskDoc = {
  _id: Id<"tasks">;
  status: string;
  title: string;
  linearIdentifier?: string;
  agentName?: string;
  retryCount?: number;
  lastError?: string;
  escalatedAt?: number;
  updatedAt: number;
  createdAt: number;
  requiresApproval?: boolean;
  approvalStatus?: string;
  assignee?: Id<"agents">;
};

type CronJob = {
  name: string;
  interval?: string;
  schedule?: string;
  enabled: boolean;
};

type AgentHeartbeat = {
  name: string;

  status: string;
};

type AgentDoc = {
  _id: Id<"agents">;
  name: string;
  status: string;
};

/**
 * AGT-213: Automation Dashboard
 * Shows automation health: scheduled runs, success rate, pending approvals, blocked tasks
 * AGT-230: Approve/Reject buttons hidden in demo mode
 */
export function AutomationDashboard({ className }: AutomationDashboardProps) {
  const { isViewerMode } = useViewerMode();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [now, setNow] = useState(() => new Date().getTime());

  // Update "now" every minute for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date().getTime()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time range bounds
  const { startTs, endTs } = useMemo(() => {
    const end = now;
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    switch (timeRange) {
      case "1h":
        return { startTs: end - hour, endTs: end };
      case "24h":
        return { startTs: end - day, endTs: end };
      case "7d":
        return { startTs: end - 7 * day, endTs: end };
    }
  }, [timeRange, now]);

  // Queries
  const cronStatus = useQuery(api.automation.getCronStatus);
  const pendingApprovals = useQuery(api.approval.getPendingApprovals, { limit: 10 }) as TaskDoc[] | undefined;
  const escalatedTasks = useQuery(api.automation.getEscalatedTasks, { limit: 10 }) as TaskDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 200 }) as TaskDoc[] | undefined;
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;

  // Mutations
  const approveTask = useMutation(api.approval.approveTask);
  const rejectTask = useMutation(api.approval.rejectTask);

  // Calculate automation stats
  const stats = useMemo(() => {
    if (!tasks) return null;

    const tasksInRange = tasks.filter(t => t.updatedAt >= startTs && t.updatedAt <= endTs);

    // Success: completed without errors
    const success = tasksInRange.filter(
      t => t.status?.toLowerCase() === "done" && !t.lastError && (!t.retryCount || t.retryCount === 0)
    ).length;

    // Retries: tasks that had retries
    const retries = tasksInRange.filter(
      t => t.retryCount && t.retryCount > 0
    ).length;

    // Blocked: escalated or in review with approval pending
    const blocked = tasksInRange.filter(
      t => t.escalatedAt || (t.status?.toLowerCase() === "review" && t.requiresApproval && t.approvalStatus === "pending")
    ).length;

    const total = success + retries + blocked;

    return {
      success,
      retries,
      blocked,
      total,
      successPercent: total > 0 ? Math.round((success / total) * 100) : 100,
      retriesPercent: total > 0 ? Math.round((retries / total) * 100) : 0,
      blockedPercent: total > 0 ? Math.round((blocked / total) * 100) : 0,
    };
  }, [tasks, startTs, endTs]);

  // Get agent name from ID
  const getAgentName = (agentId: Id<"agents"> | undefined, agentName?: string): string => {
    if (agentName) return agentName.toUpperCase();
    if (!agentId || !agents) return "—";
    const agent = agents.find(a => a._id === agentId);
    return agent?.name ?? "—";
  };

  // Handle approval actions
  const handleApprove = async (taskId: Id<"tasks">) => {
    try {
      await approveTask({ taskId, reviewerName: "HUMAN" });
    } catch (error) {
      console.error("Failed to approve task:", error);
    }
  };

  const handleReject = async (taskId: Id<"tasks">) => {
    try {
      await rejectTask({ taskId, reviewerName: "HUMAN", reason: "Rejected via dashboard" });
    } catch (error) {
      console.error("Failed to reject task:", error);
    }
  };

  // Calculate next run time for cron jobs
  const getNextRunTime = (cron: CronJob): string => {
    // For interval-based crons, estimate based on interval
    if (cron.interval) {
      const match = cron.interval.match(/(\d+)\s*min/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const minutesSinceHour = new Date().getMinutes();
        const nextMinute = Math.ceil(minutesSinceHour / minutes) * minutes;
        const minutesUntilNext = nextMinute - minutesSinceHour;
        if (minutesUntilNext <= 0) return "now";
        return `${minutesUntilNext}m`;
      }
    }
    // For schedule-based, show next minute match
    if (cron.schedule) {
      const minuteMatch = cron.schedule.match(/^(\d+(?:,\d+)*)/);
      if (minuteMatch) {
        const targetMinutes = minuteMatch[1].split(",").map(Number);
        const currentMinute = new Date().getMinutes();
        const nextMinute = targetMinutes.find(m => m > currentMinute) ?? targetMinutes[0];
        const diff = nextMinute > currentMinute
          ? nextMinute - currentMinute
          : 60 - currentMinute + nextMinute;
        return `${diff}m`;
      }
    }
    return "—";
  };

  // Recent failures from escalated tasks
  const recentFailures = useMemo(() => {
    if (!escalatedTasks) return [];
    return escalatedTasks.slice(0, 5);
  }, [escalatedTasks]);

  if (!cronStatus || !stats) {
    return (
      <div className={cn("flex items-center justify-center h-full text-tertiary", className)}>
        <span className="animate-pulse">Loading automation data...</span>
      </div>
    );
  }

  const chipBase =
    "rounded-lg border border-border-default bg-surface-1 p-4 transition-colors";

  return (
    <div className={cn("p-6 space-y-6 overflow-auto", className)}>
      {/* Header with Time Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>Automation</span>
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-surface-1 border border-border-default p-1">
          {(["1h", "24h", "7d"] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                timeRange === range
                  ? "bg-white/10 text-white"
                  : "text-tertiary hover:text-secondary"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Success */}
        <div className={chipBase}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400">✓</span>
            <span className="text-xs font-medium uppercase tracking-wider text-tertiary">Success</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{stats.success}</div>
          <div className="text-sm text-tertiary">{stats.successPercent}%</div>
        </div>

        {/* Retries */}
        <div className={chipBase}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">↻</span>
            <span className="text-xs font-medium uppercase tracking-wider text-tertiary">Retries</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{stats.retries}</div>
          <div className="text-sm text-tertiary">{stats.retriesPercent}%</div>
        </div>

        {/* Blocked */}
        <div className={chipBase}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400">⊘</span>
            <span className="text-xs font-medium uppercase tracking-wider text-tertiary">Blocked</span>
          </div>
          <div className="text-3xl font-bold text-red-400">{stats.blocked}</div>
          <div className="text-sm text-tertiary">{stats.blockedPercent}%</div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className={cn(chipBase, "space-y-3")}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-tertiary">
            Pending Approvals ({pendingApprovals?.length ?? 0})
          </span>
        </div>
        {pendingApprovals && pendingApprovals.length > 0 ? (
          <div className="space-y-2">
            {pendingApprovals.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between rounded-md bg-base px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-amber-400">⏳</span>
                  <div>
                    <span className="text-sm text-white">
                      {task.linearIdentifier ?? task.title.slice(0, 30)}
                    </span>
                    <span className="ml-2 text-xs text-tertiary">
                      {getAgentName(task.assignee, task.agentName)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-tertiary">
                    {formatDistanceToNow(task.updatedAt, { addSuffix: true })}
                  </span>
                  {/* AGT-230: Hide approve/reject in demo mode */}
                  {!isViewerMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(task._id)}
                        className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(task._id)}
                        className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-tertiary py-2">No pending approvals</div>
        )}
      </div>

      {/* Scheduled Runs */}
      <div className={cn(chipBase, "space-y-3")}>
        <span className="text-xs font-medium uppercase tracking-wider text-tertiary">
          Scheduled Runs
        </span>
        <div className="space-y-2">
          {cronStatus.crons.map((cron: CronJob, i: number) => {
            const nextRun = getNextRunTime(cron);
            const isImminent = nextRun === "now" || (nextRun !== "—" && parseInt(nextRun) <= 2);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-base px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      cron.enabled
                        ? isImminent
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-emerald-400/50"
                        : "bg-gray-500"
                    )}
                  />
                  <span className="text-sm text-white">{cron.name}</span>
                  <span className="text-xs text-tertiary">
                    {cron.interval ?? cron.schedule}
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isImminent ? "text-emerald-400" : "text-tertiary"
                  )}
                >
                  Next in {nextRun}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Failures */}
      <div className={cn(chipBase, "space-y-3")}>
        <span className="text-xs font-medium uppercase tracking-wider text-tertiary">
          Recent Failures
        </span>
        {recentFailures.length > 0 ? (
          <div className="space-y-2">
            {recentFailures.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between rounded-md bg-base px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-red-400">✕</span>
                  <div>
                    <span className="text-sm text-white">
                      {task.linearIdentifier ?? task.title.slice(0, 25)}
                    </span>
                    {task.retryCount !== undefined && task.retryCount > 0 && (
                      <span className="ml-2 text-xs text-tertiary">
                        (attempt {task.retryCount}/3)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-tertiary">
                    {getAgentName(task.assignee, task.agentName)}
                  </span>
                  {task.lastError && (
                    <span className="max-w-[200px] truncate text-xs text-red-400/80" title={task.lastError}>
                      "{task.lastError.slice(0, 40)}{task.lastError.length > 40 ? "..." : ""}"
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-tertiary py-2">No recent failures</div>
        )}
      </div>

    </div>
  );
}
