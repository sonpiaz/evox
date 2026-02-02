"use client";

import { useState, useMemo } from "react";
import { KanbanBoard } from "./kanban-board";
import type { KanbanTask } from "./task-card";
import { DateFilter, type DateFilterMode } from "./date-filter";
/** AGT-151: Mock kanban tasks until AGT-150 (Sam's issues.getByStatus) lands */
function useMockKanbanTasks(): KanbanTask[] {
  return useMemo(
    () => [
      { id: "1", title: "Unified dashboard v2 API", status: "in_progress", priority: "high", assigneeAvatar: "SM", assigneeName: "Sam", linearIdentifier: "AGT-150", updatedAt: Date.now() - 3600000, tags: ["backend"], description: "Backend API for kanban issues by status. Wire Mission Queue to real Convex queries." },
      { id: "2", title: "Mission Control layout", status: "todo", priority: "high", assigneeAvatar: "LO", assigneeName: "Leo", linearIdentifier: "AGT-151", updatedAt: Date.now() - 7200000, tags: ["frontend"], description: "3-column grid, AgentPanel, MissionQueue, DetailPanel. TopBar with EVOX COMMAND CENTER." },
      { id: "3", title: "Activity feed real-time", status: "review", priority: "medium", assigneeAvatar: "LO", updatedAt: Date.now() - 1800000, tags: ["frontend"], description: "Live feed from activityEvents. Real-time updates in DetailPanel." },
      { id: "4", title: "Agent profile SOUL display", status: "done", priority: "low", assigneeAvatar: "SM", updatedAt: Date.now() - 86400000, tags: ["backend"], description: "Display agent SOUL/state in profile. Backend support for agent detail." },
    ],
    []
  );
}

interface MissionQueueProps {
  onTaskClick?: (task: KanbanTask) => void;
  date: Date;
  dateMode: DateFilterMode;
  onDateModeChange: (mode: DateFilterMode) => void;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function MissionQueue({
  onTaskClick,
  date,
  dateMode,
  onDateModeChange,
  onDateChange,
  className = "",
}: MissionQueueProps) {
  const tasks = useMockKanbanTasks();

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
        <h2 className="text-sm font-semibold text-zinc-50">Mission Queue</h2>
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
      <div className="flex-1 overflow-hidden">
        <KanbanBoard tasks={tasks} onTaskClick={onTaskClick} />
      </div>
    </div>
  );
}
