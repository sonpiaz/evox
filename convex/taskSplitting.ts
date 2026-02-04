/**
 * AGT-265: Auto-Spawn Sub-Agents for Large Tasks (Actions Only)
 *
 * When a ticket is complex, automatically:
 * 1. Analyze complexity (>3 files, multiple components, "and" in requirements)
 * 2. Split into sub-tasks
 * 3. Create Linear sub-issues
 * 4. Spawn parallel workers
 * 5. Track and merge results
 *
 * NOTE: Queries are in ./taskSplittingQueries.ts, Mutations are in ./taskSplittingMutations.ts
 */

"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { LinearClient } from "@linear/sdk";

/**
 * Split a task into sub-issues and spawn parallel workers.
 *
 * Usage from agent CLI:
 * npx convex run taskSplitting:splitTaskAuto '{"agent":"sam","taskId":"AGT-265","subtasks":[...]}'
 */
export const splitTaskAuto = action({
  args: {
    agent: v.string(), // "sam", "leo", "max", "quinn"
    taskId: v.string(), // Linear identifier like "AGT-265"
    subtasks: v.array(v.object({
      title: v.string(),
      description: v.string(),
      assignee: v.optional(v.string()), // Agent to assign (defaults to parent agent)
      labels: v.optional(v.array(v.string())),
    })),
    waitForCompletion: v.optional(v.boolean()), // If true, wait for all subtasks before reporting
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Get the parent task from Convex using analyzeComplexity query
    const analysis = await ctx.runQuery(api.taskSplittingQueries.analyzeComplexity, {
      taskId: args.taskId.toUpperCase(),
    });

    if (analysis.confidence === 0) {
      return {
        success: false,
        error: "Parent task not found",
        taskId: args.taskId,
      };
    }

    // 2. Create sub-issues in Linear for tracking
    const subIssueIds: Array<{ title: string; identifier: string }> = [];

    for (const subtask of args.subtasks) {
      try {
        // Create Linear sub-issue
        const result = await ctx.runAction(api.taskSplitting.createLinearSubIssue, {
          parentIdentifier: args.taskId.toUpperCase(),
          title: subtask.title,
          description: subtask.description,
          assignee: subtask.assignee || args.agent,
          labels: subtask.labels,
        });

        if (result.success && result.identifier) {
          subIssueIds.push({
            title: subtask.title,
            identifier: result.identifier,
          });
        }
      } catch (error) {
        console.error(`Failed to create Linear sub-issue: ${error}`);
        // Continue with other subtasks even if one fails
      }
    }

    // 3. Create worker pool using parallelWorkers system
    const workerSubtasks = subIssueIds.map((sub, idx) => ({
      name: `worker-${idx + 1}`,
      command: "work_on_task",
      description: `${sub.identifier}: ${sub.title}`,
      payload: JSON.stringify({
        taskId: sub.identifier,
        parentTaskId: args.taskId,
        title: sub.title,
      }),
      priority: 1, // HIGH priority for sub-tasks
    }));

    let poolResult;
    if (workerSubtasks.length > 0) {
      poolResult = await ctx.runMutation(api.parallelWorkers.splitTask, {
        parentAgent: args.agent,
        taskId: args.taskId,
        subtasks: workerSubtasks,
        mergeStrategy: "all_success", // Wait for all workers
      });
    }

    // 4. Log the split in execution logs
    await ctx.runMutation(api.taskSplittingMutations.logTaskSplit, {
      agent: args.agent,
      parentTaskId: args.taskId,
      subIssueCount: subIssueIds.length,
      subIssueIds: subIssueIds.map(s => s.identifier),
      poolId: poolResult?.poolId,
    });

    return {
      success: true,
      parentTask: args.taskId,
      subIssuesCreated: subIssueIds.length,
      subIssues: subIssueIds,
      workersSpawned: workerSubtasks.length,
      poolId: poolResult?.poolId,
      agent: args.agent,
    };
  },
});

/**
 * Internal: Create a Linear sub-issue
 */
export const createLinearSubIssue = action({
  args: {
    parentIdentifier: v.string(),
    title: v.string(),
    description: v.string(),
    assignee: v.string(),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      console.error("LINEAR_API_KEY not found in environment");
      return { success: false, error: "LINEAR_API_KEY not configured" };
    }

    try {
      const linear = new LinearClient({ apiKey });

      // Get parent issue to extract team
      const parentIssue = await linear.issue(args.parentIdentifier);
      if (!parentIssue) {
        return {
          success: false,
          error: "Parent issue not found",
        };
      }

      const team = await parentIssue.team;
      if (!team) {
        return {
          success: false,
          error: "Parent issue has no team",
        };
      }

      // Find assignee by name
      const users = await linear.users();
      const assigneeUser = users.nodes.find(
        (u) => u.name.toLowerCase() === args.assignee.toLowerCase()
      );

      // Get or create "Subtask" label
      const labels = await team.labels();
      let subtaskLabel = labels.nodes.find((l) => l.name === "Subtask");

      if (!subtaskLabel) {
        // Create subtask label if it doesn't exist
        const labelResult = await linear.createIssueLabel({
          name: "Subtask",
          color: "#94a3b8",
          teamId: team.id,
        });
        const createdLabel = await labelResult.issueLabel;
        if (createdLabel) {
          subtaskLabel = createdLabel;
        }
      }

      // Get backlog state
      const states = await team.states();
      const backlogState = states.nodes.find(
        (s) => s.name.toLowerCase() === "backlog"
      );

      // Create the sub-issue
      const createResult = await linear.createIssue({
        teamId: team.id,
        title: `[SUBTASK] ${args.title}`,
        description: `**Parent:** ${args.parentIdentifier}\n\n${args.description}`,
        parentId: parentIssue.id,
        assigneeId: assigneeUser?.id,
        stateId: backlogState?.id,
        labelIds: subtaskLabel ? [subtaskLabel.id] : [],
      });

      const createdIssue = await createResult.issue;
      if (!createdIssue) {
        return {
          success: false,
          error: "Failed to create issue",
        };
      }

      return {
        success: true,
        identifier: createdIssue.identifier,
        id: createdIssue.id,
      };
    } catch (error) {
      console.error("Failed to create Linear sub-issue:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

/**
 * Simple API for agents to analyze and optionally split a task.
 *
 * Usage from CLI:
 * npx convex run taskSplitting:analyzeAndMaybeSplit '{"agent":"sam","taskId":"AGT-265","autoSplit":true}'
 */
export const analyzeAndMaybeSplit = action({
  args: {
    agent: v.string(),
    taskId: v.string(),
    autoSplit: v.optional(v.boolean()), // If true, automatically split if complex
  },
  handler: async (ctx, args) => {
    // Analyze complexity
    const analysis = await ctx.runQuery(api.taskSplittingQueries.analyzeComplexity, {
      taskId: args.taskId,
    });

    if (!analysis.shouldSplit) {
      return {
        shouldSplit: false,
        ...analysis,
        message: "Task is not complex enough to split",
      };
    }

    // If autoSplit is false, just return analysis
    if (!args.autoSplit) {
      return {
        shouldSplit: true,
        ...analysis,
        message: "Task should be split (run with autoSplit:true to execute)",
      };
    }

    // Auto-generate suggested subtasks based on analysis
    const subtasks = [
      {
        title: `Setup and scaffolding for ${args.taskId}`,
        description: "Initial setup, file creation, and basic structure",
        assignee: args.agent,
        labels: ["Subtask", "Setup"],
      },
      {
        title: `Core implementation for ${args.taskId}`,
        description: "Main functionality implementation",
        assignee: args.agent,
        labels: ["Subtask", "Implementation"],
      },
      {
        title: `Testing and validation for ${args.taskId}`,
        description: "Tests, validation, and quality checks",
        assignee: "quinn",
        labels: ["Subtask", "Testing"],
      },
    ];

    // Split the task
    const splitResult = await ctx.runAction(api.taskSplitting.splitTaskAuto, {
      agent: args.agent,
      taskId: args.taskId,
      subtasks,
    });

    return {
      shouldSplit: true,
      ...analysis,
      splitExecuted: true,
      ...splitResult,
    };
  },
});
