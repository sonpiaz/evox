"use client";

/**
 * ProposalList - Dashboard widget showing active proposals/debates
 * Real-time via Convex useQuery
 *
 * Shows open debates with vote progress, expandable for detail
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalCard, type Proposal } from "./ProposalCard";
import { Id } from "@/convex/_generated/dataModel";

interface ProposalListProps {
  limit?: number;
}

export function ProposalList({ limit = 5 }: ProposalListProps) {
  const openDebates = useQuery(api.debates.listOpen);
  const [expandedId, setExpandedId] = useState<Id<"debates"> | null>(null);

  // Loading state
  if (openDebates === undefined) {
    return (
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Proposals</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 p-3 bg-zinc-900/60 rounded-lg">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const proposals = (openDebates as Proposal[]).slice(0, limit);

  // Empty state
  if (proposals.length === 0) {
    return (
      <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Proposals</h3>
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm">No active proposals</p>
          <p className="text-zinc-600 text-[11px] mt-1">
            Agents can start debates to propose features
          </p>
        </div>
      </div>
    );
  }

  // Stats
  const totalVotes = proposals.reduce(
    (sum, p) => sum + (p.votes?.length || 0),
    0
  );
  const totalPositions = proposals.reduce(
    (sum, p) => sum + p.positions.length,
    0
  );

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-400">Proposals</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">
            {totalVotes} votes
          </span>
          <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
            {proposals.length} open
          </span>
        </div>
      </div>

      {/* Proposal cards */}
      <div className="space-y-2">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal._id}
            proposal={proposal}
            expanded={expandedId === proposal._id}
            onToggle={() =>
              setExpandedId(expandedId === proposal._id ? null : proposal._id)
            }
          />
        ))}
      </div>
    </div>
  );
}
