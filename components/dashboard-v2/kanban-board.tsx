"use client";

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
      return tasks.filter((t) => t.status === "in_progress" || t.status === "review");
    }
    return tasks.filter((t) => t.status === status);
  };

  return (
    <div className={cn("flex h-full gap-4 overflow-x-auto pb-4", className)}>
      {COLUMNS.map((col) => {
        const columnTasks = byStatus(col.status);
        const isEmpty = columnTasks.length === 0;
        const isDone = col.status === "done";
        return (
          <div
            key={col.status}
            className="flex w-64 shrink-0 flex-col rounded-lg border border-gray-800 bg-[#0a0a0a]"
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">{col.title}</h3>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">{columnTasks.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-0">
              {isEmpty && isDone ? (
                <p className="py-6 text-center text-xs text-gray-500">No completed tasks</p>
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
    </div>
  );
}
