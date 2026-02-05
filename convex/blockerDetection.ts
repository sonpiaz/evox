/**
 * AGT-317: Blocker Detection Engine
 *
 * Automatically detects blocked tasks by scanning the blockedBy field.
 * Runs on a 5-min cron. Fires alerts.triggerTaskBlocked() on detection.
 *
 * blockedBy stores task identifiers (Linear identifiers like "AGT-72"
 * or Convex task IDs). A task is "blocked" if ANY blocker is incomplete.
 * A blocker is "unresolvable" if it's in a terminal failure state.
 */
import { v } from "convex/values";
import { query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Resolve a single blocker string to its task and status.
 * Supports both Linear identifiers ("AGT-72") and Convex task IDs.
 */
async function resolveBlocker(
  ctx: { db: { get: (id: Id<"tasks">) => Promise<any>; query: (table: string) => any } },
  blocker: string
) {
  // Try as Linear identifier first (e.g. "AGT-72")
  if (blocker.includes("-") && !blocker.includes("|")) {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q: any) => q.eq("linearIdentifier", blocker))
      .first();
    if (task) {
      return {
        id: task._id,
        identifier: blocker,
        title: task.title,
        status: task.status,
        resolved: task.status === "done",
        unresolvable: false, // Will be set below
      };
    }
  }

  // Try as Convex task ID
  try {
    const task = await ctx.db.get(blocker as Id<"tasks">);
    if (task) {
      return {
        id: task._id,
        identifier: task.linearIdentifier ?? task._id,
        title: task.title,
        status: task.status,
        resolved: task.status === "done",
        unresolvable: false,
      };
    }
  } catch {
    // Not a valid Convex ID, ignore
  }

  // Blocker not found — treat as unresolvable
  return {
    id: null,
    identifier: blocker,
    title: "Unknown task",
    status: "not_found",
    resolved: false,
    unresolvable: true,
  };
}

/**
 * Get all blockers for a task with their resolution status.
 */
export const getTaskBlockers = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task || !task.blockedBy || task.blockedBy.length === 0) {
      return [];
    }

    const blockers = [];
    for (const blockerRef of task.blockedBy) {
      const resolved = await resolveBlocker(ctx, blockerRef);
      blockers.push(resolved);
    }
    return blockers;
  },
});

/**
 * Check if a task is currently blocked (any blocker incomplete).
 */
export const isTaskBlocked = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task || !task.blockedBy || task.blockedBy.length === 0) {
      return false;
    }

    for (const blockerRef of task.blockedBy) {
      const blocker = await resolveBlocker(ctx, blockerRef);
      if (!blocker.resolved) return true;
    }
    return false;
  },
});

/**
 * Internal query: find all in_progress tasks that have blockedBy set.
 */
export const getTasksWithBlockers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const inProgressTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
      .collect();

    return inProgressTasks.filter(
      (t: any) => t.blockedBy && t.blockedBy.length > 0
    );
  },
});

/**
 * Internal mutation: set blockedSince timestamp on a task.
 */
export const markTaskBlocked = internalMutation({
  args: {
    taskId: v.id("tasks"),
    blockedSince: v.number(),
  },
  handler: async (ctx, { taskId, blockedSince }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    // Only set if not already set
    if (!task.blockedSince) {
      await ctx.db.patch(taskId, { blockedSince });
    }
  },
});

/**
 * Internal mutation: clear blockedSince when blockers resolve.
 */
export const clearTaskBlocked = internalMutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    if (task.blockedSince) {
      await ctx.db.patch(taskId, { blockedSince: undefined });
    }
  },
});

/**
 * Cron action: scan in_progress tasks, detect blockers, fire alerts.
 * Runs every 5 minutes via crons.ts.
 */
export const detectBlockedTasks = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasksWithBlockers = await ctx.runQuery(
      internal.blockerDetection.getTasksWithBlockers
    );

    let newlyBlocked = 0;
    let stillBlocked = 0;
    let resolved = 0;

    for (const task of tasksWithBlockers) {
      let hasUnresolvedBlocker = false;
      const unresolvedNames: string[] = [];

      for (const blockerRef of task.blockedBy) {
        const blocker = await resolveBlockerInAction(ctx, blockerRef);
        if (!blocker.resolved) {
          hasUnresolvedBlocker = true;
          unresolvedNames.push(blocker.identifier);
        }
      }

      if (hasUnresolvedBlocker) {
        if (!task.blockedSince) {
          // Newly blocked — set timestamp and fire alert
          await ctx.runMutation(
            internal.blockerDetection.markTaskBlocked,
            { taskId: task._id, blockedSince: Date.now() }
          );
          await ctx.runAction(internal.alerts.triggerTaskBlocked, {
            taskId: task._id,
            linearIdentifier: task.linearIdentifier,
            taskTitle: task.title,
            blockedBy: unresolvedNames.join(", "),
            agentName: task.agentName,
          });
          newlyBlocked++;
        } else {
          stillBlocked++;
        }
      } else {
        // All blockers resolved — clear blocked state
        if (task.blockedSince) {
          await ctx.runMutation(
            internal.blockerDetection.clearTaskBlocked,
            { taskId: task._id }
          );
          resolved++;
        }
      }
    }

    if (newlyBlocked > 0 || resolved > 0) {
      console.log(
        `[BlockerDetection] newly_blocked=${newlyBlocked} still_blocked=${stillBlocked} resolved=${resolved}`
      );
    }
  },
});

/**
 * Resolve blocker inside an action context (uses runQuery for DB access).
 */
async function resolveBlockerInAction(
  ctx: { runQuery: (ref: any, args: any) => Promise<any> },
  blockerRef: string
) {
  const result = await ctx.runQuery(
    internal.blockerDetection.resolveBlockerQuery,
    { blockerRef }
  );
  return result;
}

/**
 * Internal query: resolve a single blocker reference.
 * Used by the action context which can't directly access the DB.
 */
export const resolveBlockerQuery = internalQuery({
  args: { blockerRef: v.string() },
  handler: async (ctx, { blockerRef }) => {
    return await resolveBlocker(ctx, blockerRef);
  },
});

/**
 * Get unresolvable blockers — dead-end tasks that are not_found or
 * in a terminal state that will never complete.
 */
export const getUnresolvableBlockers = query({
  args: {},
  handler: async (ctx) => {
    // Get all tasks that have blockedBy set
    const allTasks = await ctx.db.query("tasks").collect();
    const tasksWithBlockers = allTasks.filter(
      (t: any) => t.blockedBy && t.blockedBy.length > 0
    );

    const deadEnds: Array<{
      blockedTaskId: Id<"tasks">;
      blockedTaskTitle: string;
      blockedTaskIdentifier: string | undefined;
      blockerRef: string;
      reason: string;
    }> = [];

    for (const task of tasksWithBlockers) {
      for (const blockerRef of task.blockedBy!) {
        const blocker = await resolveBlocker(ctx, blockerRef);
        if (blocker.unresolvable || blocker.status === "not_found") {
          deadEnds.push({
            blockedTaskId: task._id,
            blockedTaskTitle: task.title,
            blockedTaskIdentifier: task.linearIdentifier,
            blockerRef,
            reason: "Blocker task not found",
          });
        }
      }
    }

    return deadEnds;
  },
});

/**
 * AGT-317 Step 4: Check if a failed task blocks other tasks.
 * Called from dispatches.fail to propagate blocker state.
 */
export const checkDependentsOfFailedTask = internalAction({
  args: {
    taskLinearIdentifier: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    // Find tasks that list this failed task in their blockedBy
    const dependents = await ctx.runQuery(
      internal.blockerDetection.findDependentTasks,
      {
        taskLinearIdentifier: args.taskLinearIdentifier,
        taskId: args.taskId,
      }
    );

    for (const dep of dependents) {
      if (!dep.blockedSince) {
        await ctx.runMutation(
          internal.blockerDetection.markTaskBlocked,
          { taskId: dep._id, blockedSince: Date.now() }
        );
        await ctx.runAction(internal.alerts.triggerTaskBlocked, {
          taskId: dep._id,
          linearIdentifier: dep.linearIdentifier,
          taskTitle: dep.title,
          blockedBy: args.taskLinearIdentifier ?? "failed task",
          agentName: dep.agentName,
        });
      }
    }
  },
});

/**
 * Internal query: find tasks whose blockedBy includes a given identifier.
 */
export const findDependentTasks = internalQuery({
  args: {
    taskLinearIdentifier: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q: any) => q.eq("status", "in_progress"))
      .collect();

    return allTasks.filter((t: any) => {
      if (!t.blockedBy || t.blockedBy.length === 0) return false;
      return t.blockedBy.some(
        (ref: string) =>
          (args.taskLinearIdentifier && ref === args.taskLinearIdentifier) ||
          (args.taskId && ref === args.taskId)
      );
    });
  },
});
