"use client";

/**
 * BlockersCard - What needs CEO attention
 * RED. Urgent. Action required.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface BlockersCardProps {
  className?: string;
}

export function BlockersCard({ className }: BlockersCardProps) {
  const blockers = useQuery(api.ceoMetrics.getBlockers);

  if (!blockers || blockers.length === 0) {
    return null; // Don't show if no blockers
  }

  return (
    <div className={className}>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-red-400 text-lg">!</span>
          <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">
            Needs Attention ({blockers.length})
          </span>
        </div>
        <div className="space-y-2">
          {blockers.map((blocker) => (
            <div
              key={blocker.id}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-red-400 shrink-0">
                {blocker.urgent ? "!" : "?"}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-white">{blocker.title}</span>
                {blocker.linearId && (
                  <span className="text-primary0 ml-1">({blocker.linearId})</span>
                )}
                {blocker.stale && (
                  <span className="text-yellow-500 ml-1 text-xs">[stale 24h+]</span>
                )}
              </div>
              <span className="text-primary0 text-xs shrink-0">
                {blocker.owner}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
