"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface DMInputProps {
  onSend: (content: string, type: "handoff" | "update" | "request" | "fyi") => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * AGT-118: DM message input with type selector
 * AGT-230: Hidden in demo mode
 */
export function DMInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: DMInputProps) {
  const { isViewerMode } = useViewerMode();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"handoff" | "update" | "request" | "fyi">("fyi");

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSend(trimmed, type);
    setContent("");
  }, [content, type, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // AGT-230: Don't render input in demo mode (after all hooks)
  if (isViewerMode) return null;

  return (
    <div className={cn("border-t border-zinc-800 p-3 bg-zinc-950", className)}>
      {/* Type selector */}
      <div className="flex gap-1 mb-2">
        {(["fyi", "update", "request", "handoff"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-medium uppercase transition-colors",
              type === t
                ? t === "handoff"
                  ? "bg-purple-500/20 text-purple-400"
                  : t === "update"
                    ? "bg-blue-500/20 text-blue-400"
                    : t === "request"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-zinc-500/20 text-zinc-400"
                : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">Enter to send, Shift+Enter for new line</p>
    </div>
  );
}
