"use client";

import { cn } from "@/lib/utils";

/**
 * AGT-COMMS: Agent Card with Keywords
 * Mobile-first design showing agent status, summary, and extracted keywords
 */

interface AgentCardProps {
  name: string;
  avatar?: string;
  role?: string;
  status: "online" | "busy" | "idle" | "offline";
  statusSummary?: string;
  keywords?: string[];
  lastMessage?: string;
  className?: string;
}

// AGT-273: Consistent status colors
const statusColors: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-red-500",
};

const statusIcons: Record<string, string> = {
  online: "✅",
  busy: "🔄",
  idle: "⏳",
  offline: "⏸️",
};

export function AgentCard({
  name,
  avatar = "🤖",
  role,
  status,
  statusSummary,
  keywords = [],
  lastMessage,
  className,
}: AgentCardProps) {
  const isActive = status === "online" || status === "busy";
  const dotColor = statusColors[status] || statusColors.offline;
  const statusIcon = statusIcons[status] || "";

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-1/50 p-3 sm:p-4 transition-all",
        isActive ? "border-green-500/30" : "border-border-default",
        className
      )}
    >
      {/* Header: Avatar + Name + Status indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg sm:text-xl shrink-0">{avatar}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  dotColor,
                  isActive && status === "busy" && "animate-pulse"
                )}
              />
              <span className="text-sm sm:text-base font-semibold text-white uppercase truncate">
                {name}
              </span>
            </div>
            {role && (
              <span className="text-[10px] sm:text-xs text-primary0 uppercase">
                {role}
              </span>
            )}
          </div>
        </div>
        <span className="text-sm shrink-0">{statusIcon}</span>
      </div>

      {/* Status Summary */}
      {statusSummary && (
        <div className="mt-2 text-xs sm:text-sm text-primary line-clamp-1">
          {statusSummary}
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}

      {/* Last Message Preview */}
      {lastMessage && (
        <div className="mt-2 pt-2 border-t border-border-default">
          <p className="text-[10px] sm:text-xs text-primary0 line-clamp-1">
            &ldquo;{lastMessage}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Extract keywords from message content
 * Identifies: ticket IDs, actions, components
 */
export function extractKeywords(content: string): string[] {
  const keywords: string[] = [];

  // Extract ticket IDs (AGT-XXX pattern)
  const ticketMatches = content.match(/AGT-\d+/gi);
  if (ticketMatches) {
    keywords.push(...ticketMatches.slice(0, 2));
  }

  // Common action keywords
  const actions = ["review", "fix", "deploy", "test", "build", "update", "create", "merge"];
  for (const action of actions) {
    if (content.toLowerCase().includes(action)) {
      keywords.push(action);
    }
  }

  // Component keywords
  const components = ["api", "ui", "backend", "frontend", "dashboard", "auth"];
  for (const comp of components) {
    if (content.toLowerCase().includes(comp)) {
      keywords.push(comp);
    }
  }

  // Dedupe and limit
  return [...new Set(keywords)].slice(0, 5);
}

/**
 * Generate a summary from message content
 */
export function generateSummary(content: string): string {
  // Check for common patterns
  if (content.toLowerCase().includes("working on")) {
    const match = content.match(/working on (.+?)(?:\.|$)/i);
    if (match) return `Working: ${match[1].slice(0, 30)}`;
  }

  if (content.toLowerCase().includes("blocked")) {
    const match = content.match(/blocked (?:on |by )?(.+?)(?:\.|$)/i);
    if (match) return `Blocked: ${match[1].slice(0, 30)}`;
  }

  if (content.toLowerCase().includes("completed") || content.toLowerCase().includes("done")) {
    const match = content.match(/(?:completed|done)[:\s]+(.+?)(?:\.|$)/i);
    if (match) return `Done: ${match[1].slice(0, 30)}`;
  }

  // Default: truncate content
  return content.slice(0, 40) + (content.length > 40 ? "..." : "");
}
