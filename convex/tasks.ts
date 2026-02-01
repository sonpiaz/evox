import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// CREATE
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdBy: v.id("agents"),
    assignee: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      status: "backlog",
      priority: args.priority,
      createdBy: args.createdBy,
      assignee: args.assignee,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agent: args.createdBy,
      action: "created_task",
      target: taskId,
      createdAt: now,
    });

    // Notify assignee if assigned
    if (args.assignee) {
      await ctx.db.insert("notifications", {
        to: args.assignee,
        type: "assignment",
        title: "New Task Assigned",
        message: `You've been assigned: ${args.title}`,
        read: false,
        relatedTask: taskId,
        createdAt: now,
      });
    }

    return taskId;
  },
});

// READ - Get all tasks
export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    if (args.projectId) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("tasks").order("desc").collect();
  },
});

// READ - Get task by ID
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// READ - Get tasks by status
export const getByStatus = query({
  args: {
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    if (args.projectId) {
      return await ctx.db
        .query("tasks")
        .withIndex("by_project_status", (q) =>
          q.eq("projectId", args.projectId).eq("status", args.status)
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .collect();
  },
});

// READ - Get tasks by assignee
export const getByAssignee = query({
  args: { assignee: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assignee", args.assignee))
      .order("desc")
      .collect();
  },
});

// READ - Get tasks by priority
export const getByPriority = query({
  args: {
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_priority", (q) => q.eq("priority", args.priority))
      .order("desc")
      .collect();
  },
});

// UPDATE - Update task status
export const updateStatus = mutation({
  args: {
    id: v.id("tasks"),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    updatedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agent: args.updatedBy,
      action: "updated_task_status",
      target: args.id,
      metadata: { from: task.status, to: args.status },
      createdAt: now,
    });

    // Notify on status change
    if (task.assignee && args.status === "review") {
      await ctx.db.insert("notifications", {
        to: task.createdBy,
        type: "review_request",
        title: "Task Ready for Review",
        message: `${task.title} is ready for review`,
        read: false,
        relatedTask: args.id,
        createdAt: now,
      });
    }

    // Send Slack notification when task is completed
    if (args.status === "done") {
      const assignee = task.assignee ? await ctx.db.get(task.assignee) : null;
      await ctx.scheduler.runAfter(0, internal.slackNotify.notifyTaskCompleted, {
        taskId: args.id,
        taskTitle: task.title,
        assigneeName: assignee?.name,
      });
    }
  },
});

// UPDATE - Assign task
export const assign = mutation({
  args: {
    id: v.id("tasks"),
    assignee: v.id("agents"),
    assignedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const now = Date.now();
    await ctx.db.patch(args.id, {
      assignee: args.assignee,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agent: args.assignedBy,
      action: "assigned_task",
      target: args.id,
      metadata: { assignee: args.assignee },
      createdAt: now,
    });

    // Notify assignee
    await ctx.db.insert("notifications", {
      to: args.assignee,
      type: "assignment",
      title: "Task Assigned",
      message: `You've been assigned: ${task.title}`,
      read: false,
      relatedTask: args.id,
      createdAt: now,
    });
  },
});

// UPDATE - Assign agent to task (simplified API)
export const assignAgent = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      assignee: args.agentId,
      updatedAt: now,
    });

    // Log activity (use the agent being assigned as the actor)
    await ctx.db.insert("activities", {
      agent: args.agentId,
      action: "assigned_task",
      target: args.taskId,
      metadata: { assignee: args.agentId },
      createdAt: now,
    });

    // Create notification for the assignee
    await ctx.db.insert("notifications", {
      to: args.agentId,
      type: "assignment",
      title: "Task Assigned",
      message: `You've been assigned: ${task.title}`,
      read: false,
      relatedTask: args.taskId,
      createdAt: now,
    });

    return {
      success: true,
      taskId: args.taskId,
      agentId: args.agentId,
    };
  },
});

// UPDATE - Update task details
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("urgent")
      )
    ),
    updatedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { id, updatedBy, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      agent: updatedBy,
      action: "updated_task",
      target: id,
      metadata: updates,
      createdAt: now,
    });
  },
});

// DELETE
export const remove = mutation({
  args: {
    id: v.id("tasks"),
    deletedBy: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Log activity before deletion
    await ctx.db.insert("activities", {
      agent: args.deletedBy,
      action: "deleted_task",
      target: args.id,
      createdAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

// UPSERT - Create or update task by linearId (for Linear sync)
export const upsertByLinearId = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    linearId: v.string(),
    linearIdentifier: v.string(),
    linearUrl: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    assignee: v.optional(v.id("agents")),
    createdBy: v.id("agents"),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if task with this linearId exists
    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_linearId", (q) => q.eq("linearId", args.linearId))
      .collect();

    const existingTask = existingTasks[0];

    if (existingTask) {
      // Update existing task
      await ctx.db.patch(existingTask._id, {
        title: args.title,
        description: args.description,
        status: args.status,
        priority: args.priority,
        assignee: args.assignee,
        updatedAt: args.updatedAt,
        linearIdentifier: args.linearIdentifier,
        linearUrl: args.linearUrl,
      });

      return {
        taskId: existingTask._id,
        created: false,
      };
    } else {
      // Create new task - need projectId
      if (!args.projectId) {
        throw new Error("projectId is required when creating a new task from Linear sync");
      }

      const taskId = await ctx.db.insert("tasks", {
        projectId: args.projectId,
        title: args.title,
        description: args.description,
        status: args.status,
        priority: args.priority,
        assignee: args.assignee,
        createdBy: args.createdBy,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        linearId: args.linearId,
        linearIdentifier: args.linearIdentifier,
        linearUrl: args.linearUrl,
      });

      return {
        taskId,
        created: true,
      };
    }
  },
});
