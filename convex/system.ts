import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// AGT-212: Kill Switch Backend
// Emergency stop all agent operations

const GLOBAL_KEY = "global";

/**
 * Kill switch - pause all agent operations
 */
export const killSwitch = mutation({
  args: {
    reason: v.string(),
    pausedBy: v.optional(v.string()),
  },
  handler: async (ctx, { reason, pausedBy }) => {
    const now = Date.now();

    // Check existing state
    const existing = await ctx.db
      .query("systemState")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        paused: true,
        pausedAt: now,
        pauseReason: reason,
        pausedBy: pausedBy ?? "system",
      });
    } else {
      await ctx.db.insert("systemState", {
        key: GLOBAL_KEY,
        paused: true,
        pausedAt: now,
        pauseReason: reason,
        pausedBy: pausedBy ?? "system",
      });
    }

    // Set all agents to offline
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        status: "offline",
        statusReason: `System paused: ${reason}`,
        statusSince: now,
      });
    }

    // Cancel all pending dispatches
    const pendingDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const dispatch of pendingDispatches) {
      await ctx.db.patch(dispatch._id, {
        status: "failed",
        error: `System paused: ${reason}`,
        completedAt: now,
      });
    }

    // Log system event
    const pmAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "MAX"))
      .first();

    await ctx.db.insert("activityEvents", {
      agentId: pmAgent?._id ?? agents[0]?._id,
      agentName: pausedBy ?? "system",
      category: "system",
      eventType: "kill_switch_activated",
      title: `KILL SWITCH ACTIVATED: ${reason}`,
      description: `All agents set to offline. ${pendingDispatches.length} dispatches cancelled. Paused by: ${pausedBy ?? "system"}.`,
      metadata: {
        source: "kill_switch",
        errorMessage: reason,
      },
      timestamp: now,
    });

    // AGT-215: Trigger kill switch alert
    await ctx.scheduler.runAfter(0, internal.alerts.triggerKillSwitch, {
      reason,
      triggeredBy: pausedBy ?? "system",
    });

    return {
      success: true,
      pausedAt: now,
      agentsStopped: agents.length,
      dispatchesCancelled: pendingDispatches.length,
    };
  },
});

/**
 * Resume system operations
 */
export const resumeSystem = mutation({
  args: {
    resumedBy: v.optional(v.string()),
  },
  handler: async (ctx, { resumedBy }) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("systemState")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_KEY))
      .first();

    if (!existing || !existing.paused) {
      return { success: false, error: "System is not paused" };
    }

    await ctx.db.patch(existing._id, {
      paused: false,
      resumedAt: now,
    });

    // Set all agents to idle
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.patch(agent._id, {
        status: "idle",
        statusReason: undefined,
        statusSince: now,
      });
    }

    // Log system event
    const pmAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "MAX"))
      .first();

    await ctx.db.insert("activityEvents", {
      agentId: pmAgent?._id ?? agents[0]?._id,
      agentName: resumedBy ?? "system",
      category: "system",
      eventType: "system_resumed",
      title: "System resumed",
      description: `All agents set to idle. Paused for ${Math.round((now - (existing.pausedAt ?? now)) / 1000 / 60)} minutes. Resumed by: ${resumedBy ?? "system"}.`,
      metadata: {
        source: "kill_switch",
      },
      timestamp: now,
    });

    return {
      success: true,
      resumedAt: now,
      pauseDurationMs: now - (existing.pausedAt ?? now),
    };
  },
});

/**
 * Get current system state
 */
export const getSystemState = query({
  handler: async (ctx) => {
    const state = await ctx.db
      .query("systemState")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_KEY))
      .first();

    if (!state) {
      return {
        paused: false,
        status: "running",
      };
    }

    return {
      paused: state.paused,
      status: state.paused ? "paused" : "running",
      pausedAt: state.pausedAt,
      pauseReason: state.pauseReason,
      pausedBy: state.pausedBy,
      resumedAt: state.resumedAt,
    };
  },
});

/**
 * Check if system is operational (for use in other mutations)
 */
export const isSystemOperational = query({
  handler: async (ctx) => {
    const state = await ctx.db
      .query("systemState")
      .withIndex("by_key", (q) => q.eq("key", GLOBAL_KEY))
      .first();

    return !state?.paused;
  },
});
