"use client";

/**
 * ActivityFeed - IMPACT FEED
 * Shows: commits with files/lines, task completions, deploys
 * Hides: heartbeats, "posted to #dev", noise
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  limit?: number;
  className?: string;
}

// Types
type ActivityEvent = {
  _id: string;
  eventType?: string;
  agentName?: string;
  linearIdentifier?: string;
  description?: string;
  timestamp?: number;
  metadata?: { toStatus?: string; assignedTo?: string };
};

type GitCommit = {
  _id: string;
  shortHash?: string;
  message?: string;
  agentName?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  pushedAt?: number;
  _creationTime?: number;
};

type FeedItem = {
  id: string;
  type: "commit" | "task" | "deploy" | "comms";
  icon: string;
  agent: string;
  action: string;
  detail: string;
  meta?: string;
  timestamp: number;
  color: string;
};

// NOISE FILTERS
const NOISE_EVENT_TYPES = ["channel_message", "heartbeat", "message", "posted"];
const NOISE_PATTERNS = [
  /posted to #/i,
  /heartbeat/i,
  /status.?ok/i,
  /standing by/i,
  /session (start|complete)/i,
  /online/i,
];

// HIGH IMPACT event types
const IMPACT_EVENTS = ["completed", "push", "pr_merged", "deploy_success", "created", "dm_sent", "dm_received", "dm_read", "dm_replied"];

// DM event type → icon + label
const DM_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  dm_sent: { icon: "\u{1F4E8}", label: "sent", color: "text-purple-400" },
  dm_received: { icon: "\u{1F4EC}", label: "received", color: "text-blue-400" },
  dm_read: { icon: "\u{1F441}\uFE0F", label: "read", color: "text-secondary" },
  dm_replied: { icon: "\u{21A9}\uFE0F", label: "replied", color: "text-cyan-400" },
};

export function ActivityFeed({ limit = 20, className }: ActivityFeedProps) {
  // Fetch activity events
  const rawEvents = useQuery(api.activityEvents.list, { limit: limit * 2 }) as ActivityEvent[] | undefined;

  // Fetch git commits
  const commits = useQuery(api.gitActivity.getRecent, { limit }) as GitCommit[] | undefined;

  // Merge and filter into unified feed
  const feed = useMemo(() => {
    const items: FeedItem[] = [];

    // Process git commits - HIGH IMPACT
    if (commits) {
      for (const commit of commits) {
        const message = commit.message?.split("\n")[0]?.slice(0, 45) || "";
        const metaParts: string[] = [];
        if (commit.filesChanged) metaParts.push(`${commit.filesChanged} files`);
        if (commit.additions) metaParts.push(`+${commit.additions}`);
        if (commit.deletions) metaParts.push(`-${commit.deletions}`);

        items.push({
          id: commit._id,
          type: "commit",
          icon: "!",
          agent: commit.agentName?.toUpperCase() || "?",
          action: "shipped",
          detail: message || commit.shortHash || "code",
          meta: metaParts.length > 0 ? metaParts.join(" ") : undefined,
          timestamp: commit.pushedAt || commit._creationTime || 0,
          color: "text-emerald-400",
        });
      }
    }

    // Process activity events - filter noise
    if (rawEvents) {
      for (const event of rawEvents) {
        const eventType = (event.eventType ?? "").toLowerCase();
        const desc = event.description || "";

        // Skip noise
        if (NOISE_EVENT_TYPES.some(n => eventType.includes(n))) continue;
        if (NOISE_PATTERNS.some(p => p.test(desc) || p.test(eventType))) continue;

        // Only show high-impact events
        if (!IMPACT_EVENTS.some(e => eventType.includes(e))) continue;

        let icon = "-";
        let action = eventType;
        let color = "text-secondary";
        let feedType: FeedItem["type"] = "task";

        // DM communication events
        const dmInfo = DM_ICONS[eventType];
        if (dmInfo) {
          icon = dmInfo.icon;
          action = dmInfo.label;
          color = dmInfo.color;
          feedType = "comms";
        } else if (eventType.includes("completed")) {
          icon = "!";
          action = "completed";
          color = "text-emerald-400";
        } else if (eventType.includes("created")) {
          icon = "+";
          action = "created";
          color = "text-blue-400";
        } else if (eventType.includes("deploy")) {
          icon = "!";
          action = "deployed";
          color = "text-green-400";
        } else if (eventType.includes("merged")) {
          icon = "!";
          action = "merged";
          color = "text-purple-400";
        }

        items.push({
          id: event._id,
          type: feedType,
          icon,
          agent: event.agentName?.toUpperCase() || "?",
          action,
          detail: event.linearIdentifier || desc.slice(0, 40) || "",
          timestamp: event.timestamp || 0,
          color,
        });
      }
    }

    // Sort by timestamp, dedupe
    items.sort((a, b) => b.timestamp - a.timestamp);

    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.agent}-${item.action}-${item.detail.slice(0, 15)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  }, [rawEvents, commits, limit]);

  if (feed.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-primary0", className)}>
        <span className="text-2xl mb-2 block">!</span>
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {feed.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex items-start gap-2 border-b border-border-default px-3 py-2.5 min-h-[44px]",
            "transition-colors hover:bg-surface-1",
            item.type === "commit" && "bg-surface-1/50"
          )}
        >
          {/* Impact indicator */}
          <span className={cn("font-bold text-sm w-4 shrink-0", item.color)}>
            {item.icon}
          </span>

          {/* Agent */}
          <span className="w-12 shrink-0 text-xs font-semibold text-primary truncate">
            {item.agent}
          </span>

          {/* Action */}
          <span className={cn("shrink-0 text-xs font-medium", item.color)}>
            {item.action}
          </span>

          {/* Detail */}
          <span className="flex-1 text-xs text-primary truncate">
            {item.detail}
          </span>

          {/* Meta (files/lines for commits) */}
          {item.meta && (
            <span className="shrink-0 text-[10px] font-mono text-primary0">
              {item.meta}
            </span>
          )}

          {/* Timestamp */}
          <span className="shrink-0 text-[10px] text-tertiary tabular-nums">
            {formatDistanceToNow(item.timestamp, { addSuffix: false })}
          </span>
        </div>
      ))}
    </div>
  );
}
