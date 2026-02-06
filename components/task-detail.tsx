"use client";

import { StatusDropdown } from "@/components/status-dropdown";
import { PriorityBadge } from "@/components/priority-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type Priority = "p1" | "p2" | "p3" | "p4";

interface TaskDetailProps {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: {
    name: string;
    avatar: string;
    color: "blue" | "green" | "purple";
  };
  description?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
  onStatusChange?: (status: TaskStatus) => void;
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export function TaskDetail({
  id,
  title,
  status,
  priority,
  assignee,
  description,
  labels,
  createdAt,
  updatedAt,
  onStatusChange,
}: TaskDetailProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-sm text-primary0">{id.toUpperCase()}</span>
          </div>

          <h1 className="text-3xl font-bold text-primary">{title}</h1>

          {/* Meta row */}
          <div className="flex items-center gap-4">
            <StatusDropdown value={status} onChange={onStatusChange} />
            <PriorityBadge priority={priority} />

            {assignee && (
              <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-1/50 px-3 py-1.5">
                <Avatar className={`h-5 w-5 border ${colorClasses[assignee.color]}`}>
                  <AvatarFallback
                    className={`text-xs text-white ${colorClasses[assignee.color]}`}
                  >
                    {assignee.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-secondary">{assignee.name}</span>
              </div>
            )}
          </div>

          {/* Labels */}
          {labels && labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="border-gray-500 bg-surface-4/50 text-secondary"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-secondary">Description</h2>
          {description ? (
            <div className="rounded-lg border border-border-default bg-surface-1/50 p-4">
              <p className="text-sm text-primary whitespace-pre-wrap">{description}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-default p-8 text-center">
              <p className="text-sm text-tertiary">No description provided</p>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex gap-6 border-t border-border-default pt-4 text-xs text-tertiary">
          <div>
            <span>Created:</span> <span className="text-primary0">{formatDate(createdAt)}</span>
          </div>
          <div>
            <span>Updated:</span> <span className="text-primary0">{formatDate(updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
