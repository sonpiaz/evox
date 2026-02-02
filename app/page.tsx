"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NotificationTopBarWrapper } from "@/components/notification-topbar-wrapper";
import { MissionQueue } from "@/components/dashboard-v2/mission-queue";
import { SettingsModal } from "@/components/dashboard-v2/settings-modal";
import { ActivityPage } from "@/components/dashboard-v2/activity-page";
import { AgentSidebar } from "@/components/dashboard-v2/agent-sidebar";
import { ContextPanel } from "@/components/dashboard-v2/context-panel";
import { AgentDetailSlidePanel } from "@/components/dashboard-v2/agent-detail-slide-panel";
import { TaskDetailSlidePanel } from "@/components/dashboard-v2/task-detail-slide-panel";
import type { KanbanTask } from "@/components/dashboard-v2/task-card";
import type { DateFilterMode } from "@/components/dashboard-v2/date-filter";

/** AGT-172: 3-panel layout — [Sidebar 200px] | [Kanban flex-1] | [Context Panel 400px] */
export default function Home() {
  const [date, setDate] = useState(new Date());
  const [dateMode, setDateMode] = useState<DateFilterMode>("day");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const agents = useQuery(api.agents.list);
  const dashboardStats = useQuery(api.dashboard.getStats);

  const agentsList = useMemo(() => {
    if (!Array.isArray(agents) || agents.length === 0) return [];
    return agents as { _id: Id<"agents">; name: string; role: string; status: string; avatar: string; lastSeen?: number }[];
  }, [agents]);

  const activeCount = useMemo(
    () => agentsList.filter((a) => ["online", "busy"].includes((a.status ?? "").toLowerCase())).length,
    [agentsList]
  );

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agentsList.find((a) => a._id === selectedAgentId) ?? null;
  }, [selectedAgentId, agentsList]);

  const taskCounts = dashboardStats?.taskCounts ?? { backlog: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const inProgressCount = (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0);
  const doneCount = taskCounts.done ?? 0;
  const totalTaskCount =
    (taskCounts.backlog ?? 0) + (taskCounts.todo ?? 0) + (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0) + doneCount;

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      <NotificationTopBarWrapper
        agentsActive={activeCount}
        tasksInQueue={taskCounts.todo ?? 0}
        inProgress={inProgressCount}
        doneToday={doneCount}
        totalTasks={totalTaskCount}
        onSettingsClick={() => setSettingsOpen(true)}
        onNotificationClick={(_, taskSummary) => {
          if (taskSummary?.id) {
            setSelectedTask({
              id: taskSummary.id,
              title: taskSummary.title ?? "",
              status: (taskSummary.status as KanbanTask["status"]) ?? "todo",
              priority: (taskSummary.priority as KanbanTask["priority"]) ?? "medium",
              linearIdentifier: taskSummary.linearIdentifier,
              linearUrl: taskSummary.linearUrl,
            });
          }
        }}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AgentSidebar selectedAgentId={selectedAgentId} onAgentClick={(id) => setSelectedAgentId(id)} />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <MissionQueue
            date={date}
            dateMode={dateMode}
            onDateModeChange={setDateMode}
            onDateChange={setDate}
            onTaskClick={(t) => setSelectedTask(t)}
            onAssigneeClick={(id) => setSelectedAgentId(id as Id<"agents">)}
          />
        </main>
        <ContextPanel>
          <ActivityPage />
        </ContextPanel>
      </div>

      <AgentDetailSlidePanel
        open={!!selectedAgentId && !!selectedAgent}
        agentId={selectedAgentId}
        name={selectedAgent?.name ?? ""}
        role={selectedAgent?.role ?? ""}
        status={selectedAgent?.status ?? ""}
        avatar={selectedAgent?.avatar ?? ""}
        onClose={() => setSelectedAgentId(null)}
      />

      <TaskDetailSlidePanel
        open={!!selectedTask}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
