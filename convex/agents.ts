import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    role: v.union(
      v.literal("pm"),
      v.literal("backend"),
      v.literal("frontend"),
      v.literal("qa"),
      v.literal("devops"),
      v.literal("content"),
      v.literal("security"),
      v.literal("data"),
      v.literal("research"),
      v.literal("design")
    ),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    const agentId = await ctx.db.insert("agents", {
      name: args.name,
      role: args.role,
      status: "offline",
      avatar: args.avatar,
      lastSeen: Date.now(),
    });
    return agentId;
  },
});

// READ - Get all agents (never throw — dashboard/layout depend on this)
export const list = query({
  handler: async (ctx) => {
    try {
      return await ctx.db.query("agents").collect();
    } catch {
      return [];
    }
  },
});

// READ - Get agent by ID
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** AGT-170: List agents with currentTask linearIdentifier for Agent Strip */
export const listForStrip = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return Promise.all(
      agents.map(async (a) => {
        let currentTaskIdentifier: string | null = null;
        let currentTaskTitle: string | null = null;
        if (a.currentTask) {
          const task = await ctx.db.get(a.currentTask);
          currentTaskIdentifier = task?.linearIdentifier ?? null;
          currentTaskTitle = task?.title ?? null;
        }
        return {
          _id: a._id,
          name: a.name,
          role: a.role,
          status: a.status,
          avatar: a.avatar,
          currentTaskIdentifier,
          currentTaskTitle,
          statusSince: a.statusSince ?? null,
        };
      })
    );
  },
});

// READ - Get agents by status
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// UPDATE - Update agent status
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastSeen: Date.now(),
    });
  },
});

// UPDATE - Assign task to agent
export const assignTask = mutation({
  args: {
    id: v.id("agents"),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      currentTask: args.taskId,
      lastSeen: Date.now(),
    });
  },
});

// UPDATE - Update agent details
export const update = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("pm"),
        v.literal("backend"),
        v.literal("frontend"),
        v.literal("qa"),
        v.literal("devops"),
        v.literal("content"),
        v.literal("security"),
        v.literal("data"),
        v.literal("research"),
        v.literal("design")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      lastSeen: Date.now(),
    });
  },
});

// UPDATE - Heartbeat (full version with status)
export const heartbeat = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, status, metadata } = args;
    const now = Date.now();

    // Update agent - AGT-190: Update both lastSeen AND lastHeartbeat
    await ctx.db.patch(id, {
      status,
      lastSeen: now,
      lastHeartbeat: now,
    });

    // Record heartbeat
    await ctx.db.insert("heartbeats", {
      agent: id,
      status,
      timestamp: now,
      metadata,
    });
  },
});

/**
 * AGT-190: Simple heartbeat mutation - just updates lastSeen timestamp
 * Use this for lightweight "I'm alive" pings without changing status
 */
export const ping = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.agentId, {
      lastSeen: now,
      lastHeartbeat: now,
    });
    return { success: true, lastSeen: now };
  },
});

/**
 * AGT-190: Set agent to offline manually
 */
export const setOffline = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.agentId, {
      status: "offline",
      lastSeen: now,
      lastHeartbeat: now,
    });
    return { success: true };
  },
});

/** Update agent lastSeen (AGT-133: when sync runs, touch sync-runner agent)
 * AGT-190: Also updates lastHeartbeat for consistency
 */
export const touchLastSeen = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.agentId, {
      lastSeen: now,
      lastHeartbeat: now,
    });
  },
});

/** AGT-171: Update agent soul data */
export const updateSoul = mutation({
  args: {
    id: v.id("agents"),
    soul: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { soul: args.soul });
  },
});

// UPDATE - Preferred model
export const updatePreferredModel = mutation({
  args: {
    agentId: v.id("agents"),
    model: v.union(v.literal("claude"), v.literal("codex"))
  },
  handler: async (ctx, { agentId, model }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) throw new Error("Agent not found");
    await ctx.db.patch(agentId, {
      metadata: { ...agent.metadata, preferredModel: model }
    });
  },
});

// DELETE
export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * AGT-273: Get agent status with computed online/offline indicator
 * Returns agent data + computed status based on heartbeat timeout:
 * - online: last heartbeat < 15 min ago
 * - offline: last heartbeat >= 15 min ago or no heartbeat
 */
export const getAgentStatus = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const agents = await ctx.db.query("agents").withIndex("by_name", (q) => q.eq("name", args.name.toLowerCase())).collect();
    const agent = agents[0];

    if (!agent) {
      return null;
    }

    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

    // Compute status based on heartbeat
    const lastHeartbeat = agent.lastHeartbeat ?? agent.lastSeen;
    const msSinceHeartbeat = now - lastHeartbeat;
    const computedStatus = msSinceHeartbeat < OFFLINE_THRESHOLD_MS ? "online" : "offline";

    return {
      _id: agent._id,
      name: agent.name,
      role: agent.role,
      status: agent.status, // Manual/current status
      computedStatus, // Computed from heartbeat
      lastHeartbeat: agent.lastHeartbeat,
      lastSeen: agent.lastSeen,
      msSinceHeartbeat,
      isOnline: computedStatus === "online",
      currentTask: agent.currentTask,
    };
  },
});

/**
 * AGT-273: Get all agents status with computed online/offline indicators
 * For CEO Dashboard - shows which agents are truly online
 */
export const getAllAgentStatuses = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

    return agents.map((agent) => {
      const lastHeartbeat = agent.lastHeartbeat ?? agent.lastSeen;
      const msSinceHeartbeat = now - lastHeartbeat;
      const computedStatus = msSinceHeartbeat < OFFLINE_THRESHOLD_MS ? "online" : "offline";

      return {
        _id: agent._id,
        name: agent.name,
        role: agent.role,
        avatar: agent.avatar,
        status: agent.status,
        computedStatus,
        lastHeartbeat: agent.lastHeartbeat,
        lastSeen: agent.lastSeen,
        msSinceHeartbeat,
        isOnline: computedStatus === "online",
        currentTask: agent.currentTask,
      };
    });
  },
});

/**
 * Get comprehensive health status for all agents
 * Includes metrics, uptime, task stats, and health score
 * Used for monitoring dashboards and alerting
 */
export const getAgentHealth = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

    // Get recent dispatches for metrics (last 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return Promise.all(
      agents.map(async (agent) => {
        const lastHeartbeat = agent.lastHeartbeat ?? agent.lastSeen ?? 0;
        const msSinceHeartbeat = now - lastHeartbeat;

        // Compute status
        let computedStatus: "online" | "offline" | "stuck" | "busy";
        if (msSinceHeartbeat > OFFLINE_THRESHOLD_MS) {
          computedStatus = "offline";
        } else if (agent.status === "busy" && msSinceHeartbeat > STUCK_THRESHOLD_MS) {
          computedStatus = "stuck";
        } else if (agent.status === "busy") {
          computedStatus = "busy";
        } else {
          computedStatus = "online";
        }

        // Get dispatch metrics for this agent
        const dispatches = await ctx.db
          .query("dispatches")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
          .collect();

        const completed = dispatches.filter((d) => d.status === "completed").length;
        const failed = dispatches.filter((d) => d.status === "failed").length;
        const running = dispatches.filter((d) => d.status === "running").length;
        const pending = dispatches.filter((d) => d.status === "pending").length;
        const total = completed + failed;

        // Calculate success rate
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

        // Calculate health score (0-100)
        // Factors: online status, success rate, recent activity
        let healthScore = 100;
        if (computedStatus === "offline") healthScore -= 50;
        if (computedStatus === "stuck") healthScore -= 30;
        if (successRate < 80) healthScore -= (80 - successRate) / 2;
        if (total === 0 && msSinceHeartbeat > 60 * 60 * 1000) healthScore -= 10; // No activity in 1hr
        healthScore = Math.max(0, Math.min(100, healthScore));

        return {
          agent: {
            _id: agent._id,
            name: agent.name,
            role: agent.role,
          },
          status: {
            current: agent.status,
            computed: computedStatus,
            lastHeartbeat,
            msSinceHeartbeat,
            currentTask: agent.currentTask,
          },
          metrics: {
            last24h: {
              completed,
              failed,
              running,
              pending,
              total,
              successRate,
            },
          },
          health: {
            score: healthScore,
            isHealthy: healthScore >= 70,
            issues: [
              ...(computedStatus === "offline" ? ["Agent offline (no heartbeat)"] : []),
              ...(computedStatus === "stuck" ? ["Agent stuck (busy but no progress)"] : []),
              ...(successRate < 80 ? [`Low success rate: ${successRate}%`] : []),
            ],
          },
          timestamp: now,
        };
      })
    );
  },
});

/**
 * Get health status for a single agent by name
 */
export const getAgentHealthByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", name.toUpperCase()))
      .first();

    if (!agent) {
      return null;
    }

    const now = Date.now();
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000;
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const lastHeartbeat = agent.lastHeartbeat ?? agent.lastSeen ?? 0;
    const msSinceHeartbeat = now - lastHeartbeat;

    let computedStatus: "online" | "offline" | "stuck" | "busy";
    if (msSinceHeartbeat > OFFLINE_THRESHOLD_MS) {
      computedStatus = "offline";
    } else if (agent.status === "busy" && msSinceHeartbeat > STUCK_THRESHOLD_MS) {
      computedStatus = "stuck";
    } else if (agent.status === "busy") {
      computedStatus = "busy";
    } else {
      computedStatus = "online";
    }

    // Get dispatch metrics
    const dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    const completed = dispatches.filter((d) => d.status === "completed").length;
    const failed = dispatches.filter((d) => d.status === "failed").length;
    const running = dispatches.filter((d) => d.status === "running").length;
    const pending = dispatches.filter((d) => d.status === "pending").length;
    const total = completed + failed;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    let healthScore = 100;
    if (computedStatus === "offline") healthScore -= 50;
    if (computedStatus === "stuck") healthScore -= 30;
    if (successRate < 80) healthScore -= (80 - successRate) / 2;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      agent: {
        _id: agent._id,
        name: agent.name,
        role: agent.role,
      },
      status: {
        current: agent.status,
        computed: computedStatus,
        lastHeartbeat,
        msSinceHeartbeat,
        currentTask: agent.currentTask,
      },
      metrics: {
        last24h: {
          completed,
          failed,
          running,
          pending,
          total,
          successRate,
        },
      },
      health: {
        score: healthScore,
        isHealthy: healthScore >= 70,
        issues: [
          ...(computedStatus === "offline" ? ["Agent offline (no heartbeat)"] : []),
          ...(computedStatus === "stuck" ? ["Agent stuck (busy but no progress)"] : []),
          ...(successRate < 80 ? [`Low success rate: ${successRate}%`] : []),
        ],
      },
      timestamp: now,
    };
  },
});
