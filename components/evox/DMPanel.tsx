"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DMMessage } from "./DMMessage";
import { DMInput } from "./DMInput";

interface DMPanelProps {
  currentAgentName: string; // "leo", "sam", "max"
  otherAgentName: string;
  otherAgentAvatar: string;
  onClose: () => void;
  className?: string;
}

/**
 * AGT-118: DM Panel - Chat view between two agents
 */
export function DMPanel({
  currentAgentName,
  otherAgentName,
  otherAgentAvatar,
  onClose,
  className,
}: DMPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation
  const conversation = useQuery(api.agentMessages.getConversation, {
    agent1: currentAgentName,
    agent2: otherAgentName,
    limit: 50,
  });

  // Mutations
  const sendMessage = useMutation(api.agentMessages.sendMessage);
  const markAsRead = useMutation(api.agentMessages.markAsRead);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Mark unread messages as read when panel opens
  useEffect(() => {
    if (!conversation) return;
    const unread = conversation.filter(
      (m) =>
        m.toAgent?.name?.toLowerCase() === currentAgentName.toLowerCase() &&
        m.status === "unread"
    );
    unread.forEach((m) => {
      markAsRead({ messageId: m._id });
    });
  }, [conversation, currentAgentName, markAsRead]);

  const handleSend = async (content: string, type: "handoff" | "update" | "request" | "fyi") => {
    await sendMessage({
      fromAgentName: currentAgentName,
      toAgentName: otherAgentName,
      type,
      content,
    });
  };

  // Handle Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-950 border-l border-zinc-800",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-base sm:text-lg">💬</span>
          <span className="text-lg sm:text-xl">{otherAgentAvatar}</span>
          <span className="text-xs sm:text-sm font-medium text-white uppercase">
            {otherAgentName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 min-h-0">
        {conversation === undefined ? (
          <div className="flex items-center justify-center h-full">
            <span className="animate-pulse text-sm text-zinc-500">Loading...</span>
          </div>
        ) : conversation.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {conversation.map((msg) => (
              <DMMessage
                key={msg._id}
                content={msg.content}
                senderName={msg.fromAgent?.name ?? "Unknown"}
                senderAvatar={msg.fromAgent?.avatar ?? "?"}
                timestamp={msg.timestamp}
                isOwn={msg.fromAgent?.name?.toLowerCase() === currentAgentName.toLowerCase()}
                type={msg.type}
                taskRef={msg.taskRefDisplay}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <DMInput onSend={handleSend} />
    </div>
  );
}
