/**
 * AGT-150: Dashboard Stats Query
 *
 * Provides aggregated stats for the dashboard overview:
 * - Agent counts (active vs total)
 * - Task counts by status
 * - Last sync time
 *
 * Optimized with:
 * - Parallel status queries using indexes
 * - Efficient date range filtering with new by_status_updatedAt index
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Agent is "active" if lastSeen within 5 minutes
const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Get dashboard stats for overview
 * @returns {
 *   agentsActive: number,
 *   agentsTotal: number,
 *   taskCounts: { backlog, todo, inProgress, review, done },
 *   lastSyncTime: number | null
 * }
 */
export const getStats = query({
  args: {
    // AGT-189: Optional date range to filter done tasks by completedAt
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get agents (max 10 - we only have 3)
    const agents = await ctx.db.query("agents").take(10);
    const agentsTotal = agents.length;
    const agentsActive = agents.filter(
      (a) => a.lastSeen > now - ACTIVE_THRESHOLD_MS
    ).length;

    // Count tasks by status using index queries (no full table scan)
    // Optimized: parallel queries with take() limits for non-done statuses
    const [backlog, todo, inProgress, review, done] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "backlog")).take(500),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "todo")).take(500),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "in_progress")).take(200),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "review")).take(200),
      // Use new compound index for done tasks (ordered by updatedAt)
      ctx.db.query("tasks").withIndex("by_status_updatedAt", q => q.eq("status", "done")).order("desc").take(500),
    ]);

    // AGT-189: Filter done tasks by completedAt if date range provided
    // Optimized: pre-sorted by updatedAt makes filtering more efficient
    let filteredDone = done;
    if (args.startTs !== undefined && args.endTs !== undefined) {
      filteredDone = done.filter(t => {
        const completedAt = t.completedAt ?? t.updatedAt;
        return completedAt >= args.startTs! && completedAt <= args.endTs!;
      });
    }

    const taskCounts = {
      backlog: backlog.length,
      todo: todo.length,
      inProgress: inProgress.length,
      review: review.length,
      done: filteredDone.length,
    };

    // Get last sync time from settings or most recent sync event
    const syncSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "lastSyncTime"))
      .first();

    let lastSyncTime: number | null = null;
    if (syncSetting?.value && typeof syncSetting.value === "number") {
      lastSyncTime = syncSetting.value;
    } else {
      // Fallback: check most recent sync activity event
      const syncEvents = await ctx.db
        .query("activityEvents")
        .withIndex("by_category", (q) => q.eq("category", "system"))
        .order("desc")
        .take(10);

      const lastSync = syncEvents.find(
        (e) =>
          e.eventType === "sync_completed" ||
          e.eventType === "sync_started" ||
          (e.metadata?.source === "linear_sync")
      );

      if (lastSync) {
        lastSyncTime = lastSync.timestamp;
      }
    }

    return {
      agentsActive,
      agentsTotal,
      taskCounts,
      lastSyncTime,
    };
  },
});

// Agent avatar/color mapping for live stream display
const AGENT_COLORS: Record<string, string> = {
  max: "#8B5CF6",   // purple
  sam: "#3B82F6",   // blue
  leo: "#10B981",   // green
  quinn: "#F59E0B", // amber
  ella: "#EC4899",  // pink
  maya: "#F97316",  // orange
};

const AGENT_AVATARS: Record<string, string> = {
  max: "👨‍💼",
  sam: "⚙️",
  leo: "🎨",
  quinn: "🔍",
  ella: "📝",
  maya: "🎯",
};

/**
 * AGT-321: Live Activity Stream
 *
 * Aggregates recent activity events across all agents into a unified
 * real-time feed. Uses Convex subscriptions for instant updates.
 *
 * Returns last N events sorted by timestamp (newest first), enriched
 * with agent color/avatar for frontend rendering.
 */
export const getLiveStream = query({
  args: {
    limit: v.optional(v.number()), // Default 20, max 50
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);

    // Query activityEvents by timestamp (desc) — uses by_timestamp index
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Enrich with agent display info
    return events.map((event) => {
      const agentKey = event.agentName?.toLowerCase() ?? "system";
      return {
        _id: event._id,
        // Agent info
        agentName: event.agentName,
        agentColor: AGENT_COLORS[agentKey] ?? "#6B7280",
        agentAvatar: AGENT_AVATARS[agentKey] ?? "🤖",
        // Event info
        category: event.category,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        // References
        linearIdentifier: event.linearIdentifier,
        taskId: event.taskId,
        // Metadata subset for display
        commitHash: event.metadata?.commitHash,
        branch: event.metadata?.branch,
        fromStatus: event.metadata?.fromStatus,
        toStatus: event.metadata?.toStatus,
        // Timing
        timestamp: event.timestamp,
      };
    });
  },
});

/**
 * AGT-326: Team-level daily velocity trend.
 *
 * Returns daily task completion counts for the last N days.
 * Used by the Stats page velocity chart.
 */
export const getVelocityTrend = query({
  args: {
    days: v.optional(v.number()), // Default 7, max 30
  },
  handler: async (ctx, args) => {
    const days = Math.min(args.days ?? 7, 30);
    const now = Date.now();
    const startTs = now - days * 24 * 60 * 60 * 1000;

    // Get all done tasks in the period
    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .order("desc")
      .collect();

    // Filter to period and group by date
    const dailyCounts: Record<string, number> = {};

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      dailyCounts[key] = 0;
    }

    for (const task of doneTasks) {
      const completedAt = task.completedAt ?? task.updatedAt;
      if (completedAt < startTs) continue;

      const d = new Date(completedAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      if (dailyCounts[key] !== undefined) {
        dailyCounts[key]++;
      }
    }

    // Return sorted array (oldest first)
    return Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, tasksCompleted: count }));
  },
});

// ─── AGT-327: Activity Feed APIs ─────────────────────────────────────────

// Intent classification keywords
const INTENT_PATTERNS: Array<{ intent: string; keywords: RegExp }> = [
  { intent: "completion", keywords: /\b(done|completed|shipped|deployed|merged|closed|fixed)\b/i },
  { intent: "escalation", keywords: /\b(blocked|stuck|urgent|escalat|T[1-4]|CEO|critical|failed)\b/i },
  { intent: "request", keywords: /\b(need|please|can you|review|check|fix|help|PR)\b/i },
  { intent: "update", keywords: /\b(update|progress|status|working on|started|moving to|building)\b/i },
  { intent: "question", keywords: /\?\s*$/m },
];

function classifyIntent(content: string): string {
  for (const { intent, keywords } of INTENT_PATTERNS) {
    if (keywords.test(content)) return intent;
  }
  return "update"; // default
}

function extractMessageKeywords(content: string): string[] {
  const keywords: string[] = [];

  // Ticket IDs (AGT-xxx)
  const tickets = content.match(/AGT-\d+/gi);
  if (tickets) keywords.push(...tickets.map((t) => t.toUpperCase()));

  // Status words
  const statusWords = content.match(/\b(done|blocked|deployed|completed|failed|in.progress|review|backlog)\b/gi);
  if (statusWords) keywords.push(...statusWords.map((w) => w.toLowerCase()));

  // Agent names
  const agents = content.match(/\b(sam|leo|max|quinn|ella|maya|son)\b/gi);
  if (agents) keywords.push(...agents.map((a) => a.toLowerCase()));

  // Deduplicate
  return [...new Set(keywords)];
}

/**
 * AGT-327: List all messages (DMs + channels) with extracted keywords and intent.
 */
export const getMessagesWithKeywords = query({
  args: {
    limit: v.optional(v.number()), // Default 30, max 50
    type: v.optional(v.string()),  // "dm", "comment", "dispatch", "system" or undefined for all
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 30, 50);

    let messagesQuery = ctx.db
      .query("unifiedMessages");

    let messages;
    if (args.type) {
      messages = await messagesQuery
        .withIndex("by_type", (q: any) => q.eq("type", args.type))
        .order("desc")
        .take(limit);
    } else {
      messages = await messagesQuery
        .order("desc")
        .take(limit);
    }

    return messages.map((msg) => {
      const keywords = extractMessageKeywords(msg.content);
      const intent = classifyIntent(msg.content);
      const agentKey = msg.fromAgent?.toLowerCase() ?? "system";

      return {
        _id: msg._id,
        from: msg.fromAgent,
        to: msg.toAgent,
        fromColor: AGENT_COLORS[agentKey] ?? "#6B7280",
        fromAvatar: AGENT_AVATARS[agentKey] ?? "🤖",
        type: msg.type,
        content: msg.content,
        summary: msg.content.length > 120 ? msg.content.slice(0, 120) + "..." : msg.content,
        keywords,
        intent,
        priority: msg.priority,
        linearIdentifier: msg.linearIdentifier,
        timestamp: msg.createdAt,
      };
    });
  },
});

/**
 * AGT-327: Enriched activity events with intent classification.
 * Combines activityEvents with agent hydration and intent tagging.
 */
export const getActivityFeedEnriched = query({
  args: {
    limit: v.optional(v.number()), // Default 30, max 50
    category: v.optional(v.string()), // "task", "git", "deploy", "system", "message"
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 30, 50);

    let events;
    if (args.category) {
      events = await ctx.db
        .query("activityEvents")
        .withIndex("by_category", (q: any) => q.eq("category", args.category))
        .order("desc")
        .take(limit);
    } else {
      events = await ctx.db
        .query("activityEvents")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);
    }

    return events.map((event) => {
      const agentKey = event.agentName?.toLowerCase() ?? "system";
      const content = event.description ?? event.title ?? "";
      const keywords = extractMessageKeywords(content);
      const intent = classifyIntent(content);

      return {
        _id: event._id,
        agentName: event.agentName,
        agentColor: AGENT_COLORS[agentKey] ?? "#6B7280",
        agentAvatar: AGENT_AVATARS[agentKey] ?? "🤖",
        category: event.category,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        keywords,
        intent,
        linearIdentifier: event.linearIdentifier,
        taskId: event.taskId,
        metadata: event.metadata,
        timestamp: event.timestamp,
      };
    });
  },
});
