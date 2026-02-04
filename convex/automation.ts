import { mutation, action, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// AGT-208: Auto-Dispatch from Backlog
// Automatically assign highest priority unassigned tasks to idle agents

/**
 * Check if an agent is idle and eligible for auto-dispatch
 */
export const isAgentIdle = query({
  args: { agentName: v.string() },
  handler: async (ctx, { agentName }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", agentName.toUpperCase()))
      .first();

    if (!agent) return { idle: false, reason: "agent_not_found" };

    // Agent is idle if status is "idle" or "online" (not "busy" or "offline")
    const idleStatuses = ["idle", "online"];
    const isIdle = idleStatuses.includes(agent.status.toLowerCase());

    // Check if agent has any running dispatches
    const runningDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id).eq("status", "running"))
      .first();

    if (runningDispatches) {
      return { idle: false, reason: "has_running_dispatch" };
    }

    return {
      idle: isIdle,
      reason: isIdle ? "available" : `status_${agent.status}`,
      agentId: agent._id,
      agentName: agent.name,
    };
  },
});

/**
 * Find the highest priority unassigned task matching agent's role
 */
export const findNextTask = query({
  args: { agentName: v.string() },
  handler: async (ctx, { agentName }) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", agentName.toUpperCase()))
      .first();

    if (!agent) return null;

    // Get agent's role to match tasks
    const role = agent.role; // "pm", "backend", "frontend"

    // Priority order: urgent > high > medium > low
    const priorityOrder = ["urgent", "high", "medium", "low"];

    // Find unassigned tasks in backlog or todo
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "backlog"))
      .collect();

    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "todo"))
      .collect();

    const allUnassigned = [...tasks, ...todoTasks].filter((t) => !t.assignee);

    // Filter by role matching (based on agentName in task or title patterns)
    const matchingTasks = allUnassigned.filter((t) => {
      const taskAgent = t.agentName?.toLowerCase();
      if (taskAgent && taskAgent === agentName.toLowerCase()) return true;

      // Fallback: match by role patterns in title
      const title = t.title.toLowerCase();
      if (role === "backend" && (title.includes("[backend]") || title.includes("[api]"))) return true;
      if (role === "frontend" && (title.includes("[ui]") || title.includes("[frontend]"))) return true;
      if (role === "pm" && (title.includes("[phase") || title.includes("[planning]"))) return true;

      // If task has no specific agent assignment, consider it available
      return !taskAgent;
    });

    // Sort by priority
    matchingTasks.sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a.priority);
      const bIdx = priorityOrder.indexOf(b.priority);
      return aIdx - bIdx;
    });

    return matchingTasks[0] ?? null;
  },
});

/**
 * Auto-dispatch a task to an idle agent
 */
export const autoDispatchForAgent = mutation({
  args: { agentName: v.string() },
  handler: async (ctx, { agentName }) => {
    const now = Date.now();

    // 1. Find agent
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", agentName.toUpperCase()))
      .first();

    if (!agent) {
      return { success: false, error: "agent_not_found" };
    }

    // 2. Check if agent is idle
    const idleStatuses = ["idle", "online"];
    if (!idleStatuses.includes(agent.status.toLowerCase())) {
      return { success: false, error: "agent_not_idle", status: agent.status };
    }

    // 3. Check for running dispatches
    const runningDispatch = await ctx.db
      .query("dispatches")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id).eq("status", "running"))
      .first();

    if (runningDispatch) {
      return { success: false, error: "has_running_dispatch" };
    }

    // 4. Find highest priority unassigned task
    const priorityOrder = ["urgent", "high", "medium", "low"];

    const backlogTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "backlog"))
      .collect();

    const todoTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "todo"))
      .collect();

    const allUnassigned = [...backlogTasks, ...todoTasks].filter((t) => !t.assignee);

    // Filter by role/agentName matching
    const matchingTasks = allUnassigned.filter((t) => {
      const taskAgent = t.agentName?.toLowerCase();
      if (taskAgent && taskAgent === agentName.toLowerCase()) return true;
      if (!taskAgent) return true; // Unassigned tasks are available to all
      return false;
    });

    // Sort by priority
    matchingTasks.sort((a, b) => {
      const aIdx = priorityOrder.indexOf(a.priority);
      const bIdx = priorityOrder.indexOf(b.priority);
      return aIdx - bIdx;
    });

    const task = matchingTasks[0];
    if (!task) {
      return { success: false, error: "no_tasks_available" };
    }

    // 5. Assign task to agent
    await ctx.db.patch(task._id, {
      assignee: agent._id,
      status: "in_progress",
      updatedAt: now,
    });

    // 6. Create dispatch record
    const dispatchId = await ctx.db.insert("dispatches", {
      agentId: agent._id,
      command: "work_on_task",
      payload: JSON.stringify({
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
        title: task.title,
      }),
      status: "pending",
      createdAt: now,
    });

    // 7. Update agent status
    await ctx.db.patch(agent._id, {
      status: "busy",
      statusReason: `Working on ${task.linearIdentifier ?? task.title}`,
      statusSince: now,
      currentTask: task._id,
    });

    // 8. Log activity
    await ctx.db.insert("activityEvents", {
      agentId: agent._id,
      agentName: agentName.toLowerCase(),
      category: "task",
      eventType: "auto_dispatched",
      title: `${agentName.toUpperCase()} auto-assigned ${task.linearIdentifier ?? task.title}`,
      description: task.title,
      taskId: task._id,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        source: "auto_dispatch",
        priority: task.priority,
      },
      timestamp: now,
    });

    return {
      success: true,
      taskId: task._id,
      linearIdentifier: task.linearIdentifier,
      dispatchId,
      priority: task.priority,
    };
  },
});

/**
 * Run auto-dispatch cycle for all idle agents
 */
export const runAutoDispatchCycle = mutation({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const results = [];

    for (const agent of agents) {
      // Skip offline agents
      if (agent.status.toLowerCase() === "offline") continue;

      // Check if idle
      const idleStatuses = ["idle", "online"];
      if (!idleStatuses.includes(agent.status.toLowerCase())) continue;

      // Check for running dispatches
      const runningDispatch = await ctx.db
        .query("dispatches")
        .withIndex("by_agent", (q) => q.eq("agentId", agent._id).eq("status", "running"))
        .first();

      if (runningDispatch) continue;

      // Find and assign task
      const priorityOrder = ["urgent", "high", "medium", "low"];

      const backlogTasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "backlog"))
        .collect();

      const todoTasks = await ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", "todo"))
        .collect();

      const allUnassigned = [...backlogTasks, ...todoTasks].filter((t) => !t.assignee);

      const matchingTasks = allUnassigned.filter((t) => {
        const taskAgent = t.agentName?.toLowerCase();
        if (taskAgent && taskAgent === agent.name.toLowerCase()) return true;
        if (!taskAgent) return true;
        return false;
      });

      matchingTasks.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a.priority);
        const bIdx = priorityOrder.indexOf(b.priority);
        return aIdx - bIdx;
      });

      const task = matchingTasks[0];
      if (!task) {
        results.push({ agent: agent.name, success: false, reason: "no_tasks" });
        continue;
      }

      const now = Date.now();

      // Assign
      await ctx.db.patch(task._id, {
        assignee: agent._id,
        status: "in_progress",
        updatedAt: now,
      });

      // Dispatch
      const dispatchId = await ctx.db.insert("dispatches", {
        agentId: agent._id,
        command: "work_on_task",
        payload: JSON.stringify({
          taskId: task._id,
          linearIdentifier: task.linearIdentifier,
        }),
        status: "pending",
        createdAt: now,
      });

      // Update agent
      await ctx.db.patch(agent._id, {
        status: "busy",
        statusReason: `Working on ${task.linearIdentifier ?? task.title}`,
        statusSince: now,
        currentTask: task._id,
      });

      // Log
      await ctx.db.insert("activityEvents", {
        agentId: agent._id,
        agentName: agent.name.toLowerCase(),
        category: "task",
        eventType: "auto_dispatched",
        title: `${agent.name.toUpperCase()} auto-assigned ${task.linearIdentifier ?? task.title}`,
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
        metadata: { source: "auto_dispatch_cycle" },
        timestamp: now,
      });

      results.push({
        agent: agent.name,
        success: true,
        taskId: task._id,
        linearIdentifier: task.linearIdentifier,
      });
    }

    return { cycleTime: Date.now(), results };
  },
});

// =============================================================================
// AGT-210: Self-Healing Retry
// =============================================================================

const MAX_RETRIES = 3;

/**
 * Handle task failure with auto-retry logic
 * - If retryCount < MAX_RETRIES: retry with new instruction
 * - If retryCount >= MAX_RETRIES: escalate and mark as blocked
 */
export const handleTaskFailure = mutation({
  args: {
    taskId: v.id("tasks"),
    error: v.string(),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, error, agentName }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    const currentRetries = task.retryCount ?? 0;
    const newRetryCount = currentRetries + 1;

    // Get agent info
    const agent = task.assignee ? await ctx.db.get(task.assignee) : null;
    const agentNameStr = agentName ?? agent?.name ?? "unknown";

    if (newRetryCount >= MAX_RETRIES) {
      // Escalate: mark as blocked/review
      await ctx.db.patch(taskId, {
        retryCount: newRetryCount,
        lastError: error,
        escalatedAt: now,
        status: "review", // Move to review for human intervention
        updatedAt: now,
      });

      // Log escalation
      await ctx.db.insert("activityEvents", {
        agentId: agent?._id ?? task.createdBy,
        agentName: agentNameStr.toLowerCase(),
        category: "task",
        eventType: "escalated",
        title: `${task.linearIdentifier ?? task.title} escalated after ${newRetryCount} failures`,
        description: `Last error: ${error}`,
        taskId,
        linearIdentifier: task.linearIdentifier,
        projectId: task.projectId,
        metadata: {
          source: "self_healing",
          retryCount: newRetryCount,
          error,
        },
        timestamp: now,
      });

      // Create notification for PM
      const pmAgent = await ctx.db
        .query("agents")
        .withIndex("by_name", (q) => q.eq("name", "MAX"))
        .first();

      if (pmAgent) {
        await ctx.db.insert("notifications", {
          to: pmAgent._id,
          from: agent?._id,
          type: "review_request",
          title: "Task Escalated",
          message: `${task.linearIdentifier ?? task.title} failed ${newRetryCount} times: ${error}`,
          read: false,
          relatedTask: taskId,
          createdAt: now,
        });
      }

      return {
        success: false,
        action: "escalated",
        retryCount: newRetryCount,
        taskId,
      };
    } else {
      // Retry: update retry count and keep in_progress
      await ctx.db.patch(taskId, {
        retryCount: newRetryCount,
        lastError: error,
        updatedAt: now,
      });

      // Create new dispatch for retry
      if (agent) {
        await ctx.db.insert("dispatches", {
          agentId: agent._id,
          command: "retry_task",
          payload: JSON.stringify({
            taskId,
            linearIdentifier: task.linearIdentifier,
            retryCount: newRetryCount,
            lastError: error,
          }),
          status: "pending",
          createdAt: now,
        });
      }

      // Log retry
      await ctx.db.insert("activityEvents", {
        agentId: agent?._id ?? task.createdBy,
        agentName: agentNameStr.toLowerCase(),
        category: "task",
        eventType: "retrying",
        title: `Retrying ${task.linearIdentifier ?? task.title} (attempt ${newRetryCount + 1}/${MAX_RETRIES})`,
        description: `Error: ${error}`,
        taskId,
        linearIdentifier: task.linearIdentifier,
        projectId: task.projectId,
        metadata: {
          source: "self_healing",
          retryCount: newRetryCount,
          error,
        },
        timestamp: now,
      });

      return {
        success: true,
        action: "retrying",
        retryCount: newRetryCount,
        remainingRetries: MAX_RETRIES - newRetryCount,
        taskId,
      };
    }
  },
});

/**
 * Reset retry count for a task (after manual intervention)
 */
export const resetRetryCount = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(taskId, {
      retryCount: 0,
      lastError: undefined,
      escalatedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, taskId };
  },
});

/**
 * Get escalated tasks (failed MAX_RETRIES times)
 */
export const getEscalatedTasks = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "review"))
      .order("desc")
      .take(limit ?? 50);

    // Filter to only escalated tasks
    return tasks.filter((t) => t.escalatedAt !== undefined);
  },
});
