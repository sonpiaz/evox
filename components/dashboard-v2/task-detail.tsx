"use client";

import type { KanbanTask } from "./task-card";
import { TaskCommentThread } from "./task-comment-thread";
import { Id } from "@/convex/_generated/dataModel";

interface TaskDetailProps {
  task: KanbanTask;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const taskId = task.id as Id<"tasks">;

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-50">Task Detail</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-50"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="space-y-4 shrink-0">
        <div>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">Title</h4>
          <p className="mt-1 text-sm text-zinc-50">{task.title}</p>
          {task.linearIdentifier && (
            <a href={task.linearUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#888] hover:text-zinc-400">
              {task.linearIdentifier}
            </a>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">Assignee</h4>
          <p className="mt-1 text-sm text-zinc-400">{task.assigneeName ?? "—"}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-zinc-500">Quick actions</h4>
          <div className="mt-2 flex gap-2">
            <a
              href={task.linearUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
            >
              Open in Linear
            </a>
          </div>
        </div>
      </div>
      {/* AGT-114: Comment thread — bottom section, chat-style */}
      <div className="mt-4 flex-1 min-h-0 flex flex-col">
        <TaskCommentThread taskId={taskId} />
      </div>
    </div>
  );
}
