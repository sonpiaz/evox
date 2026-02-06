"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface ScratchPadProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ScratchPad({ isOpen, onToggle }: ScratchPadProps) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("evox-scratch-pad");
    if (saved) setContent(saved);
  }, []);

  // Debounced save to localStorage
  const handleChange = useCallback((value: string) => {
    setContent(value);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem("evox-scratch-pad", value);
      setIsSaving(false);
    }, 500);
  }, []);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-center border-t border-border-default bg-surface-1 text-secondary transition-colors hover:bg-surface-1 hover:text-primary"
      >
        <span className="mr-2">📝</span>
        <span className="text-xs">Scratch Pad</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col border-t border-border-default bg-surface-1">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <span className="text-xs text-secondary">
          📝 Scratch Pad
          {isSaving && <span className="ml-2 text-blue-500">Saving...</span>}
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-secondary hover:text-primary"
        >
          ✕
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Quick notes..."
        className="h-32 w-full resize-none bg-transparent px-3 py-2 text-sm text-primary placeholder:text-primary0 focus:outline-none"
      />
    </div>
  );
}
