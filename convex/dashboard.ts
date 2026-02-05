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
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "backlog")).take(200),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "todo")).take(200),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "in_progress")).take(100),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "review")).take(100),
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
