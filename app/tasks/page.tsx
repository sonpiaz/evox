"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TaskBoard } from "@/components/task-board";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

/** Map Convex task status to TaskBoard column (review → in_progress) */
function toBoardStatus(
  status: "backlog" | "todo" | "in_progress" | "review" | "done"
): TaskStatus {
  return status === "review" ? "in_progress" : status;
}

/** Map Convex priority to TaskBoard (urgent → high) */
function toBoardPriority(
  priority: "low" | "medium" | "high" | "urgent"
): TaskPriority {
  return priority === "urgent" ? "high" : priority;
}

export default function TasksPage() {
  const projects = useQuery(api.projects.list);
  const evoxProjectId = useMemo(
    () => projects?.find((p: { name: string; _id: string }) => p.name === "EVOX")?._id,
    [projects]
  );
  const rawTasks = useQuery(
    api.tasks.list,
    evoxProjectId ? { projectId: evoxProjectId } : "skip"
  );
  const agents = useQuery(api.agents.list);

  type TaskStatusType = "backlog" | "todo" | "in_progress" | "review" | "done";
  type TaskPriorityType = "low" | "medium" | "high" | "urgent";
  interface RawAgent { _id: string; name?: string; avatar?: string }
  interface RawTask { _id: string; title: string; status: TaskStatusType; priority: TaskPriorityType; assignee?: string; linearIdentifier?: string }

  const tasks = useMemo(() => {
    if (!rawTasks || !agents) return [];
    const agentMap = new Map((agents as RawAgent[]).map((a) => [a._id, a]));
    return (rawTasks as RawTask[]).map((t) => {
      const assignee = t.assignee ? agentMap.get(t.assignee) : undefined;
      return {
        id: t._id,
        _id: t._id as Id<"tasks">,
        title: t.title,
        status: toBoardStatus(t.status),
        priority: toBoardPriority(t.priority),
        assigneeId: t.assignee,
        assigneeName: assignee?.name,
        assigneeAvatar: assignee?.avatar,
        labels: t.linearIdentifier ? [t.linearIdentifier] : [],
      };
    });
  }, [rawTasks, agents]);

  return (
    <div className="h-full bg-black p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-50">Tasks</h1>
        <p className="text-sm text-zinc-500">
          Track and manage team tasks (synced from Linear — use Sync Now on Standup to refresh)
        </p>
      </div>
      <TaskBoard tasks={tasks} agents={agents} />
    </div>
  );
}
