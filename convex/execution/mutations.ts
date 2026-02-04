// ============================================================
// EVOX Engine Mutations (split from engine.ts for Convex compatibility)
// Mutations cannot be in "use node" files
// ============================================================

import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";

const MAX_STEPS = 50;

// ---- Internal Mutations ----

export const createExecution = internalMutation({
  args: {
    taskId: v.string(), agentId: v.id("agents"), agentName: v.string(),
    model: v.string(), repo: v.string(), branch: v.string(), initialMessages: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("executions", {
      taskId: args.taskId, agentId: args.agentId, agentName: args.agentName,
      status: "running", messages: args.initialMessages,
      stagedChanges: JSON.stringify({}), currentStep: 0, maxSteps: MAX_STEPS,
      startedAt: Date.now(), tokensUsed: 0, filesChanged: [],
      model: args.model, repo: args.repo, branch: args.branch,
    });
  },
});

export const updateExecutionStep = internalMutation({
  args: {
    executionId: v.id("executions"), messages: v.string(),
    stagedChanges: v.string(), currentStep: v.number(),
    tokensUsed: v.number(), filesChanged: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      messages: args.messages, stagedChanges: args.stagedChanges,
      currentStep: args.currentStep, tokensUsed: args.tokensUsed,
      filesChanged: args.filesChanged,
    });
  },
});

export const completeExecution = internalMutation({
  args: {
    executionId: v.id("executions"),
    status: v.union(v.literal("done"), v.literal("failed"), v.literal("stopped")),
    commitSha: v.optional(v.string()), error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: args.status, completedAt: Date.now(),
      commitSha: args.commitSha, error: args.error,
    });
  },
});

export const writeLog = internalMutation({
  args: {
    executionId: v.id("executions"), step: v.number(),
    type: v.union(
      v.literal("system"), v.literal("thinking"), v.literal("tool_call"),
      v.literal("tool_result"), v.literal("message"), v.literal("error"), v.literal("commit")
    ),
    content: v.string(), metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("engineLogs", {
      executionId: args.executionId, timestamp: Date.now(),
      step: args.step, type: args.type, content: args.content, metadata: args.metadata,
    });
  },
});

// ---- Public Mutations ----

export const stopExecution = mutation({
  args: { executionId: v.id("executions") },
  handler: async (ctx, { executionId }) => {
    const execution = await ctx.db.get(executionId);
    if (!execution) throw new Error("Execution not found");
    if (execution.status !== "running") throw new Error(`Cannot stop: ${execution.status}`);
    await ctx.db.patch(executionId, { status: "stopped" });
    return { success: true };
  },
});
