"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  labels?: string[];
}

interface TaskBoardProps {
  tasks: Task[];
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: "backlog", title: "Backlog" },
  { status: "todo", title: "Todo" },
  { status: "in_progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

const priorityColors: Record<TaskPriority, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-500",
  medium: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-500",
};

function TaskCard({ task }: { task: Task }) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors cursor-pointer">
        <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-zinc-50 line-clamp-2">{task.title}</h4>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <Badge
                  key={label}
                  variant="outline"
                  className="text-xs border-zinc-700 bg-zinc-800/50 text-zinc-400"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Priority + Assignee */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn("text-xs", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>

          {task.assigneeAvatar && (
            <Avatar className="h-6 w-6 border border-zinc-800">
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                {task.assigneeAvatar}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.status);
        return (
          <div key={column.status} className="space-y-4">
            {/* Column Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                {column.title}
              </h3>
              <Badge
                variant="outline"
                className="text-xs border-zinc-700 bg-zinc-800/50 text-zinc-500"
              >
                {columnTasks.length}
              </Badge>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} />)
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                  <p className="text-xs text-zinc-600">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
