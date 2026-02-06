"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from "date-fns";
import { NotificationTopBarWrapper } from "@/components/notification-topbar-wrapper";
import { MissionQueue } from "@/components/dashboard-v2/mission-queue";
import { SettingsModal } from "@/components/dashboard-v2/settings-modal";
import { AgentSettingsModal } from "@/components/evox/AgentSettingsModal";
import { ShortcutsHelpModal } from "@/components/evox/ShortcutsHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { AgentDetailSlidePanel } from "@/components/dashboard-v2/agent-detail-slide-panel";
import { ActivityDrawer } from "@/components/dashboard-v2/activity-drawer";
import { TaskDetailModal } from "@/components/dashboard-v2/task-detail-modal";
import { ViewTabs, type MainViewTab } from "@/components/evox/ViewTabs";
import { CommunicationLog } from "@/components/evox/CommunicationLog";
import { CEODashboard, type TimeRange } from "@/components/evox/CEODashboard";
import { HallOfFame } from "@/components/evox/HallOfFame";
import type { KanbanTask } from "@/components/dashboard-v2/task-card";
import type { DateFilterMode } from "@/components/dashboard-v2/date-filter";
import { sortAgents, AGENT_ORDER } from "@/lib/constants";

/** AGT-181: 2-panel layout — [Sidebar 220px] | [Kanban flex-1]. Agent Profile → Modal, Activity → Drawer */
export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [date, setDate] = useState(new Date());
  const [dateMode, setDateMode] = useState<DateFilterMode>("day");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [agentSettingsId, setAgentSettingsId] = useState<Id<"agents"> | null>(null);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [overviewTimeRange, setOverviewTimeRange] = useState<TimeRange>("1d");
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view") as MainViewTab | null;
  const activeViewTab: MainViewTab = viewParam && ["ceo", "kanban", "comms", "team"].includes(viewParam) ? viewParam : "ceo";
  const setActiveViewTab = useCallback((tab: MainViewTab) => {
    router.replace(`/?view=${tab}`, { scroll: false });
  }, [router]);

  const agents = useQuery(api.agents.list);

  // Calculate date range for top bar stats — adapts to active view
  const { startTs, endTs } = useMemo(() => {
    if (activeViewTab === "ceo") {
      // Overview: use overview time range
      const daysBack = overviewTimeRange === "1d" ? 1 : overviewTimeRange === "7d" ? 7 : 30;
      const now = new Date();
      return {
        startTs: daysBack === 1 ? startOfDay(now).getTime() : subDays(now, daysBack).getTime(),
        endTs: now.getTime(),
      };
    }
    // Kanban and other views: use kanban dateMode
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
      const now = new Date();
      return {
        startTs: subDays(now, 30).getTime(),
        endTs: now.getTime(),
      };
    }
  }, [date, dateMode, activeViewTab, overviewTimeRange]);

  const dashboardStats = useQuery(api.dashboard.getStats, { startTs, endTs });

  const agentsList = useMemo(() => {
    if (!Array.isArray(agents) || agents.length === 0) return [];
    const active = (agents as { _id: Id<"agents">; name: string; role: string; status: string; avatar: string; lastSeen?: number }[])
      .filter((a) => (AGENT_ORDER as readonly string[]).includes(a.name.toLowerCase()));
    return sortAgents(active);
  }, [agents]);

  const activeCount = useMemo(
    () => agentsList.filter((a) => ["online", "busy"].includes((a.status ?? "").toLowerCase())).length,
    [agentsList]
  );

  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    return agentsList.find((a) => a._id === selectedAgentId) ?? null;
  }, [selectedAgentId, agentsList]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    agents: agentsList,
    onAgentSwitch: (agentId) => setSelectedAgentId(agentId),
    onToggleScratchPad: () => {},
    onToggleHelp: () => setShortcutsHelpOpen((prev) => !prev),
    onCloseModals: () => {
      setSelectedAgentId(null);
      setSelectedTask(null);
      setAgentSettingsId(null);
      setShortcutsHelpOpen(false);
      setSettingsOpen(false);
      setActivityDrawerOpen(false);
    },
    onViewTabChange: setActiveViewTab,
  });

  const handleAgentClick = (agentId: Id<"agents">) => {
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null);
    } else {
      setSelectedAgentId(agentId);
    }
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
  };

  const taskCounts = dashboardStats?.taskCounts ?? { backlog: 0, todo: 0, inProgress: 0, review: 0, done: 0 };
  const inProgressCount = (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0);
  const doneCount = taskCounts.done ?? 0;
  const totalTaskCount =
    (taskCounts.backlog ?? 0) + (taskCounts.todo ?? 0) + (taskCounts.inProgress ?? 0) + (taskCounts.review ?? 0) + doneCount;

  return (
    <div className="flex h-screen flex-col bg-base">
      <NotificationTopBarWrapper
        agentsActive={activeCount}
        tasksInQueue={taskCounts.todo ?? 0}
        inProgress={inProgressCount}
        doneToday={doneCount}
        totalTasks={totalTaskCount}
        onSettingsClick={() => setSettingsOpen(true)}
        onBellClick={() => setActivityDrawerOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ActivityDrawer open={activityDrawerOpen} onClose={() => setActivityDrawerOpen(false)} />
      <TaskDetailModal open={selectedTask !== null} task={selectedTask} onClose={() => setSelectedTask(null)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ViewTabs activeTab={activeViewTab} onTabChange={setActiveViewTab} />
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeViewTab === "ceo" && (
              <CEODashboard
                className="h-full"
                timeRange={overviewTimeRange}
                onTimeRangeChange={setOverviewTimeRange}
                onAgentClick={(name) => {
                  const agent = agentsList.find(a => a.name.toLowerCase() === name.toLowerCase());
                  if (agent) handleAgentClick(agent._id);
                }}
              />
            )}
            {activeViewTab === "kanban" && (
              <MissionQueue
                date={date}
                dateMode={dateMode}
                onDateModeChange={setDateMode}
                onDateChange={setDate}
                onTaskClick={handleTaskClick}
                onAssigneeClick={(id) => handleAgentClick(id as Id<"agents">)}
              />
            )}
            {activeViewTab === "comms" && (
              <CommunicationLog className="h-full" />
            )}
            {activeViewTab === "team" && (
              <HallOfFame
                className="h-full"
                onAgentClick={(name) => {
                  const agent = agentsList.find(a => a.name.toLowerCase() === name.toLowerCase());
                  if (agent) handleAgentClick(agent._id);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {selectedAgent && (
        <AgentDetailSlidePanel
          open={selectedAgentId !== null}
          agentId={selectedAgent._id}
          name={selectedAgent.name}
          role={selectedAgent.role}
          status={selectedAgent.status}
          avatar={selectedAgent.avatar}
          onClose={() => setSelectedAgentId(null)}
        />
      )}

      <AgentSettingsModal
        open={agentSettingsId !== null}
        agentId={agentSettingsId}
        onClose={() => setAgentSettingsId(null)}
      />

      <ShortcutsHelpModal
        open={shortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
      />
    </div>
  );
}
