"use client";

import { Id } from "@/convex/_generated/dataModel";
import { LiveFeed } from "./live-feed";
import { AgentProfile } from "./agent-profile";
import { TaskDetail } from "./task-detail";
import type { KanbanTask } from "./task-card";

export type DetailPanelMode = "livefeed" | "agent" | "task";

interface Agent {
  _id: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
}

interface DetailPanelProps {
  mode: DetailPanelMode;
  selectedAgentId: string | null;
  selectedTask: KanbanTask | null;
  agent: Agent | null;
  onClose: () => void;
  className?: string;
}

export function DetailPanel({
  mode,
  selectedAgentId,
  selectedTask,
  agent,
  onClose,
  className = "",
}: DetailPanelProps) {
  return (
    <aside className={`flex h-full flex-col border-l border-gray-800 bg-base ${className}`}>
      {mode === "livefeed" && <LiveFeed />}
      {mode === "agent" && agent && (
        <AgentProfile
          agentId={agent._id}
          name={agent.name}
          role={agent.role}
          status={agent.status}
          avatar={agent.avatar}
          onClose={onClose}
        />
      )}
      {mode === "task" && selectedTask ? <TaskDetail task={selectedTask} onClose={onClose} /> : mode === "task" && <LiveFeed />}
    </aside>
  );
}
