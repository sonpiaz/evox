import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("pm"), v.literal("backend"), v.literal("frontend")),
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
      v.union(v.literal("pm"), v.literal("backend"), v.literal("frontend"))
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

// UPDATE - Heartbeat
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

    // Update agent
    await ctx.db.patch(id, {
      status,
      lastSeen: Date.now(),
    });

    // Record heartbeat
    await ctx.db.insert("heartbeats", {
      agent: id,
      status,
      timestamp: Date.now(),
      metadata,
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
