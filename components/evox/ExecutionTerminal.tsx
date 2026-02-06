"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ExecutionTerminalProps {
  className?: string;
  defaultAgent?: string;
  /** Hide the internal header bar (agent dropdown, status). Use when parent provides its own controls. */
  hideHeader?: boolean;
}

type ExecutionLog = {
  _id: string;
  agentName: string;
  sessionId?: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: number;
  metadata?: {
    command?: string;
    exitCode?: number;
    duration?: number;
    filesAffected?: string[];
    error?: string;
  };
};

/** Level colors */
const levelColors: Record<string, { dot: string; text: string; bg: string }> = {
  debug: { dot: "bg-gray-500", text: "text-gray-400", bg: "bg-gray-500/10" },
  info: { dot: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10" },
  warn: { dot: "bg-yellow-500", text: "text-yellow-400", bg: "bg-yellow-500/10" },
  error: { dot: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" },
};

/** Tool call patterns and colors */
const toolPatterns: { pattern: RegExp; color: string; icon: string }[] = [
  { pattern: /^Read\(|> Read\(/i, color: "text-blue-400", icon: "📖" },
  { pattern: /^Write\(|> Write\(/i, color: "text-emerald-400", icon: "✏️" },
  { pattern: /^Edit\(|> Edit\(/i, color: "text-emerald-400", icon: "✏️" },
  { pattern: /^Explore\(|> Explore\(/i, color: "text-purple-400", icon: "🔍" },
  { pattern: /^Bash\(|> Bash\(/i, color: "text-orange-400", icon: "💻" },
  { pattern: /^Glob\(|> Glob\(/i, color: "text-cyan-400", icon: "📁" },
  { pattern: /^Grep\(|> Grep\(/i, color: "text-cyan-400", icon: "🔎" },
];

/** Get tool styling for a message */
function getToolStyle(message: string): { color: string; icon: string } | null {
  for (const { pattern, color, icon } of toolPatterns) {
    if (pattern.test(message)) {
      return { color, icon };
    }
  }
  return null;
}

/** Status indicators */
type ExecutionStatus = "idle" | "thinking" | "executing" | "done" | "error";

const statusConfig: Record<ExecutionStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: "Idle", color: "bg-gray-500", pulse: false },
  thinking: { label: "Thinking...", color: "bg-yellow-500", pulse: true },
  executing: { label: "Executing", color: "bg-blue-500", pulse: true },
  done: { label: "Done", color: "bg-emerald-500", pulse: false },
  error: { label: "Error", color: "bg-red-500", pulse: false },
};

const AGENTS = ["max", "sam", "leo", "quinn"] as const;

/**
 * AGT-196: Execution Terminal
 * Live terminal showing Claude Code output with tool call formatting
 */
export function ExecutionTerminal({ className, defaultAgent = "sam", hideHeader = false }: ExecutionTerminalProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>(defaultAgent);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time subscription to execution logs
  const logs = useQuery(api.execution.streamExecutionLogs, {
    agentName: selectedAgent,
    limit: 100,
  }) as ExecutionLog[] | undefined;

  // Get execution summary
  const summary = useQuery(api.execution.getExecutionSummary, {
    agentName: selectedAgent,
    timeRangeMs: 60 * 60 * 1000, // Last hour
  });

  // Determine current status from recent logs
  const status = useMemo<ExecutionStatus>(() => {
    if (!logs || logs.length === 0) return "idle";

    const currentTime = new Date().getTime();
    const recentLogs = logs.filter(l => currentTime - l.timestamp < 30000); // Last 30 sec
    if (recentLogs.length === 0) return "idle";

    const hasError = recentLogs.some(l => l.level === "error");
    if (hasError) return "error";

    const latestLog = recentLogs[0];
    if (latestLog.message.toLowerCase().includes("thinking") ||
        latestLog.message.toLowerCase().includes("determining")) {
      return "thinking";
    }

    return "executing";
  }, [logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Handle scroll - disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const statusInfo = statusConfig[status];

  return (
    <div className={cn("flex flex-col bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden", className)}>
      {/* Header — hidden when parent provides its own controls */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm">🖥️</span>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Execution Log
            </span>

            {/* Agent selector */}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 focus:border-blue-500 focus:outline-none"
            >
              {AGENTS.map((agent) => (
                <option key={agent} value={agent}>
                  {agent.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  statusInfo.color,
                  statusInfo.pulse && "animate-pulse"
                )}
              />
              <span className="text-[10px] text-zinc-400">{statusInfo.label}</span>
            </div>

            {/* Controls */}
            <button
              type="button"
              onClick={() => setExpandAll(!expandAll)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-white/5 hover:text-zinc-400"
              title={expandAll ? "Collapse" : "Expand all"}
            >
              {expandAll ? "−" : "+"}
            </button>
          </div>
        </div>
      )}

      {/* Log content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed min-h-[200px]"
      >
        {!logs || logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            No execution logs for {selectedAgent.toUpperCase()}
          </div>
        ) : (
          <div className="space-y-1">
            {[...logs].reverse().map((log) => (
              <LogLine key={log._id} log={log} expanded={expandAll} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {summary && (
        <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2 text-[10px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span>
              Logs: <span className="text-zinc-400">{summary.logs.total}</span>
            </span>
            <span>
              Files: <span className="text-zinc-400">{summary.files.uniqueFiles}</span>
            </span>
            {summary.logs.error > 0 && (
              <span className="text-red-400">
                Errors: {summary.logs.error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!autoScroll && (
              <button
                type="button"
                onClick={() => {
                  setAutoScroll(true);
                  if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                  }
                }}
                className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-white/10"
              >
                ↓ Scroll to bottom
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual log line */
function LogLine({ log, expanded }: { log: ExecutionLog; expanded: boolean }) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const levelStyle = levelColors[log.level] ?? levelColors.info;
  const toolStyle = getToolStyle(log.message);

  // Format message - truncate if not expanded
  const displayMessage = !isExpanded && log.message.length > 100
    ? log.message.slice(0, 100) + "..."
    : log.message;

  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded px-2 py-1 transition-colors",
        "hover:bg-white/[0.02]",
        log.level === "error" && "bg-red-500/5"
      )}
    >
      {/* Level dot */}
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", levelStyle.dot)} />

      {/* Timestamp */}
      <span className="shrink-0 text-[10px] text-zinc-600">
        {new Date(log.timestamp).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>

      {/* Message */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "break-words",
            toolStyle?.color ?? levelStyle.text
          )}
        >
          {toolStyle && <span className="mr-1">{toolStyle.icon}</span>}
          {displayMessage}
        </span>

        {/* Metadata */}
        {isExpanded && hasMetadata && (
          <div className="mt-1 rounded bg-white/[0.02] p-2 text-[11px] text-zinc-500">
            {log.metadata?.command && (
              <div>
                <span className="text-zinc-400">Command:</span> {log.metadata.command}
              </div>
            )}
            {log.metadata?.duration !== undefined && (
              <div>
                <span className="text-zinc-400">Duration:</span> {log.metadata.duration}ms
              </div>
            )}
            {log.metadata?.exitCode !== undefined && (
              <div>
                <span className="text-zinc-400">Exit:</span>{" "}
                <span className={log.metadata.exitCode === 0 ? "text-emerald-400" : "text-red-400"}>
                  {log.metadata.exitCode}
                </span>
              </div>
            )}
            {log.metadata?.error && (
              <div className="text-red-400">
                <span className="text-zinc-400">Error:</span> {log.metadata.error}
              </div>
            )}
            {log.metadata?.filesAffected && log.metadata.filesAffected.length > 0 && (
              <div>
                <span className="text-zinc-400">Files:</span>{" "}
                {log.metadata.filesAffected.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand toggle */}
      {(log.message.length > 100 || hasMetadata) && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-400"
        >
          {isExpanded ? "−" : "+"}
        </button>
      )}
    </div>
  );
}
