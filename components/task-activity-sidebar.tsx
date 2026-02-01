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

interface Activity {
  _id: string;
  agent: {
    name: string;
    avatar: string;
    role: "pm" | "backend" | "frontend";
    status: "online" | "idle" | "offline";
  } | null;
  action: string;
  target: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

interface TaskActivitySidebarProps {
  messages: Message[];
  activities: Activity[];
  onSendMessage?: (message: string) => void;
}

export function TaskActivitySidebar({
  messages,
  activities,
  onSendMessage,
}: TaskActivitySidebarProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "comments">("activity");

  return (
    <div className="flex h-full flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "activity"
              ? "border-b-2 border-blue-500 text-zinc-50"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "comments"
              ? "border-b-2 border-blue-500 text-zinc-50"
              : "text-zinc-500 hover:text-zinc-300"
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
