import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Task Dispatch Tracking — who assigned what to whom.
 * Parallel to docs/dispatch-log.md (structured Convex version).
 *
 * Uses string agent names per Rule 2 (CLAUDE.md).
 * No hardcoded agent lists — any string accepted so new agents auto-work.
 */

// Log a new task assignment
export const assign = mutation({
  args: {
    fromAgent: v.string(),
    toAgent: v.string(),
    task: v.string(),
    ticket: v.optional(v.string()),
  },
  handler: async (ctx, { fromAgent, toAgent, task, ticket }) => {
    const id = await ctx.db.insert("taskAssignments", {
      fromAgent,
      toAgent,
      task,
      ticket,
      status: "assigned",
      assignedAt: Date.now(),
    });
    return id;
  },
});

// Update assignment status (in_progress, done, failed, cancelled)
export const updateStatus = mutation({
  args: {
    id: v.id("taskAssignments"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    result: v.optional(v.string()),
    commitHash: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, result, commitHash }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Assignment not found");

    const updates: Record<string, unknown> = { status };

    if (status === "in_progress" && !existing.startedAt) {
      updates.startedAt = Date.now();
    }
    if (status === "done" || status === "failed" || status === "cancelled") {
      updates.completedAt = Date.now();
    }
    if (result !== undefined) updates.result = result;
    if (commitHash !== undefined) updates.commitHash = commitHash;

    await ctx.db.patch(id, updates);
  },
});

// List assignments for a specific agent (as sender or receiver)
export const listByAgent = query({
  args: {
    agentName: v.string(),
    role: v.union(v.literal("from"), v.literal("to")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentName, role, limit }) => {
    const n = limit ?? 20;
    const indexName = role === "from" ? "by_from" : "by_to";
    const fieldName = role === "from" ? "fromAgent" : "toAgent";

    return await ctx.db
      .query("taskAssignments")
      .withIndex(indexName, (q) => q.eq(fieldName, agentName))
      .order("desc")
      .take(n);
  },
});

// Last N assignments across all agents
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const n = limit ?? 20;
    return await ctx.db
      .query("taskAssignments")
      .order("desc")
      .take(n);
  },
});

// All assignments for a specific ticket
export const getByTicket = query({
  args: {
    ticket: v.string(),
  },
  handler: async (ctx, { ticket }) => {
    return await ctx.db
      .query("taskAssignments")
      .withIndex("by_ticket", (q) => q.eq("ticket", ticket))
      .order("desc")
      .collect();
  },
});
