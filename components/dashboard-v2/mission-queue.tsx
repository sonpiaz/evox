"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KanbanBoard } from "./kanban-board";
import type { KanbanTask } from "./task-card";
import { DateFilter, type DateFilterMode } from "./date-filter";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from "date-fns";

/**
 * AGT-158: Wire MissionQueue to real Convex data (tasks.getGroupedByStatus)
 * - Backlog, Todo, In Progress, Review: show all tasks (no date filter)
 * - Done: filter by date range based on dateMode
 */

interface MissionQueueProps {
  onTaskClick?: (task: KanbanTask) => void;
  onAssigneeClick?: (agentId: string) => void;
  date: Date;
  dateMode: DateFilterMode;
  onDateModeChange: (mode: DateFilterMode) => void;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function MissionQueue({
  onTaskClick,
  onAssigneeClick,
  date,
  dateMode,
  onDateModeChange,
  onDateChange,
  className = "",
}: MissionQueueProps) {
  // Calculate date range for DONE column based on dateMode
  const { startTs, endTs } = useMemo(() => {
    if (dateMode === "day") {
      return {
        startTs: startOfDay(date).getTime(),
        endTs: endOfDay(date).getTime(),
      };
    } else if (dateMode === "week") {
      return {
        startTs: startOfWeek(date, { weekStartsOn: 1 }).getTime(),
        endTs: endOfWeek(date, { weekStartsOn: 1 }).getTime(),
      };
    } else {
      // 30 days
      const currentEnd = new Date().getTime();
      return {
        startTs: subDays(new Date(), 30).getTime(),
        endTs: currentEnd,
      };
    }
  }, [date, dateMode]);

  // Fetch tasks grouped by status with date filtering for DONE column
  const groupedTasks = useQuery(api.tasks.getGroupedByStatus, {
    startTs,
    endTs,
  });

  // Fetch agents for assignee display
  const agents = useQuery(api.agents.list);

  // Transform Convex tasks to KanbanTask format
  const tasks: KanbanTask[] = useMemo(() => {
    if (!groupedTasks) return [];

    type Agent = { _id: string; name: string };
    const agentMap = new Map<string, Agent>(
      (agents ?? []).map((a: Agent) => [a._id, a])
    );

    const allTasks = [
      ...groupedTasks.backlog,
      ...groupedTasks.todo,
      ...groupedTasks.inProgress,
      ...groupedTasks.review,
      ...groupedTasks.done,
    ];

    return allTasks.map((task) => {
      const assignee = task.assignee ? agentMap.get(task.assignee) : null;
      return {
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assignee,
        assigneeAvatar: assignee?.name?.slice(0, 2).toUpperCase(),
        assigneeName: assignee?.name,
        linearIdentifier: task.linearIdentifier,
        linearUrl: task.linearUrl,
        updatedAt: task.updatedAt,
        description: task.description?.slice(0, 200),
      };
    });
  }, [groupedTasks, agents]);

  const goToPrev = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onDateChange(d);
  };
  const goToNext = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    onDateChange(d);
  };
  const goToToday = () => onDateChange(new Date());

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-primary">Mission Queue</h2>
        <DateFilter
          mode={dateMode}
          onModeChange={onDateModeChange}
          date={date}
          onPrev={goToPrev}
          onNext={goToNext}
          onGoToToday={goToToday}
          showArrows={dateMode === "day"}
        />
      </div>
      {/* AGT-184: Analytics panel moved inside KanbanBoard (right side) */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard tasks={tasks} onTaskClick={onTaskClick} onAssigneeClick={onAssigneeClick} />
      </div>
    </div>
  );
}
