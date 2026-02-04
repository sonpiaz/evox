// ============================================================
// Task Splitting Queries (split from taskSplitting.ts for Convex compatibility)
// Queries cannot be in "use node" files
// ============================================================

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Analyze task complexity to determine if it should be split.
 */
export const analyzeComplexity = query({
  args: {
    taskId: v.string(), // Linear identifier like "AGT-265"
  },
  handler: async (ctx, args) => {
    // Get task from Convex
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) =>
        q.eq("linearIdentifier", args.taskId.toUpperCase())
      )
      .first();

    if (!task) {
      return {
        shouldSplit: false,
        reason: "task_not_found",
        confidence: 0,
      };
    }

    const description = task.description.toLowerCase();
    const title = task.title.toLowerCase();
    const combined = `${title} ${description}`;

    let score = 0;
    const reasons: string[] = [];

    // Check 1: Multiple files mentioned
    const filePatterns = [
      /\d+\s*files?/i,
      /files?:\s*\[/i,
      /modify:\s*\[/i,
      /change:\s*\[/i,
    ];

    for (const pattern of filePatterns) {
      const match = combined.match(pattern);
      if (match) {
        const numMatch = match[0].match(/(\d+)/);
        if (numMatch) {
          const numFiles = parseInt(numMatch[1]);
          if (numFiles > 3) {
            score += 30;
            reasons.push(`${numFiles} files mentioned`);
            break;
          }
        } else {
          score += 20;
          reasons.push("multiple files implied");
          break;
        }
      }
    }

    // Check 2: Multiple components/domains
    const componentKeywords = [
      "frontend and backend",
      "ui and api",
      "client and server",
      "database and api",
      "convex and nextjs",
      "backend and frontend",
    ];

    for (const keyword of componentKeywords) {
      if (combined.includes(keyword)) {
        score += 25;
        reasons.push(`cross-component work: ${keyword}`);
        break;
      }
    }

    // Check 3: Multiple requirements with "and"
    const andCount = (combined.match(/\band\b/g) || []).length;
    const numberedListItems = (combined.match(/^\s*\d+\./gm) || []).length;

    if (numberedListItems > 3) {
      score += 20;
      reasons.push(`${numberedListItems} numbered items`);
    } else if (andCount > 2) {
      score += 15;
      reasons.push(`${andCount} "and" conjunctions`);
    }

    // Check 4: Implementation section with substeps
    if (combined.includes("implementation") || combined.includes("steps")) {
      const steps = combined.match(/^\s*[-•*]\s/gm) || [];
      if (steps.length > 4) {
        score += 20;
        reasons.push(`${steps.length} implementation steps`);
      }
    }

    // Check 5: Keywords suggesting complexity
    const complexityKeywords = [
      "multiple",
      "several",
      "various",
      "parallel",
      "distributed",
      "orchestrate",
      "coordinate",
      "integrate",
    ];

    let keywordCount = 0;
    for (const keyword of complexityKeywords) {
      if (combined.includes(keyword)) {
        keywordCount++;
      }
    }

    if (keywordCount > 2) {
      score += 15;
      reasons.push(`${keywordCount} complexity indicators`);
    }

    const shouldSplit = score >= 40;
    const confidence = Math.min(Math.round((score / 100) * 100), 100);

    return {
      shouldSplit,
      confidence,
      score,
      reasons,
      taskId: args.taskId,
      title: task.title,
    };
  },
});

/**
 * Check if a task is a subtask (has parent)
 */
export const isSubtask = query({
  args: {
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) =>
        q.eq("linearIdentifier", args.taskId.toUpperCase())
      )
      .first();

    if (!task) return { isSubtask: false };

    const isSubtask =
      task.title.startsWith("[SUBTASK]") ||
      task.description.toLowerCase().includes("**parent:**");

    return {
      isSubtask,
      taskId: args.taskId,
      title: task.title,
    };
  },
});

/**
 * Get all subtasks for a parent task
 */
export const getSubtasks = query({
  args: {
    parentTaskId: v.string(),
  },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db
      .query("tasks")
      .collect();

    const subtasks = allTasks.filter((t) =>
      t.title.startsWith("[SUBTASK]") &&
      t.description.includes(args.parentTaskId.toUpperCase())
    );

    return subtasks.map((t) => ({
      id: t._id,
      identifier: t.linearIdentifier,
      title: t.title.replace("[SUBTASK] ", ""),
      status: t.status,
      assignee: t.assignee,
      agentName: t.agentName,
    }));
  },
});
