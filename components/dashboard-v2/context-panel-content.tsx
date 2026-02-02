"use client";

import { useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ContextPanel } from "./context-panel";
import { ActivityPage } from "./activity-page";
import { AgentProfile } from "./agent-profile";
import { TaskDetailStub } from "./task-detail-stub";
import type { KanbanTask } from "./task-card";

type PanelMode = "activity" | "agent" | "task";

interface ContextPanelContentProps {
  selectedAgentId: Id<"agents"> | null;
  selectedTask: KanbanTask | null;
  selectedAgent: { _id: Id<"agents">; name: string; role: string; status: string; avatar: string } | null;
  onClose: () => void;
}

/** AGT-173: Context panel content — Activity (default) | Agent Profile | Task Detail stub */
export function ContextPanelContent({
  selectedAgentId,
  selectedTask,
  selectedAgent,
  onClose,
}: ContextPanelContentProps) {
  const mode: PanelMode = useMemo(() => {
    if (selectedTask) return "task";
    if (selectedAgentId && selectedAgent) return "agent";
    return "activity";
  }, [selectedTask, selectedAgentId, selectedAgent]);

  const headerTitle =
    mode === "activity" ? "Activity" : mode === "agent" ? "Agent Profile" : "Task Detail";

  return (
    <ContextPanel className="flex flex-col min-h-0">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-xs font-medium tracking-widest uppercase text-white/40">{headerTitle}</h2>
        {(mode === "agent" || mode === "task") && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/40 transition-colors hover:text-white/90"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === "activity" && <ActivityPage />}
        {mode === "agent" && selectedAgent && (
          <AgentProfile
            agentId={selectedAgent._id}
            name={selectedAgent.name}
            role={selectedAgent.role}
            status={selectedAgent.status}
            avatar={selectedAgent.avatar}
            onClose={onClose}
            embedded
          />
        )}
        {mode === "task" && <TaskDetailStub task={selectedTask} onClose={onClose} embedded />}
      </div>
    </ContextPanel>
  );
}
