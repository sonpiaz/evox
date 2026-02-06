"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SoulPreviewProps {
  content: string;
  className?: string;
  linearDocUrl?: string;
}

/**
 * AGT-113: Read-only SOUL.md preview with expand/collapse
 */
export function SoulPreview({ content, className, linearDocUrl }: SoulPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  // Show first 3 lines when collapsed
  const lines = content.split("\n");
  const previewLines = lines.slice(0, 3).join("\n");
  const hasMore = lines.length > 3;

  return (
    <div className={cn("rounded-lg border border-border-default bg-surface-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧬</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary0">SOUL</span>
        </div>
        {linearDocUrl && (
          <a
            href={linearDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary0 hover:text-secondary"
          >
            Edit in Linear ↗
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="whitespace-pre-wrap text-sm text-secondary">
          {expanded ? content : previewLines}
          {!expanded && hasMore && (
            <span className="text-primary0">...</span>
          )}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-primary0 hover:text-secondary"
          >
            {expanded ? "Show less" : `Show more (${lines.length - 3} more lines)`}
          </button>
        )}
      </div>
    </div>
  );
}
