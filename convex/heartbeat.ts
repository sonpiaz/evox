/**
 * AGT-119: Agent Heartbeat System
 * AGT-192/194: Heartbeat Protocol Documentation
 *
 * 15-minute staggered heartbeats per agent:
 * - Check WORKING.md for pending context
 * - Check agentMessages for unread mentions
 * - Check tasks for unstarted assignments
 * - Log HEARTBEAT_OK or flag pending work
 * - Update agent.lastHeartbeat timestamp
 * - (Removed: no longer emits activityEvent — reduces feed noise)
 */
import { v } from "convex/values";
import { internalMutation, internalAction, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { VALID_AGENTS, type AgentName } from "./agentRegistry";

// Agent names for heartbeat scheduling (filter to active agents)
const AGENTS = VALID_AGENTS.filter((n) => ["max", "sam", "leo"].includes(n));

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
    // FIX: Agent names in DB are uppercase (MAX, SAM, LEO)
    const normalizedName = args.agentName.toUpperCase();
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
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

/**
 * AGT-192: Get all context needed for heartbeat check
 * Returns: agent info, SOUL, WORKING, unread messages, pending tasks
 */
export const getHeartbeatContext = query({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedName = args.agentName.toUpperCase();

    // Get agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
      .first();

    if (!agent) {
      return { error: `Agent ${args.agentName} not found` };
    }

    // Get SOUL.md
    const soulMemory = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agent._id).eq("type", "soul")
      )
      .first();

    // Get WORKING.md
    const workingMemory = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", agent._id).eq("type", "working")
      )
      .first();

    // Get unread messages
    const unreadMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_to_status", (q) =>
        q.eq("to", agent._id).eq("status", "unread")
      )
      .collect();

    // Get pending tasks (todo or in_progress)
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assignee", agent._id))
      .collect();

    const pendingTasks = allTasks.filter(
      (t) => t.status === "todo" || t.status === "in_progress"
    );
    const todoTasks = allTasks.filter((t) => t.status === "todo");
    const inProgressTasks = allTasks.filter((t) => t.status === "in_progress");

    // Check for blockers in WORKING.md
    const hasBlocker = workingMemory?.content?.toLowerCase().includes("blocked") ?? false;
    const hasPendingReview = workingMemory?.content?.toLowerCase().includes("pending review") ?? false;

    return {
      agent: {
        id: agent._id,
        name: agent.name,
        status: agent.status,
        lastHeartbeat: agent.lastHeartbeat,
        lastSeen: agent.lastSeen,
      },
      memory: {
        soul: soulMemory?.content ?? null,
        working: workingMemory?.content ?? null,
      },
      inbox: {
        unreadCount: unreadMessages.length,
        messages: unreadMessages.slice(0, 5).map((m) => ({
          type: m.type,
          content: m.content.slice(0, 100),
          timestamp: m.timestamp,
        })),
      },
      tasks: {
        pendingCount: pendingTasks.length,
        todoCount: todoTasks.length,
        inProgressCount: inProgressTasks.length,
        todo: todoTasks.slice(0, 5).map((t) => ({
          id: t._id,
          title: t.title,
          linearIdentifier: t.linearIdentifier,
          priority: t.priority,
        })),
        inProgress: inProgressTasks.slice(0, 3).map((t) => ({
          id: t._id,
          title: t.title,
          linearIdentifier: t.linearIdentifier,
        })),
      },
      flags: {
        hasBlocker,
        hasPendingReview,
        hasPendingWork: unreadMessages.length > 0 || todoTasks.length > 0 || hasBlocker,
      },
    };
  },
});

/**
 * AGT-194: Get heartbeat protocol documentation
 */
export const getHeartbeatProtocol = query({
  handler: async (ctx) => {
    // Protocol stored under MAX's agent memory
    const maxAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "MAX"))
      .first();

    if (!maxAgent) {
      return { content: null };
    }

    const protocol = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q) =>
        q.eq("agentId", maxAgent._id).eq("type", "heartbeat_protocol")
      )
      .first();

    return {
      content: protocol?.content ?? null,
      version: protocol?.version ?? 0,
      updatedAt: protocol?.updatedAt ?? null,
    };
  },
});
