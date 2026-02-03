import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveAgentIdByName } from "./agentMappings";

// CREATE (ADR-001: agentName from caller for attribution, NOT Linear API key)
export const log = mutation({
  args: {
    agentName: v.string(),
    action: v.string(),
    target: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const agentId = await resolveAgentIdByName(ctx.db, args.agentName);
    const activityId = await ctx.db.insert("activities", {
      agent: agentId,
      action: args.action,
      target: args.target,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
    return activityId;
  },
});

// READ - Get all activities (AGT-192: default limit 100 to reduce costs)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

// READ - Get activity by ID
export const get = query({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// READ - Get activities by agent (AGT-192: default limit 50)
export const getByAgent = query({
  args: {
    agent: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agent", args.agent))
      .order("desc")
      .take(limit);
  },
});

// Task-related actions: target is task id — resolve to linearIdentifier + title (AGT-99)
const TASK_ACTIONS = new Set([
  "created_task",
  "updated_task",
  "updated_task_status",
  "assigned_task",
  "deleted_task",
  "completed_task",   // AGT-124: from agentActions
  "started_task",     // AGT-124: from agentActions
  "commented_task",   // AGT-124: from agentActions
]);

// READ - Get recent activities with agent details; resolve task target to linearId + title
// AGT-192: Use .take() instead of .collect() to reduce bandwidth costs
export const listWithAgents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 50;
      const limitedActivities = await ctx.db
        .query("activities")
        .withIndex("by_created_at")
        .order("desc")
        .take(limit);

      const activitiesWithAgents = await Promise.all(
        limitedActivities.map(async (activity) => {
          const agent = await ctx.db.get(activity.agent);
          let targetDisplay: string | undefined;
          if (TASK_ACTIONS.has(activity.action) && activity.target) {
            const task = await ctx.db.get(activity.target as Id<"tasks">);
            if (task) {
              targetDisplay = task.linearIdentifier
                ? `${task.linearIdentifier}: ${task.title}`
                : task.title;
            } else {
              const meta = activity.metadata as { linearIdentifier?: string; summary?: string } | undefined;
              if (meta?.linearIdentifier) {
                targetDisplay = meta.summary
                  ? `${meta.linearIdentifier}: ${meta.summary.slice(0, 50)}${meta.summary.length > 50 ? "..." : ""}`
                  : meta.linearIdentifier;
              }
            }
          }
          const rawTarget = activity.target;
          const looksLikeConvexId =
            typeof rawTarget === "string" &&
            rawTarget.length >= 26 &&
            /^[a-z0-9]+$/i.test(rawTarget);
          const fallback = looksLikeConvexId ? "—" : (rawTarget && typeof rawTarget === "string" ? rawTarget : "—");
          return {
            ...activity,
            agent: agent ?? null,
            targetDisplay: (targetDisplay && targetDisplay.length > 0 ? targetDisplay : null) ?? fallback,
          };
        })
      );

      return activitiesWithAgents;
    } catch {
      return [];
    }
  },
});

// READ - Get activities by time range
export const getByTimeRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    // AGT-192: Limit to 200 to reduce bandwidth costs
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .take(200);

    return allActivities.filter(
      (activity) =>
        activity.createdAt >= args.startTime &&
        activity.createdAt <= args.endTime
    );
  },
});

// READ - Get activities by action type (AGT-192: default limit 50)
export const getByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    // AGT-192: Limit initial fetch to reduce bandwidth
    const allActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .order("desc")
      .take(200);

    const filtered = allActivities.filter(
      (activity) => activity.action === args.action
    );

    return filtered.slice(0, limit);
  },
});

// DELETE - Remove old activities (cleanup)
export const cleanup = mutation({
  args: {
    olderThan: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    const oldActivities = await ctx.db
      .query("activities")
      .withIndex("by_created_at")
      .collect();

    const toDelete = oldActivities.filter(
      (activity) => activity.createdAt < args.olderThan
    );

    for (const activity of toDelete) {
      await ctx.db.delete(activity._id);
    }

    return toDelete.length;
  },
});

// DELETE - Remove activity by ID
export const remove = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// MIGRATION - Backfill activities for existing tasks (one-time)
// Creates "updated_task_status" activities for all tasks that don't have one
export const backfillFromTasks = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get all tasks
    const tasks = await ctx.db.query("tasks").collect();

    // Get existing activities to avoid duplicates
    const existingActivities = await ctx.db.query("activities").collect();
    const tasksWithActivity = new Set(
      existingActivities
        .filter((a) => a.action === "updated_task_status")
        .map((a) => a.target)
    );

    // Get system agent (PM) as fallback
    const agents = await ctx.db.query("agents").collect();
    const systemAgent = agents.find((a) => a.role === "pm");

    if (!systemAgent) {
      throw new Error("No PM agent found for backfill");
    }

    let created = 0;

    for (const task of tasks) {
      // Skip if already has activity
      if (tasksWithActivity.has(task._id)) {
        continue;
      }

      // Use task assignee or createdBy or system agent
      const activityAgent = task.assignee || task.createdBy || systemAgent._id;

      await ctx.db.insert("activities", {
        agent: activityAgent,
        action: "updated_task_status",
        target: task._id,
        metadata: {
          from: null,
          to: task.status,
          source: "backfill",
          linearIdentifier: task.linearIdentifier || null,
        },
        createdAt: task.updatedAt || task.createdAt || now,
      });

      created++;
    }

    return {
      message: `Backfilled ${created} activities for ${tasks.length} tasks`,
      created,
      total: tasks.length,
    };
  },
});
