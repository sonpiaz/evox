"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type KanbanStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

const priorityColors: Record<Priority, string> = {
  urgent: "border-l-red-700",
  high: "border-l-green-700",
  medium: "border-l-yellow-500",
  low: "border-l-gray-700",
};

export interface KanbanTask {
  id: string;
  title: string;
  status: KanbanStatus;
  priority: Priority;
  assigneeId?: string;
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
  onAssigneeClick?: (agentId: string) => void;
}

export function TaskCard({ task, onClick, onAssigneeClick }: TaskCardProps) {
  const priority = (task.priority ?? "low") as Priority;
  const barColor = priorityColors[priority] ?? priorityColors.low;

  const handleAssigneeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.assigneeId && onAssigneeClick) onAssigneeClick(task.assigneeId);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border border-border-default bg-surface-1 p-4 text-left transition-colors hover:border-border-hover hover:bg-surface-2",
        "border-l-4",
        barColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary">{task.title}</p>
          {task.linearIdentifier && (
            <a
              href={task.linearUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-xs text-secondary hover:text-secondary whitespace-nowrap"
            >
              {task.linearIdentifier}
            </a>
          )}
        </div>
        {task.assigneeAvatar && (
          <span
            role={onAssigneeClick && task.assigneeId ? "button" : undefined}
            onClick={onAssigneeClick && task.assigneeId ? handleAssigneeClick : undefined}
            className={cn(
              "shrink-0",
              onAssigneeClick && task.assigneeId && "cursor-pointer rounded hover:ring-1 hover:ring-border-hover"
            )}
            title={onAssigneeClick && task.assigneeId ? `Open ${task.assigneeName ?? "agent"}` : undefined}
          >
            <Avatar className="h-6 w-6 border border-border-default">
              <AvatarFallback className="bg-surface-4 text-[10px] text-primary">{task.assigneeAvatar}</AvatarFallback>
            </Avatar>
          </span>
        )}
      </div>
      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs text-secondary">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {task.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-surface-4 px-1.5 py-0.5 text-xs text-secondary">
            {tag}
          </span>
        ))}
        {task.updatedAt != null && (
          <span className="text-xs text-secondary">{formatDistanceToNow(task.updatedAt, { addSuffix: true })}</span>
        )}
      </div>
    </button>
  );
}
