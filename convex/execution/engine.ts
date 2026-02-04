// ============================================================
// EVOX Engine Core — Execution Engine (Actions Only)
// convex/execution/engine.ts
//
// Step-based execution loop:
//   Each step = 1 Claude API call + tool execution
//   State saved in DB between steps
//   ctx.scheduler.runAfter(0, nextStep) chains steps
//
// NOTE: Queries are in ./queries.ts, Mutations are in ./mutations.ts
// ============================================================

"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { AGENT_SOULS, buildSystemPrompt, buildUserMessage, getRepoContext } from "./context";
import { GITHUB_TOOLS, executeTool, ToolCallBlock } from "./tools";
import { GitHubConfig, commitChanges } from "./github";

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS_PER_STEP = 8096;

// ---- Entry Point ----

export const startExecution = action({
  args: {
    taskId: v.string(), agentName: v.string(), taskTitle: v.string(),
    taskDescription: v.string(), taskPriority: v.optional(v.string()),
    taskLabels: v.optional(v.array(v.string())),
    model: v.optional(v.string()), branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agentKey = args.agentName.toLowerCase();
    const soul = AGENT_SOULS[agentKey];
    if (!soul) throw new Error(`Unknown agent: ${args.agentName}`);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const ghToken = process.env.GITHUB_TOKEN;
    const ghOwner = process.env.GITHUB_OWNER;
    const ghRepo = process.env.GITHUB_REPO;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    if (!ghToken) throw new Error("GITHUB_TOKEN not set");
    if (!ghOwner) throw new Error("GITHUB_OWNER not set");
    if (!ghRepo) throw new Error("GITHUB_REPO not set");

    const branch = args.branch ?? "main";
    const model = args.model ?? DEFAULT_MODEL;
    const task = { id: args.taskId, title: args.taskTitle, description: args.taskDescription, priority: args.taskPriority ?? "Medium", labels: args.taskLabels ?? [] };
    const repoCtx = getRepoContext(ghOwner, ghRepo, branch);
    const systemPrompt = buildSystemPrompt(soul, task, repoCtx);
    const initialMessages = [{ role: "user", content: buildUserMessage(task) }];

    const agentId = await ctx.runQuery(internal.execution.queries.findAgentByName, { name: agentKey });
    if (!agentId) throw new Error(`Agent "${args.agentName}" not found in agents table`);

    const executionId: Id<"executions"> = await ctx.runMutation(internal.execution.mutations.createExecution, {
      taskId: args.taskId, agentId, agentName: soul.name, model,
      repo: `${ghOwner}/${ghRepo}`, branch, initialMessages: JSON.stringify(initialMessages),
    });

    await ctx.runMutation(internal.execution.mutations.writeLog, {
      executionId, step: 0, type: "system",
      content: `🚀 Starting execution: ${args.taskId} with agent ${soul.name}`,
      metadata: JSON.stringify({ model, repo: `${ghOwner}/${ghRepo}`, branch }),
    });

    await ctx.scheduler.runAfter(0, internal.execution.engine.executeStep, { executionId, systemPrompt });
    return { executionId, status: "started" };
  },
});

// ---- Step Execution ----

export const executeStep = internalAction({
  args: { executionId: v.id("executions"), systemPrompt: v.string() },
  handler: async (ctx, { executionId, systemPrompt }) => {
    const execution = await ctx.runQuery(internal.execution.queries.getExecutionInternal, { executionId });
    if (!execution) throw new Error(`Execution ${executionId} not found`);

    if (execution.status !== "running") {
      await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step: execution.currentStep, type: "system", content: `⏹️ Execution ${execution.status}. Halting.` });
      return;
    }

    if (execution.currentStep >= execution.maxSteps) {
      await ctx.runMutation(internal.execution.mutations.completeExecution, { executionId, status: "failed", error: `Max steps reached (${execution.maxSteps})` });
      await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step: execution.currentStep, type: "error", content: `❌ Max steps reached.` });
      return;
    }

    const step = execution.currentStep + 1;
    const messages = JSON.parse(execution.messages || "[]");
    const stagedChanges = new Map<string, string>(Object.entries(JSON.parse(execution.stagedChanges || "{}")));

    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const ghConfig: GitHubConfig = { token: process.env.GITHUB_TOKEN!, owner: process.env.GITHUB_OWNER!, repo: process.env.GITHUB_REPO!, branch: execution.branch };

    try {
      await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "system", content: `🔄 Step ${step}: Calling Claude API...` });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: execution.model, max_tokens: MAX_TOKENS_PER_STEP, system: systemPrompt, messages, tools: GITHUB_TOOLS }),
      });

      if (!response.ok) { const errBody = await response.text(); throw new Error(`Claude API ${response.status}: ${errBody}`); }
      const data = await response.json();

      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      const newTotalTokens = execution.tokensUsed + inputTokens + outputTokens;

      let taskComplete = false;
      let taskCompleteSummary = "";
      const toolResults: any[] = [];

      for (const block of data.content) {
        if (block.type === "text" && block.text) {
          await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "message", content: block.text });
        }
        if (block.type === "tool_use") {
          await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "tool_call", content: `🔧 ${block.name}(${JSON.stringify(block.input).slice(0, 200)})`, metadata: JSON.stringify({ tool: block.name, input: block.input }) });
          if (block.name === "task_complete") {
            taskComplete = true;
            taskCompleteSummary = block.input.summary || "Task completed";
          }
          const result = await executeTool(block as ToolCallBlock, ghConfig, stagedChanges);
          await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "tool_result", content: result.content.slice(0, 500), metadata: JSON.stringify({ tool: block.name, is_error: result.is_error ?? false }) });
          toolResults.push(result);
        }
      }

      messages.push({ role: "assistant", content: data.content });
      if (toolResults.length > 0) messages.push({ role: "user", content: toolResults });

      const filesChanged = Array.from(stagedChanges.keys());
      await ctx.runMutation(internal.execution.mutations.updateExecutionStep, {
        executionId, messages: JSON.stringify(messages), stagedChanges: JSON.stringify(Object.fromEntries(stagedChanges)),
        currentStep: step, tokensUsed: newTotalTokens, filesChanged,
      });

      if (taskComplete || data.stop_reason === "end_turn") {
        let commitSha: string | undefined;

        // AGT-94: Auto-commit staged changes to GitHub
        if (taskComplete && stagedChanges.size > 0) {
          try {
            await ctx.runMutation(internal.execution.mutations.writeLog, {
              executionId, step, type: "system",
              content: `📤 Committing ${stagedChanges.size} files to GitHub...`
            });

            const commitMessage = `[EVOX] ${execution.agentName}: ${execution.taskId} — ${taskCompleteSummary}`;
            const commitResult = await commitChanges(ghConfig, stagedChanges, commitMessage);
            commitSha = commitResult.sha;

            await ctx.runMutation(internal.execution.mutations.writeLog, {
              executionId, step, type: "commit",
              content: `✅ Committed: ${commitResult.sha.slice(0, 7)}`,
              metadata: JSON.stringify({ sha: commitResult.sha, filesCommitted: commitResult.filesCommitted })
            });
          } catch (error: any) {
            // Log error but don't fail the execution
            await ctx.runMutation(internal.execution.mutations.writeLog, {
              executionId, step, type: "error",
              content: `⚠️ Commit failed: ${error.message}. Changes remain staged.`
            });
          }
        }

        await ctx.runMutation(internal.execution.mutations.completeExecution, { executionId, status: "done", commitSha });
        await ctx.runMutation(internal.execution.mutations.writeLog, {
          executionId, step, type: "system",
          content: `✅ Complete! ${filesChanged.length} files ${commitSha ? 'committed' : 'staged'}. Tokens: ${newTotalTokens}`,
          metadata: JSON.stringify({ filesChanged, tokensUsed: newTotalTokens, commitSha })
        });
        return;
      }

      if (data.stop_reason === "tool_use" || toolResults.length > 0) {
        await ctx.scheduler.runAfter(0, internal.execution.engine.executeStep, { executionId, systemPrompt });
      } else {
        await ctx.runMutation(internal.execution.mutations.completeExecution, { executionId, status: "done" });
        await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "system", content: `✅ Done (stop_reason: ${data.stop_reason}). ${filesChanged.length} files staged.` });
      }
    } catch (error: any) {
      await ctx.runMutation(internal.execution.mutations.writeLog, { executionId, step, type: "error", content: `❌ Error: ${error.message}` });
      await ctx.runMutation(internal.execution.mutations.completeExecution, { executionId, status: "failed", error: error.message });
    }
  },
});

