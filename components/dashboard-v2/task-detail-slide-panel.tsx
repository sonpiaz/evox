"use client";

import { TaskDetail } from "./task-detail";
import type { KanbanTask } from "./task-card";
import { cn } from "@/lib/utils";

interface TaskDetailSlidePanelProps {
  open: boolean;
  task: KanbanTask | null;
  onClose: () => void;
}

/** AGT-114: Task detail slide from right, 420px, backdrop, 200ms ease-out */
export function TaskDetailSlidePanel({ open, task, onClose }: TaskDetailSlidePanelProps) {
  if (!task) return null;

  return (
    <>
      <div
        role="presentation"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ease-out",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[420px] shrink-0 border-l border-border-default bg-surface-1 shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="flex h-full flex-col min-h-0">
          <TaskDetail task={task} onClose={onClose} />
        </div>
      </div>
    </>
  );
}
