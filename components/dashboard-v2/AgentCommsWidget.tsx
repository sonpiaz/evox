"use client";

/**
 * AgentCommsWidget - Real-time agent communication feed
 * Uses getChannelMessagesWithKeywords Convex query for server-side keyword extraction
 * Format: 'LEO -> #dev: shipped, AGT-314, components'
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function keywordStyle(keyword: string): string {
  if (/AGT-\d+/i.test(keyword)) {
    return "bg-purple-900/50 text-purple-300";
  }
  if (/shipped|completed|done|merged|deployed|success|passed/i.test(keyword)) {
    return "bg-green-900/50 text-green-300";
  }
  if (/blocked|waiting|stuck|failed|error/i.test(keyword)) {
    return "bg-red-900/50 text-red-300";
  }
  if (/working|testing|reviewing|started/i.test(keyword)) {
    return "bg-yellow-900/50 text-yellow-300";
  }
  return "bg-surface-4 text-secondary";
}

interface AgentCommsWidgetProps {
  limit?: number;
  channel?: string;
}

export function AgentCommsWidget({ limit = 8, channel }: AgentCommsWidgetProps) {
  const data = useQuery(api.agentMessages.getChannelMessagesWithKeywords, {
    channel,
    limit,
  });

  // Loading state
  if (data === undefined) {
    return (
      <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
        <h3 className="text-sm font-medium text-secondary mb-3">Agent Comms</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const messages = data.messages || [];

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
        <h3 className="text-sm font-medium text-secondary mb-3">Agent Comms</h3>
        <div className="text-center text-primary0 text-sm py-4">
          No recent communications
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-secondary">Agent Comms</h3>
        <span className="text-[10px] text-tertiary">{data.count} msgs</span>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="py-2 border-b border-border-default/50 last:border-0 min-h-[44px] active:bg-surface-4/50 transition-colors rounded"
          >
            {/* Agent -> Channel : Time */}
            <div className="flex items-center gap-1.5 text-xs mb-1">
              <span className="font-semibold text-blue-400">
                {(msg.sender || "?").toUpperCase()}
              </span>
              <span className="text-tertiary">&rarr;</span>
              <span className="text-secondary">#{msg.channel}</span>
              <span className="text-tertiary ml-auto">
                {formatTime(msg.timestamp)}
              </span>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-1.5">
              {msg.keywords.length > 0 ? (
                msg.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className={`text-[11px] px-1.5 py-0.5 rounded ${keywordStyle(keyword)}`}
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-tertiary truncate">
                  {msg.summary.slice(0, 60)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
