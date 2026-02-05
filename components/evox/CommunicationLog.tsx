"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { extractKeywords, generateSummary, formatAsHashtags } from "@/lib/extractKeywords";

interface CommunicationLogProps {
  className?: string;
}

type MessageType = "handoff" | "update" | "request" | "fyi";

const MESSAGE_TYPE_COLORS: Record<MessageType, string> = {
  handoff: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  update: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  request: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  fyi: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

/**
 * AGT-237: Real-time Agent Communication Log
 * Shows all agent messages with filtering and analytics
 */
export function CommunicationLog({ className }: CommunicationLogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<MessageType | null>(null);
  // Hide analytics by default on mobile (check via window width on mount)
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fetch messages with filters
  const messagesArgs = useMemo(() => {
    const args: { agentName?: string; messageType?: MessageType; limit: number } = { limit: 100 };
    if (selectedAgent) args.agentName = selectedAgent;
    if (selectedType) args.messageType = selectedType;
    return args;
  }, [selectedAgent, selectedType]);

  const messages = useQuery(api.agentMessages.getAllMessages, messagesArgs);

  // Fetch analytics
  const analytics = useQuery(api.agentMessages.getAnalytics, { limit: 500 });

  // Available agents
  const agents = useQuery(api.agents.list);
  const agentsList = useMemo(() => {
    if (!agents || !Array.isArray(agents)) return [];
    return agents.map((a: any) => a.name.toLowerCase());
  }, [agents]);

  const messageTypes: MessageType[] = ["handoff", "update", "request", "fyi"];

  const handleAgentFilter = (agent: string) => {
    setSelectedAgent(selectedAgent === agent ? null : agent);
  };

  const handleTypeFilter = (type: MessageType) => {
    setSelectedType(selectedType === type ? null : type);
  };

  const formatTime = (timestamp: number) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-zinc-950", className)}>
      {/* Header */}
      <div className="border-b border-zinc-800 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Communication Log</h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 sm:mt-1">
              Real-time agent messages
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-3 py-1.5 rounded-lg text-sm border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
          >
            {showAnalytics ? "Hide" : "Show"} Analytics
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 space-y-3">
          {/* Agent Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
              Filter by Agent
            </label>
            <div className="flex gap-2 flex-wrap">
              {agentsList.map((agent) => (
                <button
                  key={agent}
                  type="button"
                  onClick={() => handleAgentFilter(agent)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium uppercase transition-colors border",
                    selectedAgent === agent
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  {agent}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 block">
              Filter by Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {messageTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeFilter(type)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium uppercase transition-colors border",
                    selectedType === type
                      ? MESSAGE_TYPE_COLORS[type]
                      : "bg-zinc-800 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
        {/* Messages Feed */}
        <div
          className={cn(
            "overflow-y-auto",
            showAnalytics ? "flex-1 md:border-r border-zinc-800" : "w-full"
          )}
        >
          {messages === undefined ? (
            <div className="flex items-center justify-center h-full">
              <span className="animate-pulse text-sm text-zinc-500">
                Loading messages...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-4xl mb-3 block">📡</span>
                <p className="text-sm text-zinc-500">No messages found</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Try adjusting your filters
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-6 space-y-2 sm:space-y-3">
              {messages.map((msg: any) => (
                <div
                  key={msg._id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 sm:p-4 hover:border-zinc-700 transition-colors"
                >
                  {/* Header - Stack on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2 mb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-base sm:text-lg">
                        {msg.fromAgent?.avatar ?? "?"}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-white uppercase">
                        {msg.fromAgent?.name ?? "Unknown"}
                      </span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-base sm:text-lg">
                        {msg.toAgent?.avatar ?? "?"}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-white uppercase">
                        {msg.toAgent?.name ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase border",
                          MESSAGE_TYPE_COLORS[msg.type as MessageType]
                        )}
                      >
                        {msg.type}
                      </span>
                      <span className="text-[10px] sm:text-xs text-zinc-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {msg.content}
                  </p>

                  {/* Keywords */}
                  {(() => {
                    const keywords = extractKeywords(msg.content || "");
                    const hashtags = formatAsHashtags(keywords.all, 4);
                    if (hashtags.length === 0) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Task Reference */}
                  {msg.taskRefDisplay && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
                      <span>🎯</span>
                      <span className="font-mono">
                        {msg.taskRefDisplay.linearIdentifier}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">
                        {msg.taskRefDisplay.title}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics Panel - Full width on mobile, fixed on desktop */}
        {showAnalytics && (
          <div className="w-full md:w-72 lg:w-80 overflow-y-auto bg-zinc-950 p-4 sm:p-6 border-t md:border-t-0 border-zinc-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Analytics
            </h3>

            {analytics === undefined ? (
              <div className="flex items-center justify-center py-8">
                <span className="animate-pulse text-sm text-zinc-500">
                  Loading analytics...
                </span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Total Messages */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Total Messages
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.totalMessages}
                  </div>
                </div>

                {/* Average Response Time */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Avg Response Time
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.avgResponseTime > 0
                      ? `${Math.round(analytics.avgResponseTime / 1000 / 60)}m`
                      : "N/A"}
                  </div>
                </div>

                {/* Message Volume by Agent */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Message Volume
                  </div>
                  <div className="space-y-2">
                    {analytics.volumeByAgent.map((item: any) => (
                      <div
                        key={item.agent}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white uppercase">
                            {item.agent}
                          </span>
                          <span className="text-xs font-bold text-blue-400">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${(item.count / analytics.totalMessages) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Active Pairs */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                    Most Active Pairs
                  </div>
                  <div className="space-y-2">
                    {analytics.topPairs.map((item: any, index: number) => (
                      <div
                        key={item.pair}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-600">
                              #{index + 1}
                            </span>
                            <span className="text-xs text-zinc-300">
                              {item.pair}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-purple-400">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                    {analytics.topPairs.length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-4">
                        No conversation pairs yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
