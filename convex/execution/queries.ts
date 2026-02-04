// Queries for execution engine (no "use node")
import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

export const getExecution = query({
  args: { executionId: v.id("executions") },
  handler: async (ctx, { executionId }) => ctx.db.get(executionId),
});

export const getExecutionLogs = query({
  args: { executionId: v.id("executions"), limit: v.optional(v.number()) },
  handler: async (ctx, { executionId, limit }) => {
    const logs = await ctx.db.query("engineLogs")
      .withIndex("by_execution", (q) => q.eq("executionId", executionId))
      .order("desc").take(limit ?? 100);
    return logs.reverse();
  },
});

export const listExecutions = query({
  args: { status: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { status, limit }) => {
    const results = await ctx.db.query("executions").order("desc").take(limit ?? 20);
    return status ? results.filter((e) => e.status === status) : results;
  },
});

export const findAgentByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.find((a) => a.name?.toLowerCase() === name.toLowerCase())?._id ?? null;
  },
});

export const getExecutionInternal = internalQuery({
  args: { executionId: v.id("executions") },
  handler: async (ctx, { executionId }) => ctx.db.get(executionId),
});
