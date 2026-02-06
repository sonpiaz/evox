"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DMMessageProps {
  content: string;
  senderName: string;
  senderAvatar: string;
  timestamp: number;
  isOwn: boolean;
  type?: "handoff" | "update" | "request" | "fyi";
  taskRef?: { linearIdentifier?: string; title?: string } | null;
  className?: string;
}

const typeColors: Record<string, string> = {
  handoff: "bg-purple-500/20 text-purple-400",
  update: "bg-blue-500/20 text-blue-400",
  request: "bg-amber-500/20 text-amber-400",
  fyi: "bg-zinc-500/20 text-zinc-400",
};

/**
 * AGT-118: DM message bubble
 */
export function DMMessage({
  content,
  senderName,
  senderAvatar,
  timestamp,
  isOwn,
  type = "fyi",
  taskRef,
  className,
}: DMMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isOwn ? "ml-auto flex-row-reverse" : "",
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">
        {senderAvatar}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-full",
          isOwn
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-zinc-900 text-zinc-300 rounded-bl-sm"
        )}
      >
        {/* Type badge */}
        {type && type !== "fyi" && (
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase mb-1",
              typeColors[type]
            )}
          >
            {type}
          </span>
        )}

        {/* Task reference */}
        {taskRef?.linearIdentifier && (
          <span className="block text-xs text-zinc-400 mb-1 font-mono">
            Re: {taskRef.linearIdentifier}
          </span>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

        {/* Timestamp */}
        <span
          className={cn(
            "block text-[10px] mt-1",
            isOwn ? "text-blue-200" : "text-zinc-500"
          )}
        >
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
