/**
 * AGT-137: Unified Activity Events System
 *
 * Single source of truth for all activity tracking.
 * Typed categories, proper entity references, human-readable display fields.
 *
 * Categories:
 * - task: Task status changes, assignments, completions
 * - git: Commits, pushes, PRs (from GitHub webhooks)
 * - deploy: Vercel deployments (from Vercel webhooks)
 * - system: Sync events, errors, admin actions
 * - message: Agent communications
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Event categories
export const CATEGORIES = ["task", "git", "deploy", "system", "message"] as const;
export type EventCategory = (typeof CATEGORIES)[number];

// Common event types per category
export const EVENT_TYPES = {
  task: ["created", "status_change", "assigned", "completed", "commented"],
  git: ["push", "pr_opened", "pr_merged", "commit"],
  deploy: ["started", "success", "failed", "cancelled"],
  system: ["sync_started", "sync_completed", "sync_failed", "error"],
  message: ["sent", "mentioned"],
} as const;

// Helper to get agent name from ID
async function getAgentName(
  db: any,
  agentId: Id<"agents">
): Promise<string> {
  const agent = await db.get(agentId);
  return agent?.name?.toLowerCase() ?? "unknown";
}

/**
 * Log a new activity event
 */
export const log = mutation({
  args: {
    agentId: v.id("agents"),
    category: v.union(
      v.literal("task"),
      v.literal("git"),
      v.literal("deploy"),
      v.literal("system"),
      v.literal("message")
    ),
    eventType: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    metadata: v.optional(
      v.object({
        fromStatus: v.optional(v.string()),
        toStatus: v.optional(v.string()),
        commitHash: v.optional(v.string()),
        branch: v.optional(v.string()),
        filesChanged: v.optional(v.array(v.string())),
        deploymentUrl: v.optional(v.string()),
        deploymentStatus: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
        source: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const agentName = await getAgentName(ctx.db, args.agentId);

    return await ctx.db.insert("activityEvents", {
      agentId: args.agentId,
      agentName,
      category: args.category,
      eventType: args.eventType,
      title: args.title,
      description: args.description,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      projectId: args.projectId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

/**
 * Helper: Log task event (common pattern)
 */
export const logTaskEvent = mutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
    eventType: v.string(), // "created", "status_change", "assigned", "completed"
    title: v.string(),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agentName = await getAgentName(ctx.db, args.agentId);
    const task = await ctx.db.get(args.taskId);

    return await ctx.db.insert("activityEvents", {
      agentId: args.agentId,
      agentName,
      category: "task",
      eventType: args.eventType,
      title: args.title,
      taskId: args.taskId,
      linearIdentifier: task?.linearIdentifier,
      projectId: task?.projectId,
      metadata: {
        fromStatus: args.fromStatus,
        toStatus: args.toStatus,
        source: args.source,
      },
      timestamp: Date.now(),
    });
  },
});

/**
 * List recent events (for activity feed)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("task"),
        v.literal("git"),
        v.literal("deploy"),
        v.literal("system"),
        v.literal("message")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.category) {
      const events = await ctx.db
        .query("activityEvents")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .take(limit);
      return events;
    }

    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return events;
  },
});

/**
 * List events with agent details (for rich activity feed).
 * Never throws — returns [] on error so /activity and /dashboard do not crash (AGT-140, AGT-141).
 */
export const listWithAgents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 50;

      const events = await ctx.db
        .query("activityEvents")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);

      const agentIds = Array.from(new Set(events.map((e) => e.agentId)));
      const agents = await Promise.all(agentIds.map((id) => ctx.db.get(id)));
      const agentMap = new Map(
        agents.filter(Boolean).map((a) => [a!._id, a])
      );

      return events.map((event) => ({
        ...event,
        agent: agentMap.get(event.agentId) ?? null,
      }));
    } catch {
      return [];
    }
  },
});

/**
 * Get events for a specific task
 */
export const getByTask = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .take(args.limit ?? 20);
    return events;
  },
});

/**
 * Get events by agent
 */
export const getByAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit ?? 50);
    return events;
  },
});

/**
 * Get events by Linear identifier (e.g., "AGT-137")
 */
export const getByLinearId = query({
  args: {
    linearIdentifier: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_linearId", (q) =>
        q.eq("linearIdentifier", args.linearIdentifier)
      )
      .order("desc")
      .take(args.limit ?? 20);
    return events;
  },
});

/**
 * Get events in a time range
 */
export const getByTimeRange = query({
  args: {
    startTs: v.number(),
    endTs: v.number(),
    category: v.optional(
      v.union(
        v.literal("task"),
        v.literal("git"),
        v.literal("deploy"),
        v.literal("system"),
        v.literal("message")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Fetch all events in desc order then filter by time range
    // (Convex doesn't support range queries on indexes)
    const allEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    let filtered = allEvents.filter(
      (e) => e.timestamp >= args.startTs && e.timestamp <= args.endTs
    );

    if (args.category) {
      filtered = filtered.filter((e) => e.category === args.category);
    }

    return filtered;
  },
});

/**
 * Migration: Backfill from old activities table
 */
export const migrateFromActivities = mutation({
  handler: async (ctx) => {
    const oldActivities = await ctx.db.query("activities").collect();
    const agents = await ctx.db.query("agents").collect();
    const tasks = await ctx.db.query("tasks").collect();

    const agentMap = new Map(agents.map((a) => [a._id, a]));
    const taskMap = new Map(tasks.map((t) => [t._id, t]));

    let migrated = 0;
    let skipped = 0;

    for (const activity of oldActivities) {
      const agent = agentMap.get(activity.agent);
      if (!agent) {
        skipped++;
        continue;
      }

      // Map old action to new category/eventType
      let category: EventCategory = "system";
      let eventType = activity.action;

      if (activity.action.includes("task")) {
        category = "task";
        eventType = activity.action.replace("_task", "").replace("task_", "");
      }

      // Try to resolve task from target
      let taskId: Id<"tasks"> | undefined;
      let linearIdentifier: string | undefined;
      let projectId: Id<"projects"> | undefined;

      if (typeof activity.target === "string" && activity.target.length > 20) {
        const task = taskMap.get(activity.target as Id<"tasks">);
        if (task) {
          taskId = task._id;
          linearIdentifier = task.linearIdentifier;
          projectId = task.projectId;
        }
      }

      // Build title from action
      const title = `${agent.name} ${activity.action.replace(/_/g, " ")}`;

      await ctx.db.insert("activityEvents", {
        agentId: activity.agent,
        agentName: agent.name.toLowerCase(),
        category,
        eventType,
        title,
        taskId,
        linearIdentifier,
        projectId,
        metadata: {
          source: "migration",
          ...(activity.metadata as object ?? {}),
        },
        timestamp: activity.createdAt,
      });

      migrated++;
    }

    return {
      message: `Migrated ${migrated} events, skipped ${skipped}`,
      migrated,
      skipped,
      total: oldActivities.length,
    };
  },
});

/**
 * Cleanup old events (keep last N days)
 */
export const cleanup = mutation({
  args: {
    daysToKeep: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.daysToKeep * 24 * 60 * 60 * 1000;

    const oldEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .collect();

    const toDelete = oldEvents.filter((e) => e.timestamp < cutoff);

    for (const event of toDelete) {
      await ctx.db.delete(event._id);
    }

    return {
      deleted: toDelete.length,
      cutoffDate: new Date(cutoff).toISOString(),
    };
  },
});
