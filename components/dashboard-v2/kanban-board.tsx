"use client";

import { useMemo } from "react";
import { TaskCard } from "./task-card";
import type { KanbanTask } from "./task-card";

export type { KanbanTask };
import { cn } from "@/lib/utils";

/** AGT-172: 4 columns only — REVIEW removed (Son reviews in conversation) */
type KanbanStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

const COLUMNS: { status: KanbanStatus; title: string }[] = [
  { status: "backlog", title: "BACKLOG" },
  { status: "todo", title: "TODO" },
  { status: "in_progress", title: "IN PROGRESS" },
  { status: "done", title: "DONE" },
];

interface KanbanBoardProps {
  tasks: KanbanTask[];
  onTaskClick?: (task: KanbanTask) => void;
  onAssigneeClick?: (agentId: string) => void;
  className?: string;
}

export function KanbanBoard({ tasks, onTaskClick, onAssigneeClick, className = "" }: KanbanBoardProps) {
  const byStatus = (status: KanbanStatus) => {
    if (status === "in_progress") {
      return tasks.filter((t) => t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review");
    }
    return tasks.filter((t) => t.status?.toLowerCase() === status.toLowerCase());
  };

  // AGT-184: Calculate counts for analytics panel (right side)
  const counts = useMemo(() => {
    const backlog = tasks.filter((t) => t.status?.toLowerCase() === "backlog").length;
    const todo = tasks.filter((t) => t.status?.toLowerCase() === "todo").length;
    const inProgress = tasks.filter((t) => t.status?.toLowerCase() === "in_progress" || t.status?.toLowerCase() === "review").length;
    const done = tasks.filter((t) => t.status?.toLowerCase() === "done").length;
    const total = backlog + todo + inProgress + done;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { backlog, todo, inProgress, done, total, completionRate };
  }, [tasks]);

  return (
    <div className={cn("flex h-full gap-4 overflow-x-auto pb-4", className)}>
      {COLUMNS.map((col) => {
        const columnTasks = byStatus(col.status);
        const isEmpty = columnTasks.length === 0;
        const isDone = col.status?.toLowerCase() === "done";
        return (
          <div
            key={col.status}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-border-hover bg-base"
          >
            <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-primary">{col.title}</h3>
              <span className="rounded-full bg-surface-4 px-2 py-0.5 text-xs text-primary tabular-nums">{columnTasks.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-0">
              {isEmpty && isDone ? (
                <p className="py-6 text-center text-xs text-tertiary">No completed tasks</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                    onAssigneeClick={onAssigneeClick}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* AGT-184: Analytics panel — right side, shows all status counts */}
      <div className="flex w-48 shrink-0 flex-col rounded-lg border border-border-hover bg-base">
        <div className="border-b border-border-default px-3 py-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-secondary">Analytics</h3>
        </div>
        <div className="flex-1 space-y-3 p-3">
          {/* Completion Rate */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">Completion</span>
            <div className="mt-1 text-2xl font-semibold text-amber-400">{counts.completionRate}%</div>
            <div className="text-xs text-tertiary">({counts.done}/{counts.total})</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
                style={{ width: `${Math.min(100, counts.completionRate)}%` }}
              />
            </div>
          </div>

          {/* Status Counts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">In Progress</span>
              </div>
              <span className="text-lg font-semibold text-blue-400">{counts.inProgress}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">Queue</span>
              </div>
              <span className="text-lg font-semibold text-yellow-400">{counts.todo}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/50" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">Backlog</span>
              </div>
              <span className="text-lg font-semibold text-white/60">{counts.backlog}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-secondary">Done</span>
              </div>
              <span className="text-lg font-semibold text-green-400">{counts.done}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
