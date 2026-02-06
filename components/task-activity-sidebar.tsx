"use client";

import { useState } from "react";
import { MessageThread } from "@/components/message-thread";
import { MentionInput } from "@/components/mention-input";
import { ActivityFeed } from "@/components/activity-feed";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  agentName: string;
  agentAvatar: string;
  agentColor: "blue" | "green" | "purple";
  content: string;
  timestamp: Date;
}

// AGT-137: New unified activityEvents schema
interface ActivityEvent {
  _id: string;
  agentId: string;
  agentName: string;
  agent?: {
    name: string;
    avatar: string;
    role: "pm" | "backend" | "frontend";
    status: "online" | "idle" | "offline" | "busy";
  } | null;
  category: "task" | "git" | "deploy" | "system" | "message";
  eventType: string;
  title: string;
  description?: string;
  taskId?: string;
  linearIdentifier?: string;
  projectId?: string;
  metadata?: {
    fromStatus?: string;
    toStatus?: string;
    commitHash?: string;
    branch?: string;
    filesChanged?: string[];
    deploymentUrl?: string;
    deploymentStatus?: string;
    errorMessage?: string;
    source?: string;
  };
  timestamp: number;
}

interface TaskActivitySidebarProps {
  messages: Message[];
  activities: ActivityEvent[];
  onSendMessage?: (message: string) => void;
}

export function TaskActivitySidebar({
  messages,
  activities,
  onSendMessage,
}: TaskActivitySidebarProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "comments">("activity");

  return (
    <div className="flex h-full flex-col border-l border-border-default bg-base">
      {/* Tabs */}
      <div className="flex border-b border-border-default">
        <button
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "activity"
              ? "border-b-2 border-blue-500 text-primary"
              : "text-primary0 hover:text-primary"
          )}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "comments"
              ? "border-b-2 border-blue-500 text-primary"
              : "text-primary0 hover:text-primary"
          )}
        >
          Comments
        </button>
      </div>

      {/* Content */}
      {activeTab === "activity" ? (
        <div className="flex-1 overflow-hidden p-4">
          <ActivityFeed activities={activities} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <MessageThread messages={messages} />
          <MentionInput onSend={onSendMessage} placeholder="Add a comment... (use @ to mention)" />
        </div>
      )}
    </div>
  );
}
