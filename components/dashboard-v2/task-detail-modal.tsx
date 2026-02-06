"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommentThreadV2 } from "@/components/evox/CommentThreadV2";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanbanTask } from "./task-card";

interface TaskDetailModalProps {
  open: boolean;
  task: KanbanTask | null;
  onClose: () => void;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  done: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  in_progress: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  review: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  todo: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  backlog: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
};

const priorityLabels: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** AGT-181 fix: Ticket Detail Modal — opens on task card click */
export function TaskDetailModal({ open, task, onClose }: TaskDetailModalProps) {
  const taskId = task?.id as Id<"tasks"> | undefined;
  const fullTask = useQuery(
    api.tasks.get,
    taskId ? { id: taskId } : "skip"
  );

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open || !task) return null;

  const status = (task.status ?? "todo").toLowerCase();
  const statusStyle = statusColors[status] ?? statusColors.todo;
  const createdAt = fullTask?.createdAt ?? null;
  const updatedAt = task.updatedAt ?? fullTask?.updatedAt ?? null;
  const isCompleted = status === "done";
  const completedAt = isCompleted ? updatedAt : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-[700px] overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              {task.linearIdentifier && (
                <span className={cn("font-mono text-sm font-semibold whitespace-nowrap", statusStyle.text)}>
                  {task.linearIdentifier}
                </span>
              )}
              <span
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border
                )}
              >
                {status.replace("_", " ")}
              </span>
              {task.priority && (
                <span className="text-xs text-white/40">{priorityLabels[task.priority] ?? task.priority}</span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white/90 truncate" title={task.title}>
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded p-1 text-white/40 transition-colors hover:text-white/90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
          {/* Assignee */}
          {task.assigneeName && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Assignee</h3>
              <div className="flex items-center gap-2">
                {task.assigneeAvatar && (
                  <Avatar className="h-6 w-6 border border-white/[0.08]">
                    <AvatarFallback className="bg-white/[0.05] text-xs text-white/70">
                      {task.assigneeAvatar}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm text-white/70">{task.assigneeName}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Description</h3>
            <p className="text-sm text-white/60 whitespace-pre-wrap">
              {task.description || fullTask?.description || "—"}
            </p>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4">
            {createdAt && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">Created</h3>
                <p className="text-xs text-white/50">{formatDistanceToNow(createdAt, { addSuffix: true })}</p>
              </div>
            )}
            {updatedAt && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1">
                  {isCompleted ? "Completed" : "Updated"}
                </h3>
                <p className="text-xs text-white/50">{formatDistanceToNow(updatedAt, { addSuffix: true })}</p>
              </div>
            )}
          </div>

          {/* Linear Link */}
          {task.linearUrl && (
            <div>
              <a
                href={task.linearUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white/90"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Linear
              </a>
            </div>
          )}

          {/* Comments */}
          {taskId && (
            <div className="border-t border-white/[0.08] pt-4">
              <CommentThreadV2 taskId={taskId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
