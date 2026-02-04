// ============================================================
// Task Splitting Mutations (split from taskSplitting.ts for Convex compatibility)
// Mutations cannot be in "use node" files
// ============================================================

import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Log task split activity
 */
export const logTaskSplit = mutation({
  args: {
    agent: v.string(),
    parentTaskId: v.string(),
    subIssueCount: v.number(),
    subIssueIds: v.array(v.string()),
    poolId: v.optional(v.id("workerPools")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find agent
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(
      (a) => a.name.toLowerCase() === args.agent.toLowerCase()
    );

    if (!agent) {
      console.warn(`Agent not found: ${args.agent}`);
      return { success: false };
    }

    // Log to execution logs
    await ctx.db.insert("executionLogs", {
      agentName: args.agent.toLowerCase(),
      level: "info",
      message: `Split ${args.parentTaskId} into ${args.subIssueCount} subtasks: ${args.subIssueIds.join(", ")}`,
      linearIdentifier: args.parentTaskId,
      metadata: {
        poolId: args.poolId,
        subtasks: args.subIssueIds,
      },
      timestamp: now,
    });

    // Log activity event
    await ctx.db.insert("activityEvents", {
      agentId: agent._id,
      agentName: args.agent.toLowerCase(),
      category: "task",
      eventType: "task_split",
      title: `${args.agent.toUpperCase()} split ${args.parentTaskId} into ${args.subIssueCount} subtasks`,
      description: `Created subtasks: ${args.subIssueIds.join(", ")}`,
      linearIdentifier: args.parentTaskId,
      metadata: {
        source: "task_splitting",
        subtaskCount: args.subIssueCount,
        subtasks: args.subIssueIds,
      },
      timestamp: now,
    });

    return { success: true };
  },
});
