"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DMList } from "./DMList";
import { DMPanel } from "./DMPanel";

interface DirectMessagesViewProps {
  /** Current agent viewing the DMs (e.g., "leo") */
  currentAgentName: string;
  className?: string;
}

type AgentDoc = {
  _id: string;
  name: string;
  avatar: string;
  status: string;
};

/**
 * AGT-118: Direct Messages View - Combined DM list and chat panel
 * Keyboard: Cmd+D to toggle, Esc to close panel
 */
export function DirectMessagesView({
  currentAgentName,
  className,
}: DirectMessagesViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");

  // Fetch agents
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;

  const handleSelectAgent = useCallback((agentName: string, avatar: string) => {
    setSelectedAgent(agentName);
    setSelectedAvatar(avatar);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedAgent(null);
    setSelectedAvatar("");
  }, []);

  // Keyboard shortcut: Cmd+D to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedAgent) {
          handleClosePanel();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAgent, handleClosePanel]);

  if (!agents) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <span className="animate-pulse text-sm text-primary0">Loading...</span>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* DM List sidebar */}
      <div className="w-48 shrink-0 border-r border-border-default p-2">
        <DMList
          currentAgentName={currentAgentName}
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
        />
      </div>

      {/* Chat panel */}
      <div className="flex-1 min-w-0">
        {selectedAgent ? (
          <DMPanel
            currentAgentName={currentAgentName}
            otherAgentName={selectedAgent}
            otherAgentAvatar={selectedAvatar}
            onClose={handleClosePanel}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-3 block">💬</span>
              <p className="text-sm text-primary0">Select an agent to start a conversation</p>
              <p className="text-xs text-tertiary mt-1">Press Esc to close</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
