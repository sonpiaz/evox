"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import { AgentPanel } from "@/components/dashboard-v2/agent-panel";
import { MissionQueue } from "@/components/dashboard-v2/mission-queue";
import { DetailPanel, type DetailPanelMode } from "@/components/dashboard-v2/detail-panel";
import { SettingsModal } from "@/components/dashboard-v2/settings-modal";
import type { KanbanTask } from "@/components/dashboard-v2/task-card";
import type { DateFilterMode } from "@/components/dashboard-v2/date-filter";

/** AGT-152: Root route = single unified Mission Control dashboard. No sidebar, full-width 280|1fr|400. */
export default function Home() {
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [detailMode, setDetailMode] = useState<DetailPanelMode>("livefeed");
  const [date, setDate] = useState(new Date());
  const [dateMode, setDateMode] = useState<DateFilterMode>("day");
  const [mobileTab, setMobileTab] = useState<"queue" | "agents" | "feed">("queue");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const agents = useQuery(api.agents.list);
  const agentDetail = useQuery(
    api.agents.get,
    selectedAgentId ? { id: selectedAgentId } : "skip"
  );

  const agentsList = useMemo(() => {
    if (!Array.isArray(agents) || agents.length === 0) return [];
    return agents as { _id: Id<"agents">; name: string; role: string; status: string; avatar: string; lastSeen?: number }[];
  }, [agents]);

  const activeCount = useMemo(
    () => agentsList.filter((a) => ["online", "busy"].includes((a.status ?? "").toLowerCase())).length,
    [agentsList]
  );

  const handleSelectAgent = (id: Id<"agents"> | null) => {
    setSelectedAgentId(id);
    setSelectedTask(null);
    setDetailMode(id ? "agent" : "livefeed");
  };

  const handleSelectTask = (task: KanbanTask | null) => {
    setSelectedTask(task);
    if (task) {
      setSelectedAgentId(null);
      setDetailMode("task");
    } else {
      setDetailMode("livefeed");
    }
  };

  const handleCloseDetail = () => {
    setSelectedAgentId(null);
    setSelectedTask(null);
    setDetailMode("livefeed");
  };

  const agentForProfile = detailMode === "agent" && selectedAgentId && agentDetail
    ? {
        _id: selectedAgentId,
        name: (agentDetail as { name?: string }).name ?? "Unknown",
        role: (agentDetail as { role?: string }).role ?? "—",
        status: (agentDetail as { status?: string }).status ?? "offline",
        avatar: (agentDetail as { avatar?: string }).avatar ?? "?",
      }
    : null;

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      <TopBar
        agentsActive={activeCount}
        tasksInQueue={4}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Desktop/tablet: 3-column grid 280px | 1fr | 400px */}
      <div className="hidden flex-1 overflow-hidden md:grid md:grid-cols-[280px_1fr_400px]">
        <AgentPanel
          agents={agentsList}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgent}
        />
        <div className="min-w-0 overflow-hidden">
          <MissionQueue
            onTaskClick={handleSelectTask}
            date={date}
            dateMode={dateMode}
            onDateModeChange={setDateMode}
            onDateChange={setDate}
          />
        </div>
        <div className="w-[400px] overflow-hidden">
          <DetailPanel
            mode={detailMode}
            selectedAgentId={selectedAgentId}
            selectedTask={selectedTask}
            agent={agentForProfile}
            onClose={handleCloseDetail}
          />
        </div>
      </div>

      {/* Mobile: 1 column with tabs — Queue | Agents | Feed */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        <div className="flex border-b border-gray-800 bg-[#0a0a0a]">
          <button
            type="button"
            onClick={() => setMobileTab("queue")}
            className={`flex-1 py-2 text-xs font-medium ${mobileTab === "queue" ? "border-b-2 border-zinc-50 text-zinc-50" : "text-zinc-500"}`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("agents")}
            className={`flex-1 py-2 text-xs font-medium ${mobileTab === "agents" ? "border-b-2 border-zinc-50 text-zinc-50" : "text-zinc-500"}`}
          >
            Agents
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("feed")}
            className={`flex-1 py-2 text-xs font-medium ${mobileTab === "feed" ? "border-b-2 border-zinc-50 text-zinc-50" : "text-zinc-500"}`}
          >
            Feed
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {mobileTab === "queue" && (
            <MissionQueue
              onTaskClick={handleSelectTask}
              date={date}
              dateMode={dateMode}
              onDateModeChange={setDateMode}
              onDateChange={setDate}
            />
          )}
          {mobileTab === "agents" && (
            <div className="h-full overflow-y-auto">
              <AgentPanel
                agents={agentsList}
                selectedAgentId={selectedAgentId}
                onSelectAgent={handleSelectAgent}
              />
            </div>
          )}
          {mobileTab === "feed" && (
            <DetailPanel
              mode="livefeed"
              selectedAgentId={null}
              selectedTask={null}
              agent={null}
              onClose={handleCloseDetail}
            />
          )}
        </div>
      </div>
    </div>
  );
}
