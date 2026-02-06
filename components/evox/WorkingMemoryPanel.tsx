"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MarkdownEditor } from "./MarkdownEditor";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface WorkingMemoryPanelProps {
  agentId: Id<"agents">;
  content: string;
  updatedAt?: number;
  version?: number;
  className?: string;
}

/**
 * AGT-113: WORKING.md panel with view/edit modes
 * AGT-230: Edit button hidden in demo mode
 */
export function WorkingMemoryPanel({
  agentId,
  content,
  updatedAt,
  version,
  className,
}: WorkingMemoryPanelProps) {
  const { isViewerMode } = useViewerMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsertMemory = useMutation(api.agentMemory.upsertMemory);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await upsertMemory({
        agentId,
        type: "working",
        content: draft,
        expectedVersion: version,
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(content);
    setEditing(false);
    setError(null);
  };

  // Handle Cmd+E to toggle edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "e" && (e.metaKey || e.ctrlKey) && !editing) {
      e.preventDefault();
      setEditing(true);
    }
  };

  if (editing) {
    return (
      <div className={cn("h-64 rounded-lg border border-zinc-800 overflow-hidden", className)}>
        <MarkdownEditor
          content={draft}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
          placeholder="Enter working memory content..."
        />
        {error && (
          <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20">
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-lg border border-zinc-800 bg-zinc-900", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            WORKING MEMORY
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt != null && (
            <span className="text-xs text-zinc-600">
              Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
            </span>
          )}
          {/* AGT-230: Hide edit button in demo mode */}
          {!isViewerMode && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-48 overflow-y-auto p-3">
        {content ? (
          <div className="whitespace-pre-wrap text-sm text-zinc-400">{content}</div>
        ) : (
          <p className="text-sm text-zinc-500 italic">No working memory set. Click Edit to add.</p>
        )}
      </div>

      {/* Keyboard hint — hidden in demo mode */}
      {!isViewerMode && (
        <div className="border-t border-zinc-900 px-3 py-1">
          <span className="text-[10px] text-zinc-700">⌘E to edit</span>
        </div>
      )}
    </div>
  );
}
