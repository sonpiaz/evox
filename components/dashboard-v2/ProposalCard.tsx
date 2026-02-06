"use client";

/**
 * ProposalCard - Single debate/proposal with positions, votes, and actions
 * Used within ProposalList widget
 *
 * Shows: topic, positions with vote counts, vote bar, status badge
 */

import { Id } from "@/convex/_generated/dataModel";

interface Position {
  agent: string;
  stance: string;
  arguments: string[];
  evidence?: string[];
  submittedAt: number;
}

interface Vote {
  agent: string;
  position: number; // index into positions array
  votedAt: number;
}

export interface Proposal {
  _id: Id<"debates">;
  topic: string;
  context?: string;
  initiatedBy: string;
  positions: Position[];
  votes?: Vote[];
  status: "open" | "resolved" | "escalated" | "closed";
  resolution?: string;
  resolvedBy?: string;
  taskRef?: string;
  outcomeApplied: boolean;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

interface ProposalCardProps {
  proposal: Proposal;
  expanded?: boolean;
  onToggle?: () => void;
}

const statusStyles: Record<string, string> = {
  open: "bg-blue-900/40 text-blue-400",
  resolved: "bg-green-900/40 text-green-400",
  escalated: "bg-yellow-900/40 text-yellow-400",
  closed: "bg-surface-4 text-primary0",
};

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Color palette for positions (up to 6)
const positionColors = [
  { bar: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-900/30" },
  { bar: "bg-purple-500", text: "text-purple-400", bg: "bg-purple-900/30" },
  { bar: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-900/30" },
  { bar: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-900/30" },
  { bar: "bg-pink-500", text: "text-pink-400", bg: "bg-pink-900/30" },
  { bar: "bg-cyan-500", text: "text-cyan-400", bg: "bg-cyan-900/30" },
];

export function ProposalCard({ proposal, expanded = false, onToggle }: ProposalCardProps) {
  const votes = proposal.votes || [];
  const totalVotes = votes.length;
  const positionCount = proposal.positions.length;

  // Count votes per position
  const voteCounts = proposal.positions.map((_, idx) =>
    votes.filter((v) => v.position === idx).length
  );

  // Find winning position (most votes)
  const maxVotes = Math.max(...voteCounts, 0);
  const winnerIdx = voteCounts.indexOf(maxVotes);

  return (
    <div className="bg-surface-1/60 rounded-lg border border-border-default/60 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-3 py-2.5 flex items-start gap-2 active:bg-surface-4/40 transition-colors"
      >
        {/* Topic + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${statusStyles[proposal.status]}`}
            >
              {proposal.status}
            </span>
            {proposal.taskRef && (
              <span className="text-[10px] text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded">
                {proposal.taskRef}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-primary leading-snug">
            {proposal.topic}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-tertiary">
              by {proposal.initiatedBy.toUpperCase()}
            </span>
            <span className="text-[10px] text-tertiary">
              {formatTime(proposal.createdAt)}
            </span>
          </div>
        </div>

        {/* Vote summary */}
        <div className="shrink-0 text-right">
          <span className="text-sm font-semibold text-primary">{totalVotes}</span>
          <span className="text-[10px] text-tertiary block">
            {totalVotes === 1 ? "vote" : "votes"}
          </span>
        </div>
      </button>

      {/* Vote bar — compact visualization */}
      {totalVotes > 0 && (
        <div className="px-3 pb-2">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-4">
            {proposal.positions.map((_, idx) => {
              const pct = totalVotes > 0 ? (voteCounts[idx] / totalVotes) * 100 : 0;
              if (pct === 0) return null;
              const color = positionColors[idx % positionColors.length];
              return (
                <div
                  key={idx}
                  className={`${color.bar} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded: positions + votes detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border-default/50 space-y-2">
          {/* Context */}
          {proposal.context && (
            <p className="text-[11px] text-primary0 leading-relaxed">
              {proposal.context}
            </p>
          )}

          {/* Positions */}
          {proposal.positions.map((pos, idx) => {
            const color = positionColors[idx % positionColors.length];
            const voteCount = voteCounts[idx];
            const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isWinner = idx === winnerIdx && totalVotes > 0;
            const voters = votes
              .filter((v) => v.position === idx)
              .map((v) => v.agent.toUpperCase());

            return (
              <div
                key={idx}
                className={`rounded-md p-2 border ${
                  isWinner
                    ? `${color.bg} border-gray-500`
                    : "bg-surface-1/40 border-border-default/40"
                }`}
              >
                {/* Stance header */}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${color.bar}`} />
                  <span className={`text-[11px] font-semibold ${color.text}`}>
                    {pos.stance}
                  </span>
                  <span className="text-[10px] text-tertiary ml-auto">
                    {pos.agent.toUpperCase()}
                  </span>
                </div>

                {/* Arguments */}
                <ul className="space-y-0.5 ml-4">
                  {pos.arguments.slice(0, 3).map((arg, j) => (
                    <li key={j} className="text-[10px] text-secondary leading-snug">
                      {arg}
                    </li>
                  ))}
                </ul>

                {/* Vote count + voters */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-primary0">
                    {voteCount} {voteCount === 1 ? "vote" : "votes"}
                    {totalVotes > 0 && ` (${pct}%)`}
                  </span>
                  {voters.length > 0 && (
                    <span className="text-[10px] text-tertiary">
                      {voters.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Resolution */}
          {proposal.resolution && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-md p-2">
              <span className="text-[10px] text-green-500 font-medium block mb-0.5">
                Resolution
              </span>
              <p className="text-[11px] text-green-300 leading-snug">
                {proposal.resolution}
              </p>
              {proposal.resolvedBy && (
                <span className="text-[10px] text-green-600 mt-1 block">
                  by {proposal.resolvedBy.toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
