"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  className?: string;
  placeholder?: string;
  saving?: boolean;
}

/**
 * AGT-113: Simple markdown editor with autosave
 */
export function MarkdownEditor({
  content,
  onChange,
  onSave,
  onCancel,
  className,
  placeholder = "Enter markdown content...",
  saving = false,
}: MarkdownEditorProps) {
  const [draft, setDraft] = useState(content);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Sync external content changes
  useEffect(() => {
    setDraft(content);
  }, [content]);

  // Autosave every 30 seconds if content changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (draft !== content) {
        onChange(draft);
        setLastSaved(new Date());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [draft, content, onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onChange(draft);
        onSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [draft, onChange, onSave, onCancel]
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2 bg-base">
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary0">Editing</span>
          {lastSaved && (
            <span className="text-xs text-tertiary">
              Draft saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs text-secondary hover:bg-surface-4 hover:text-white"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              onSave();
            }}
            disabled={saving}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save (⌘S)"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 resize-none bg-base p-4 text-sm text-primary font-mono placeholder:text-tertiary focus:outline-none"
        spellCheck={false}
      />

      {/* Keyboard hints */}
      <div className="border-t border-border-default px-3 py-1.5 bg-base">
        <span className="text-[10px] text-tertiary">
          ⌘S Save · Esc Cancel · Auto-saves every 30s
        </span>
      </div>
    </div>
  );
}
