"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSend?: (message: string) => void;
  placeholder?: string;
}

export function MessageInput({ onSend, placeholder = "Type a message..." }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 120); // max 5 lines (~24px per line)
    textarea.style.height = `${newHeight}px`;
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend?.(message);
    setMessage("");

    // Reset height after sending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 border-t border-border-default bg-base p-4">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-tertiary focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
