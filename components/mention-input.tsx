"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Agent {
  name: string;
  avatar: string;
  color: "blue" | "green" | "purple";
}

interface MentionInputProps {
  onSend?: (message: string) => void;
  placeholder?: string;
}

const agents: Agent[] = [
  { name: "Max", avatar: "MX", color: "blue" },
  { name: "Sam", avatar: "SM", color: "green" },
  { name: "Leo", avatar: "LO", color: "purple" },
];

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export function MentionInput({ onSend, placeholder = "Type a message..." }: MentionInputProps) {
  const [message, setMessage] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter agents based on query
  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120); // max 5 lines
    textarea.style.height = `${newHeight}px`;
  };

  const insertMention = (agent: Agent) => {
    const beforeCursor = message.slice(0, cursorPosition);
    const afterCursor = message.slice(cursorPosition);

    // Find the @ symbol position
    const atIndex = beforeCursor.lastIndexOf("@");
    const newMessage =
      beforeCursor.slice(0, atIndex) + `@${agent.name} ` + afterCursor;

    setMessage(newMessage);
    setShowMentions(false);
    setMentionQuery("");

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = atIndex + agent.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend?.(message);
    setMessage("");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  };

  const handleChange = (value: string) => {
    setMessage(value);
    adjustHeight();

    const cursor = textareaRef.current?.selectionStart || 0;
    setCursorPosition(cursor);

    // Check for @ mention
    const textBeforeCursor = value.slice(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show mentions if there's no space after @
      if (!textAfterAt.includes(" ")) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowMentions(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredAgents.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredAgents.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredAgents.length) % filteredAgents.length);
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredAgents[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowMentions(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Render message with highlighted mentions
  const renderMessage = (text: string) => {
    const mentionRegex = /@(Max|Sam|Leo)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a mention
        return (
          <span
            key={i}
            className="rounded bg-blue-900/50 px-1 text-blue-300"
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="relative flex gap-2 border-t border-border-default bg-base p-4">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />

        {/* Mention Dropdown */}
        {showMentions && filteredAgents.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-gray-500 bg-surface-4 shadow-lg"
          >
            {filteredAgents.map((agent, index) => (
              <button
                key={agent.name}
                onClick={() => insertMention(agent)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors",
                  index === selectedIndex
                    ? "bg-gray-500 text-primary"
                    : "text-primary hover:bg-gray-500/50"
                )}
              >
                <Avatar className={cn("h-6 w-6 border", colorClasses[agent.color])}>
                  <AvatarFallback
                    className={cn("text-xs text-white", colorClasses[agent.color])}
                  >
                    {agent.avatar}
                  </AvatarFallback>
                </Avatar>
                <span>@{agent.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
