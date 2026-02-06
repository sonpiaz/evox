"use client";

/**
 * WinsCard - Today's wins
 * GREEN. Celebrate. Momentum.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

interface WinsCardProps {
  className?: string;
  collapsed?: boolean;
}

export function WinsCard({ className, collapsed = false }: WinsCardProps) {
  const wins = useQuery(api.ceoMetrics.getWins);

  if (!wins || wins.length === 0) {
    return null; // Don't show if no wins
  }

  if (collapsed) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <span>!</span>
          <span className="font-medium">{wins.length} wins today</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-400 text-lg">!</span>
          <span className="text-emerald-400 font-semibold text-sm uppercase tracking-wide">
            Wins Today ({wins.length})
          </span>
        </div>
        <div className="space-y-1">
          {wins.map((win) => (
            <div
              key={win.id}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-emerald-400">!</span>
              <span className="text-white flex-1 truncate">{win.title}</span>
              <span className="text-primary0 text-xs shrink-0">
                {win.agent} {formatDistanceToNow(win.completedAt || 0, { addSuffix: false })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
