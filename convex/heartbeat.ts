/**
 * AGT-119: Agent Heartbeat System
 *
 * 15-minute staggered heartbeats per agent:
 * - Check WORKING.md for pending context
 * - Check agentMessages for unread mentions
 * - Check tasks for unstarted assignments
 * - Log HEARTBEAT_OK or flag pending work
 * - Update agent.lastHeartbeat timestamp
 * - Emit activityEvent on each heartbeat
 */
import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Agent names for heartbeat scheduling
const AGENTS = ["max", "sam", "leo"] as const;
type AgentName = (typeof AGENTS)[number];

/**
 * Internal mutation to update agent heartbeat timestamp
 */
export const updateHeartbeat = internalMutation({
  args: {
    agentName: v.string(),
    status: v.union(v.literal("ok"), v.literal("pending_work")),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.agentName))
      .first();

    if (!agent) {
      console.log(`[Heartbeat] Agent ${args.agentName} not found`);
      return { success: false, error: "Agent not found" };
    }

    const now = Date.now();

    // Update agent lastHeartbeat
    await ctx.db.patch(agent._id, {
      lastHeartbeat: now,
      lastSeen: now,
    });

    // Emit activityEvent
    const displayName = agent.name.toUpperCase();
    const title =
      args.status === "ok"
        ? `${displayName} heartbeat OK`
        : `${displayName} has pending work`;

    await ctx.db.insert("activityEvents", {
      agentId: agent._id,
      agentName: agent.name.toLowerCase(),
      category: "system",
      eventType: "heartbeat",
      title,
      description: args.details,
      metadata: {
        source: "heartbeat_scheduler",
      },
      timestamp: now,
    });

    return {
      success: true,
      agentId: agent._id,
      status: args.status,
      timestamp: now,
    };
  },
});

/**
 * Check agent status and pending work
 */
export const checkAgent = internalAction({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: "ok" | "pending_work"; details: string }> => {
    const agentName = args.agentName.toLowerCase() as AgentName;
    const pendingItems: string[] = [];

    // 1. Check for unread agentMessages (mentions)
    interface AgentRecord { _id: Id<"agents">; name: string }
    const agents = await ctx.runQuery(api.agents.list) as AgentRecord[];
    const agent = agents.find((a) => a.name.toLowerCase() === agentName);

    if (!agent) {
      return { status: "ok", details: `Agent ${agentName} not found in DB` };
    }

    // Check unread messages via getUnreadMessages
    const unreadMessages = await ctx.runQuery(api.agentMessages.getUnreadMessages, {
      agentName,
    });

    if (unreadMessages.length > 0) {
      pendingItems.push(`${unreadMessages.length} unread message(s)`);
    }

    // 2. Check for assigned but unstarted tasks (status = todo, assignee = this agent)
    interface TaskRecord { _id: Id<"tasks">; status: string }
    const tasks = await ctx.runQuery(api.tasks.getByAssignee, {
      assignee: agent._id,
    }) as TaskRecord[];

    const todoTasks = tasks.filter((t) => t.status === "todo");
    if (todoTasks.length > 0) {
      pendingItems.push(`${todoTasks.length} unstarted task(s)`);
    }

    // 3. Check WORKING.md for context (via agentMemory.getMemory)
    const workingMemory = await ctx.runQuery(api.agentMemory.getMemory, {
      agentId: agent._id,
      type: "working",
    });

    if (workingMemory?.content) {
      // Check if WORKING.md mentions "BLOCKED" or "PENDING"
      const contentLower = workingMemory.content.toLowerCase();
      if (contentLower.includes("blocked")) {
        pendingItems.push("BLOCKED flag in WORKING.md");
      }
      if (contentLower.includes("pending review")) {
        pendingItems.push("Pending review in WORKING.md");
      }
    }

    // Determine status
    const status = pendingItems.length > 0 ? "pending_work" : "ok";
    const details =
      pendingItems.length > 0
        ? pendingItems.join(", ")
        : "No pending work. Agent idle.";

    // Update heartbeat via mutation
    await ctx.runMutation(internal.heartbeat.updateHeartbeat, {
      agentName,
      status,
      details,
    });

    console.log(`[Heartbeat] ${agentName}: ${status} - ${details}`);

    return { status, details };
  },
});

/**
 * Heartbeat entry points for each agent (called by crons.ts)
 * Staggered at 0, 5, 10 minutes within each 15-min window
 */
type HeartbeatResult = { status: "ok" | "pending_work"; details: string };

export const heartbeatMax = internalAction({
  args: {},
  handler: async (ctx): Promise<HeartbeatResult> => {
    return await ctx.runAction(internal.heartbeat.checkAgent, { agentName: "max" });
  },
});

export const heartbeatSam = internalAction({
  args: {},
  handler: async (ctx): Promise<HeartbeatResult> => {
    return await ctx.runAction(internal.heartbeat.checkAgent, { agentName: "sam" });
  },
});

export const heartbeatLeo = internalAction({
  args: {},
  handler: async (ctx): Promise<HeartbeatResult> => {
    return await ctx.runAction(internal.heartbeat.checkAgent, { agentName: "leo" });
  },
});
