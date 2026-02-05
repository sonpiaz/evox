"use client";

/**
 * AGT-327: Rich Activity Feed — Messages with Keywords & Intent
 * Cycle 3 — "Signal Extractor"
 *
 * Truth #1: Visibility = Trust
 * Truth #4: Signal Over Noise
 *
 * Shows: sender → recipient, keywords highlighted, intent badges, category filters
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type FeedCategory = "all" | "tasks" | "messages" | "commits" | "alerts";

const CATEGORY_LABELS: Record<FeedCategory, string> = {
  all: "All",
  tasks: "Tasks",
  messages: "Messages",
  commits: "Commits",
  alerts: "Alerts",
};

/** Agent colors for consistency */
const AGENT_COLORS: Record<string, string> = {
  max: "text-purple-400",
  sam: "text-emerald-400",
  leo: "text-blue-400",
  quinn: "text-amber-400",
};

/** Intent classification */
type Intent = "update" | "completion" | "request" | "escalation" | "question" | "system";

const INTENT_STYLES: Record<Intent, { label: string; color: string }> = {
  update: { label: "UPDATE", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completion: { label: "DONE", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  request: { label: "REQUEST", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  escalation: { label: "ESCALATION", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  question: { label: "QUESTION", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  system: { label: "SYSTEM", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

/** Classify intent from message content */
function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  if (/\bcomplete[d]?\b|\bdone\b|\bshipped\b|\bclosed?\b|\bmerge[d]?\b/.test(lower)) return "completion";
  if (/\bblocked\b|\bescalat\b|\burgent\b|\bcritical\b|\boffline\b/.test(lower)) return "escalation";
  if (/\brequest\b|\bplease\b|\bneed\b|\bcan you\b|\bhelp\b/.test(lower)) return "request";
  if (/\?\s*$|\bhow\b|\bwhat\b|\bwhy\b|\bwhere\b/.test(lower)) return "question";
  if (/\bsystem\b|\bcron\b|\bdeploy\b|\bbuild\b/.test(lower)) return "system";
  return "update";
}

/** Extract keywords from text */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  // Ticket IDs
  const tickets = text.match(/AGT-\d+/gi);
  if (tickets) keywords.push(...tickets.map(t => t.toUpperCase()));
  // Status words
  const statusWords = text.match(/\b(done|blocked|deployed|shipped|merged|failed|started|completed|review|fix|feat|chore)\b/gi);
  if (statusWords) keywords.push(...statusWords.map(w => w.toLowerCase()));
  // Deduplicate
  return [...new Set(keywords)].slice(0, 5);
}

type FeedItem = {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  category: FeedCategory;
  intent: Intent;
  keywords: string[];
};

/** Keyword badge */
function KeywordBadge({ keyword }: { keyword: string }) {
  const isTicket = /^AGT-\d+$/i.test(keyword);
  const isSuccess = /^(done|shipped|merged|completed|deployed)$/.test(keyword);
  const isFailure = /^(blocked|failed)$/.test(keyword);

  return (
    <span className={cn(
      "inline-block text-[9px] px-1.5 py-0.5 rounded font-medium",
      isTicket ? "bg-purple-500/20 text-purple-400" :
      isSuccess ? "bg-emerald-500/20 text-emerald-400" :
      isFailure ? "bg-red-500/20 text-red-400" :
      "bg-zinc-500/20 text-zinc-400"
    )}>
      {keyword}
    </span>
  );
}

/** Single feed item */
function FeedItemRow({ item }: { item: FeedItem }) {
  const agentColor = AGENT_COLORS[item.from.toLowerCase()] || "text-zinc-400";
  const intentStyle = INTENT_STYLES[item.intent];

  return (
    <div className="border-b border-white/[0.03] px-4 py-3 hover:bg-white/[0.02] transition-colors">
      {/* Header: timestamp + from → to + intent */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] text-white/25 tabular-nums shrink-0">
          {formatDistanceToNow(item.timestamp, { addSuffix: false })}
        </span>
        <span className={cn("text-xs font-bold uppercase", agentColor)}>{item.from}</span>
        <span className="text-[10px] text-white/15">&rarr;</span>
        <span className="text-xs text-white/40">{item.to}</span>
        <span className="flex-1" />
        <span className={cn("text-[9px] px-1.5 py-0.5 rounded border font-medium", intentStyle.color)}>
          {intentStyle.label}
        </span>
      </div>

      {/* Content */}
      <div className="text-sm text-white/60 line-clamp-2 mb-1.5">
        {item.content}
      </div>

      {/* Keywords */}
      {item.keywords.length > 0 && (
        <div className="flex items-center gap-1.5">
          {item.keywords.map(kw => <KeywordBadge key={kw} keyword={kw} />)}
        </div>
      )}
    </div>
  );
}

interface RichActivityFeedProps {
  className?: string;
}

export function RichActivityFeed({ className }: RichActivityFeedProps) {
  const [category, setCategory] = useState<FeedCategory>("all");

  // Data sources
  const commsMessages = useQuery(api.agentMessages.getChannelMessagesWithKeywords, { limit: 30 });
  const activityEvents = useQuery(api.activityEvents.list, { limit: 30 });
  const gitCommits = useQuery(api.gitActivity.getRecent, { limit: 15 });

  // Merge all sources into unified feed
  const feed = useMemo(() => {
    const items: FeedItem[] = [];

    // Channel messages
    if (commsMessages?.messages) {
      for (const msg of commsMessages.messages) {
        const content = msg.message || msg.content || "";
        if (!content) continue;
        items.push({
          id: msg._id || `msg-${msg.timestamp}`,
          from: msg.from || msg.agentName || "unknown",
          to: msg.channel ? `#${msg.channel}` : (msg.to || "team"),
          content,
          timestamp: msg.timestamp || Date.now(),
          category: "messages",
          intent: classifyIntent(content),
          keywords: msg.keywords?.length ? msg.keywords : extractKeywords(content),
        });
      }
    }

    // Activity events
    if (activityEvents) {
      for (const event of activityEvents) {
        const cat = (event.category || "").toLowerCase();
        const type = (event.eventType || "").toLowerCase();
        if (type === "heartbeat" || type === "heartbeat_received") continue;

        const content = event.title || event.description || "";
        if (!content) continue;

        let feedCat: FeedCategory = "tasks";
        if (cat === "git") feedCat = "commits";
        else if (cat === "system" || type === "error") feedCat = "alerts";

        items.push({
          id: event._id,
          from: event.agentName || "system",
          to: event.category || "system",
          content,
          timestamp: event.timestamp,
          category: feedCat,
          intent: classifyIntent(content),
          keywords: extractKeywords(content),
        });
      }
    }

    // Git commits
    if (gitCommits) {
      for (const commit of gitCommits) {
        const msg = commit.message.split("\n")[0];
        items.push({
          id: commit._id,
          from: commit.agentName || "unknown",
          to: commit.branch || "main",
          content: msg,
          timestamp: commit.pushedAt,
          category: "commits",
          intent: classifyIntent(msg),
          keywords: extractKeywords(msg),
        });
      }
    }

    // Sort by time, deduplicate
    items.sort((a, b) => b.timestamp - a.timestamp);
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${item.from}-${item.content.slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [commsMessages, activityEvents, gitCommits]);

  // Filter by category
  const filteredFeed = category === "all" ? feed : feed.filter(i => i.category === category);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<FeedCategory, number> = { all: feed.length, tasks: 0, messages: 0, commits: 0, alerts: 0 };
    for (const item of feed) {
      counts[item.category]++;
    }
    return counts;
  }, [feed]);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Category Filters */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.05] overflow-x-auto">
        {(Object.keys(CATEGORY_LABELS) as FeedCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[36px] shrink-0",
              category === cat
                ? "bg-white/10 text-white"
                : "text-white/30 hover:bg-white/5 hover:text-white/60"
            )}
          >
            <span>{CATEGORY_LABELS[cat]}</span>
            <span className={cn(
              "text-[10px] tabular-nums",
              category === cat ? "text-white/50" : "text-white/15"
            )}>
              {categoryCounts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filteredFeed.length > 0 ? (
          filteredFeed.map(item => <FeedItemRow key={item.id} item={item} />)
        ) : (
          <div className="text-center py-16 text-white/20 text-sm">
            No {category === "all" ? "" : category + " "}activity yet
          </div>
        )}
      </div>
    </div>
  );
}
