"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type KanbanStatus = "todo" | "in_progress" | "review" | "done";
type Priority = "low" | "medium" | "high";

const priorityColors: Record<Priority, string> = {
  high: "border-l-green-500",
  medium: "border-l-yellow-500",
  low: "border-l-gray-500",
};

export interface KanbanTask {
  id: string;
  title: string;
  status: KanbanStatus;
  priority: Priority;
  assigneeAvatar?: string;
  assigneeName?: string;
  linearIdentifier?: string;
  linearUrl?: string;
  updatedAt?: number;
  tags?: string[];
  description?: string;
}

interface TaskCardProps {
  task: KanbanTask;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = (task.priority ?? "low") as Priority;
  const barColor = priorityColors[priority] ?? priorityColors.low;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-gray-800 bg-[#0a0a0a] p-4 text-left transition-colors hover:border-gray-700 hover:bg-gray-800/50",
        "border-l-4",
        barColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-50">{task.title}</p>
          {task.linearIdentifier && (
            <a
              href={task.linearUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              {task.linearIdentifier}
            </a>
          )}
        </div>
        {task.assigneeAvatar && (
          <Avatar className="h-6 w-6 shrink-0 border border-gray-700">
            <AvatarFallback className="bg-gray-800 text-[10px] text-zinc-50">{task.assigneeAvatar}</AvatarFallback>
          </Avatar>
        )}
      </div>
      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs text-gray-400">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">
            {tag}
          </span>
        ))}
        {task.updatedAt != null && (
          <span className="text-xs text-gray-500">{formatDistanceToNow(task.updatedAt, { addSuffix: true })}</span>
        )}
      </div>
    </button>
  );
}
