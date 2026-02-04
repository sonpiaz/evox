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
import { mutation, query, internalMutation } from "./_generated/server";
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
 * AGT-168: Check if a similar event was logged recently (deduplication)
 * Returns true if a matching event exists within the window
 */
async function hasRecentEvent(
  db: any,
  linearIdentifier: string,
  eventType: string,
  windowMs: number = 60000 // 60 seconds default
): Promise<boolean> {
  const cutoff = Date.now() - windowMs;

  // Query events by linearId
  const recentEvents = await db
    .query("activityEvents")
    .withIndex("by_linearId", (q: any) => q.eq("linearIdentifier", linearIdentifier))
    .order("desc")
    .take(10);

  return recentEvents.some(
    (e: any) => e.eventType === eventType && e.timestamp > cutoff
  );
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
 * AGT-168: Log task completion from GitHub webhook with correct attribution
 * AGT-179: Uses task owner (agentName/assignee), NOT git author
 *
 * Since Son pushes commits for all agents, the git author is always "sonpiaz"→"max".
 * We need to look at the task's actual owner to determine who completed it.
 */
export const logGitTaskCompletion = internalMutation({
  args: {
    agentName: v.string(), // from git author mapping (may be "max" if Son pushed)
    linearIdentifier: v.string(), // e.g., "AGT-168"
    commitHash: v.string(),
    commitMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Deduplication: check if we already logged this completion recently
    const isDupe = await hasRecentEvent(ctx.db, args.linearIdentifier, "completed", 60000);
    if (isDupe) {
      console.log(`Skipping duplicate completion event for ${args.linearIdentifier}`);
      return { skipped: true, reason: "duplicate" };
    }

    // Find task by linearIdentifier using proper index (AGT-198: fix write conflicts)
    const ticketUpper = args.linearIdentifier.toUpperCase();
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) => q.eq("linearIdentifier", ticketUpper))
      .first();

    // Get all agents for lookup (small table, ~3 records)
    const agents = await ctx.db.query("agents").take(10);
    const agentByName = new Map(agents.map((a) => [a.name.toLowerCase(), a]));
    const agentById = new Map(agents.map((a) => [a._id.toString(), a]));

    // AGT-179: Determine the actual task owner
    // Priority: task.agentName (if NOT "max") > task.assignee > git author
    let actualAgentName = args.agentName.toLowerCase();
    let actualAgent = agentByName.get(actualAgentName);

    if (task) {
      // First try: task.agentName (but NOT if it's "max" - that's the default)
      if (task.agentName && task.agentName.toLowerCase() !== "max") {
        const taskAgent = agentByName.get(task.agentName.toLowerCase());
        if (taskAgent) {
          actualAgent = taskAgent;
          actualAgentName = task.agentName.toLowerCase();
        }
      }

      // Second try: task.assignee
      if (actualAgentName === "max" && task.assignee) {
        const assigneeAgent = agentById.get(task.assignee.toString());
        if (assigneeAgent) {
          actualAgent = assigneeAgent;
          actualAgentName = assigneeAgent.name.toLowerCase();
        }
      }
    }

    if (!actualAgent) {
      console.error(`Agent not found: ${actualAgentName}`);
      return { skipped: true, reason: "agent_not_found" };
    }

    const displayName = actualAgent.name.toUpperCase();
    const title = `${displayName} completed ${args.linearIdentifier}`;
    // AGT-179: Show task title in description for completed events
    const description = task?.title;

    const eventId = await ctx.db.insert("activityEvents", {
      agentId: actualAgent._id,
      agentName: actualAgentName,
      category: "task",
      eventType: "completed",
      title,
      description,
      taskId: task?._id,
      linearIdentifier: args.linearIdentifier,
      projectId: task?.projectId,
      metadata: {
        toStatus: "done",
        commitHash: args.commitHash,
        source: "github-webhook",
      },
      timestamp: Date.now(),
    });

    console.log(`Logged completion for ${args.linearIdentifier} by ${actualAgentName} (git author was ${args.agentName})`);
    return { skipped: false, eventId };
  },
});

/**
 * AGT-168: Log task event from Linear sync/webhook with deduplication
 * Skips if a github-webhook event already exists for the same ticket+eventType
 */
export const logLinearTaskEvent = internalMutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.string(),
    eventType: v.string(), // "completed", "status_change", etc.
    title: v.string(),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Deduplication: check if we already have a recent event from github-webhook
    const isDupe = await hasRecentEvent(ctx.db, args.linearIdentifier, args.eventType, 60000);
    if (isDupe) {
      console.log(`Skipping duplicate Linear event for ${args.linearIdentifier} (github-webhook already logged)`);
      return { skipped: true, reason: "duplicate_from_github" };
    }

    const agentName = await getAgentName(ctx.db, args.agentId);
    const task = args.taskId ? await ctx.db.get(args.taskId) : null;

    const eventId = await ctx.db.insert("activityEvents", {
      agentId: args.agentId,
      agentName,
      category: "task",
      eventType: args.eventType,
      title: args.title,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      projectId: task?.projectId,
      metadata: {
        fromStatus: args.fromStatus,
        toStatus: args.toStatus,
        source: "linear-webhook",
      },
      timestamp: Date.now(),
    });

    return { skipped: false, eventId };
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
    // AGT-192: Limit to 200 events max to reduce bandwidth costs
    // Fetch recent events in desc order then filter by time range
    const allEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(200);

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

/**
 * AGT-144: Backfill events from completed tasks
 * Creates "completed" events for all done tasks that don't have events yet
 */
export const backfillFromCompletedTasks = mutation({
  handler: async (ctx) => {
    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect();

    const agents = await ctx.db.query("agents").collect();
    const agentMap = new Map(agents.map((a) => [a._id, a]));
    const agentByName = new Map(agents.map((a) => [a.name.toLowerCase(), a]));

    // Get existing events to avoid duplicates
    const existingEvents = await ctx.db.query("activityEvents").collect();
    const existingTaskIds = new Set(
      existingEvents
        .filter((e) => e.eventType === "completed" && e.taskId)
        .map((e) => e.taskId?.toString())
    );

    let created = 0;
    let skipped = 0;

    for (const task of doneTasks) {
      // Skip if already has completed event
      if (existingTaskIds.has(task._id.toString())) {
        skipped++;
        continue;
      }

      // Find agent: use agentName, then assignee, then createdBy
      let agent = task.agentName ? agentByName.get(task.agentName.toLowerCase()) : null;
      if (!agent && task.assignee) {
        agent = agentMap.get(task.assignee);
      }
      if (!agent) {
        agent = agentMap.get(task.createdBy);
      }
      if (!agent) {
        skipped++;
        continue;
      }

      const displayName = agent.name.toUpperCase();
      const title = `${displayName} completed ${task.linearIdentifier ?? task.title}`;
      // AGT-179: Show task title in description for completed events
      const description = task.title;

      await ctx.db.insert("activityEvents", {
        agentId: agent._id,
        agentName: agent.name.toLowerCase(),
        category: "task",
        eventType: "completed",
        title,
        description,
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
        projectId: task.projectId,
        metadata: {
          toStatus: "done",
          source: "backfill",
        },
        timestamp: task.updatedAt,
      });
      created++;
    }

    return {
      message: `Backfilled ${created} completed task events, skipped ${skipped}`,
      created,
      skipped,
      totalDone: doneTasks.length,
    };
  },
});

/**
 * AGT-179: Fix wrong "completed" events attributed to "max" instead of actual task owner.
 *
 * Strategy:
 * 1. For each task with multiple "completed" events, find the one from github-webhook (correct attribution)
 * 2. Use that attribution to fix all other "completed" events for the same task
 * 3. For tasks with only "max" attribution and no github-webhook, check task.agentName/assignee
 *
 * Run: npx convex run activityEvents:fixWrongCompletionAttribution
 */
export const fixWrongCompletionAttribution = mutation({
  handler: async (ctx) => {
    // Get all events
    const allEvents = await ctx.db.query("activityEvents").collect();

    // Get all tasks and agents
    const tasks = await ctx.db.query("tasks").collect();
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), t]));

    const agents = await ctx.db.query("agents").collect();
    const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));
    const agentByName = new Map(agents.map((a) => [a.name.toLowerCase(), a]));

    // Group completed events by linearIdentifier
    const completedByTicket = new Map<string, typeof allEvents>();
    for (const event of allEvents) {
      if (event.eventType === "completed" && event.linearIdentifier) {
        const existing = completedByTicket.get(event.linearIdentifier) || [];
        existing.push(event);
        completedByTicket.set(event.linearIdentifier, existing);
      }
    }

    let fixed = 0;
    let skipped = 0;
    const fixes: Array<{ linearId: string; from: string; to: string }> = [];

    for (const [linearId, events] of completedByTicket) {
      // Find the authoritative source: github-webhook event (if any)
      const githubEvent = events.find((e) => e.metadata?.source === "github-webhook");

      // Find events attributed to "max" that need fixing
      const maxEvents = events.filter((e) => e.agentName === "max" && e.metadata?.source !== "github-webhook");

      // Determine correct agent
      let correctAgent = null;
      let correctAgentName: string | null = null;

      if (githubEvent && githubEvent.agentName !== "max") {
        // Use github-webhook attribution (most reliable)
        correctAgent = agentByName.get(githubEvent.agentName.toLowerCase());
        correctAgentName = githubEvent.agentName.toLowerCase();
      } else {
        // Fall back to task data
        const task = [...taskMap.values()].find((t) => t.linearIdentifier === linearId);
        if (task) {
          // First try: task.agentName (but NOT if it's "max")
          if (task.agentName && task.agentName.toLowerCase() !== "max") {
            correctAgent = agentByName.get(task.agentName.toLowerCase());
            correctAgentName = task.agentName.toLowerCase();
          }
          // Second try: assignee
          if (!correctAgent && task.assignee) {
            correctAgent = agentMap.get(task.assignee.toString());
            if (correctAgent) {
              correctAgentName = correctAgent.name.toLowerCase();
            }
          }
        }
      }

      if (!correctAgent || !correctAgentName || correctAgentName === "max") {
        // Can't determine correct agent, skip all events for this ticket
        skipped += events.length;
        continue;
      }

      // Fix all events that are attributed to wrong agent or missing description
      for (const event of events) {
        const task = event.taskId ? taskMap.get(event.taskId.toString()) : null;
        const needsAttribFix = event.agentName !== correctAgentName;
        const needsDescFix = !event.description && task?.title;

        if (needsAttribFix || needsDescFix) {
          const displayName = correctAgent.name.toUpperCase();
          const newTitle = `${displayName} completed ${linearId}`;

          await ctx.db.patch(event._id, {
            agentId: correctAgent._id,
            agentName: correctAgentName,
            title: newTitle,
            description: task?.title || event.description,
          });

          if (needsAttribFix) {
            fixes.push({
              linearId,
              from: event.agentName,
              to: correctAgentName,
            });
          }
          fixed++;
        } else {
          skipped++;
        }
      }
    }

    return {
      message: `Fixed ${fixed} wrong completion attributions, skipped ${skipped}`,
      fixed,
      skipped,
      total: allEvents.filter((e) => e.eventType === "completed").length,
      fixes,
    };
  },
});

/**
 * AGT-144: Delete all records from old activities table
 */
export const deleteOldActivities = mutation({
  handler: async (ctx) => {
    const oldActivities = await ctx.db.query("activities").collect();

    for (const activity of oldActivities) {
      await ctx.db.delete(activity._id);
    }

    return {
      deleted: oldActivities.length,
      message: `Deleted ${oldActivities.length} old activity records`,
    };
  },
});

/**
 * Backfill missing events for tasks that changed status but have no activityEvent
 * Looks at tasks with recent updatedAt but no corresponding event
 */
export const backfillMissingEvents = mutation({
  args: {
    hoursBack: v.optional(v.number()), // default 24 hours
  },
  handler: async (ctx, args) => {
    const hours = args.hoursBack ?? 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    // Get all tasks updated in the window
    const allTasks = await ctx.db.query("tasks").collect();
    const recentTasks = allTasks.filter((t) => t.updatedAt > cutoff);

    // Get all events in the window
    const allEvents = await ctx.db.query("activityEvents").collect();
    const recentEvents = allEvents.filter((e) => e.timestamp > cutoff);

    // Build set of taskIds that have events
    const taskIdsWithEvents = new Set(
      recentEvents
        .filter((e) => e.taskId)
        .map((e) => e.taskId?.toString())
    );

    // Get agents for attribution
    const agents = await ctx.db.query("agents").collect();
    const agentByName = new Map(agents.map((a) => [a.name.toLowerCase(), a]));
    const defaultAgent = agents.find((a) => a.role === "pm") ?? agents[0];

    let created = 0;
    let skipped = 0;

    for (const task of recentTasks) {
      // Skip if already has recent event
      if (taskIdsWithEvents.has(task._id.toString())) {
        skipped++;
        continue;
      }

      // Find agent from task.agentName or default to PM
      const agent = task.agentName
        ? agentByName.get(task.agentName.toLowerCase()) ?? defaultAgent
        : defaultAgent;

      if (!agent) {
        skipped++;
        continue;
      }

      // Determine event type from status
      const eventType = task.status === "done" ? "completed" : "status_change";
      const displayName = agent.name.toUpperCase();
      const title =
        eventType === "completed"
          ? `${displayName} completed ${task.linearIdentifier ?? task.title}`
          : `${displayName} updated ${task.linearIdentifier ?? task.title}`;

      await ctx.db.insert("activityEvents", {
        agentId: agent._id,
        agentName: agent.name.toLowerCase(),
        category: "task",
        eventType,
        title,
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
        projectId: task.projectId,
        metadata: {
          toStatus: task.status,
          source: "backfill_missing",
        },
        timestamp: task.updatedAt,
      });
      created++;
    }

    return {
      message: `Backfilled ${created} missing events, skipped ${skipped}`,
      created,
      skipped,
      totalRecentTasks: recentTasks.length,
      hoursBack: hours,
    };
  },
});
