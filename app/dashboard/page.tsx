"use client";

import { useMemo, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AgentCard } from "@/components/agent-card";
import { ActivityFeed } from "@/components/activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ListTodo, CheckCircle2 } from "lucide-react";
import { normalizeActivities } from "@/lib/activity-utils";

// AGT-147: Mock agents without fake currentTask (WORKING.md or "No active task" only)
const mockAgents = [
  { name: "Sam", role: "pm" as const, status: "online" as const, avatar: "SM", lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000) },
  { name: "Leo", role: "frontend" as const, status: "online" as const, avatar: "LO", lastHeartbeat: new Date(Date.now() - 30 * 1000) },
  { name: "Backend Agent", role: "backend" as const, status: "idle" as const, avatar: "BE", lastHeartbeat: new Date(Date.now() - 15 * 60 * 1000) },
] as const;

// AGT-137: Mock activities use new unified activityEvents schema
const mockActivities = [
  {
    _id: "1",
    agentId: "mock-leo",
    agentName: "leo",
    agent: { name: "Leo", avatar: "LO", role: "frontend" as const, status: "online" as const },
    category: "task" as const,
    eventType: "completed",
    title: "Leo completed AGT-69",
    linearIdentifier: "AGT-69",
    timestamp: Date.now() - 5 * 60 * 1000,
  },
  {
    _id: "2",
    agentId: "mock-sam",
    agentName: "sam",
    agent: { name: "Sam", avatar: "SM", role: "backend" as const, status: "online" as const },
    category: "task" as const,
    eventType: "created",
    title: "Sam created Phase 2 Planning",
    timestamp: Date.now() - 15 * 60 * 1000,
  },
  {
    _id: "3",
    agentId: "mock-leo",
    agentName: "leo",
    agent: { name: "Leo", avatar: "LO", role: "frontend" as const, status: "online" as const },
    category: "task" as const,
    eventType: "status_change",
    title: "Leo moved AGT-68",
    linearIdentifier: "AGT-68",
    metadata: { toStatus: "in_progress" },
    timestamp: Date.now() - 25 * 60 * 1000,
  },
];

/** Map agent display name to canonical name for getUnreadMessages (AGT-123) */
const agentNameToCanonical: Record<string, string> = {
  SON: "max",
  SAM: "sam",
  LEO: "leo",
};

const SYNC_INTERVAL_MS = 60 * 1000; // 60s (AGT-133)

/** AGT-147: Parse first line or status from WORKING.md content for current task display */
function currentTaskFromWorkingContent(content: string | undefined): string | undefined {
  if (!content || typeof content !== "string") return undefined;
  const trimmed = content.trim();
  if (!trimmed) return undefined;
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim();
  if (!firstLine) return undefined;
  return firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
}

/** AGT-147: Agent card with WORKING.md content; fetches getBootContext per agent */
function DashboardAgentCard({
  agentId,
  name,
  role,
  status,
  avatar,
  lastHeartbeat,
  lastActivityAt,
  unreadCount,
  taskCounts,
  fallbackCurrentTask,
}: {
  agentId: string | undefined;
  name: string;
  role: "pm" | "backend" | "frontend";
  status: "online" | "idle" | "offline" | "busy";
  avatar: string;
  lastHeartbeat?: Date;
  lastActivityAt?: Date;
  unreadCount: number;
  taskCounts?: { backlog: number; inProgress: number; done: number };
  fallbackCurrentTask?: string;
}) {
  const bootContext = useQuery(
    api.agentMemory.getBootContext,
    agentId ? { agentId: agentId as Id<"agents"> } : "skip"
  );
  const currentTask =
    currentTaskFromWorkingContent(bootContext?.working?.content) ?? fallbackCurrentTask;
  const sessionBased = name === "Max" || name === "Son";

  return (
    <AgentCard
      name={name}
      role={role}
      status={status}
      currentTask={currentTask}
      avatar={avatar}
      lastHeartbeat={lastHeartbeat}
      lastActivityAt={lastActivityAt}
      unreadCount={unreadCount}
      taskCounts={taskCounts}
      sessionBased={sessionBased}
    />
  );
}

export default function DashboardPage() {
  const agents = useQuery(api.agents.list);
  const tasks = useQuery(api.tasks.list, {});
  // AGT-145: Dashboard Recent Activity from activityEvents.list (unified source)
  const activities = useQuery(api.activityEvents.list, { limit: 10 });
  const triggerSync = useAction(api.linearSync.triggerSync);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AGT-133: Auto-sync on mount + every 60s
  useEffect(() => {
    const runSync = () => {
      triggerSync({}).catch((err) => console.warn("Dashboard auto-sync failed:", err));
    };
    runSync();
    syncIntervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [triggerSync]);

  // Unread counts: skip query on dashboard to avoid crash when agentMappings not seeded or Convex not yet deployed; badge shows 0
  const unreadCounts: Record<string, number> | undefined = undefined;

  // AGT-141: Null-safe lists; normalize activities so ActivityFeed never crashes on shape mismatch
  const agentsList = Array.isArray(agents) && agents.length > 0 ? agents : mockAgents;
  const rawActivities = Array.isArray(activities) ? activities : [];
  const activitiesList =
    rawActivities.length > 0 ? normalizeActivities(rawActivities) : normalizeActivities(mockActivities);

  const taskStats = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { total: 0, inProgress: 0, completed: 0 };
    }
    return {
      total: tasks.length,
      inProgress: tasks.filter((t: { status?: string }) => t.status === "in_progress").length,
      completed: tasks.filter((t: { status?: string }) => t.status === "done").length,
    };
  }, [tasks]);

  // AGT-137: Use new activityEvents schema (agentId, timestamp)
  const lastActivityByAgent = useMemo(() => {
    if (!Array.isArray(activities) || activities.length === 0) return {} as Record<string, number>;
    const byAgent: Record<string, number> = {};
    for (const a of activities) {
      const id = (a as { agentId?: string }).agentId;
      if (!id) continue;
      const ts = (a as { timestamp?: number }).timestamp;
      if (ts == null) continue;
      if (!byAgent[id] || ts > byAgent[id]) byAgent[id] = ts;
    }
    return byAgent;
  }, [activities]);

  const currentTaskByAgent = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0 || !Array.isArray(agents) || agents.length === 0) {
      return {} as Record<string, string>;
    }
    const map: Record<string, string> = {};
    for (const agent of agents) {
      const a = agent as { _id?: string; currentTask?: string };
      const aid = a?._id;
      if (!aid) continue;
      const inProgress = tasks.find(
        (t: { assignee?: string; status?: string }) =>
          t.assignee === aid && t.status === "in_progress"
      );
      const byCurrent = a.currentTask
        ? tasks.find((t: { _id?: string }) => t._id === a.currentTask)
        : null;
      const task = inProgress ?? byCurrent;
      if (task) {
        const t = task as { title?: string; linearIdentifier?: string };
        map[aid] = t.linearIdentifier ? `${t.linearIdentifier}: ${t.title ?? ""}` : (t.title ?? "");
      }
    }
    return map;
  }, [tasks, agents]);

  // AGT-147: Per-agent task counts (assignee) for badge
  const taskCountsByAgent = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) return {} as Record<string, { backlog: number; inProgress: number; done: number }>;
    const byAgent: Record<string, { backlog: number; inProgress: number; done: number }> = {};
    for (const t of tasks) {
      const assignee = (t as { assignee?: string }).assignee;
      if (!assignee) continue;
      if (!byAgent[assignee]) byAgent[assignee] = { backlog: 0, inProgress: 0, done: 0 };
      const status = (t as { status?: string }).status;
      if (status === "backlog" || status === "todo") byAgent[assignee].backlog++;
      else if (status === "in_progress" || status === "review") byAgent[assignee].inProgress++;
      else if (status === "done") byAgent[assignee].done++;
    }
    return byAgent;
  }, [tasks]);

  return (
    <div className="h-full bg-black p-8">

      <div className="grid gap-6">
          {/* Task Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Total Tasks
                </CardTitle>
                <ListTodo className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-50">
                  {taskStats.total}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  In Progress
                </CardTitle>
                <Users className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {taskStats.inProgress}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  Completed
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {taskStats.completed}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Cards Grid */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-zinc-50">Agents</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agentsList.map((agent: Record<string, unknown>, idx: number) => {
                const name = (agent.name as string) ?? "Unknown";
                const canonical =
                  agentNameToCanonical[name] ?? String(name).toLowerCase();
                const unreadCount =
                  unreadCounts && typeof unreadCounts === "object" && canonical in unreadCounts
                    ? Number((unreadCounts as Record<string, number>)[canonical]) ?? 0
                    : 0;
                const agentId = agent._id as string | undefined;
                const lastActivityTs = agentId ? lastActivityByAgent[agentId] : undefined;
                const lastActivityAt = lastActivityTs != null ? new Date(lastActivityTs) : undefined;
                const lastSeen = agent.lastSeen as number | undefined;
                const lastHeartbeat = lastSeen != null ? new Date(lastSeen) : (agent.lastHeartbeat as Date | undefined);
                const fallbackCurrentTask = agentId ? currentTaskByAgent[agentId] : undefined;
                const taskCounts = agentId ? taskCountsByAgent[agentId] : undefined;
                return (
                  <DashboardAgentCard
                    key={agentId ?? idx}
                    agentId={agentId}
                    name={name}
                    role={(agent.role as "pm" | "backend" | "frontend") ?? "pm"}
                    status={(agent.status as "online" | "idle" | "offline" | "busy") ?? "offline"}
                    avatar={(agent.avatar as string) ?? "?"}
                    lastHeartbeat={lastHeartbeat}
                    lastActivityAt={lastActivityAt}
                    unreadCount={unreadCount}
                    taskCounts={taskCounts}
                    fallbackCurrentTask={fallbackCurrentTask}
                  />
                );
              })}
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <ActivityFeed activities={activitiesList} />
          </div>
      </div>
    </div>
  );
}
