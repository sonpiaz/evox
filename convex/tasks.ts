import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { resolveAgentIdByName } from "./agentMappings";
import { Id, Doc } from "./_generated/dataModel";
import { DatabaseReader } from "./_generated/server";

// Dedup window for activity events (5 minutes)
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Check if a similar event was logged recently (within DEDUP_WINDOW_MS)
 * Same taskId + eventType within window = duplicate
 */
async function isDuplicateEvent(
  db: DatabaseReader,
  taskId: Id<"tasks">,
  eventType: string
): Promise<boolean> {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  const recentEvents = await db
    .query("activityEvents")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .order("desc")
    .take(10);

  return recentEvents.some(
    (e) => e.eventType === eventType && e.timestamp > cutoff
  );
}

// CREATE (ADR-001: agentName from caller for attribution)
export const create = mutation({
  args: {
    agentName: v.string(),
    projectId: v.id("projects"),
    title: v.string(),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    assignee: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const createdBy = await resolveAgentIdByName(ctx.db, args.agentName);
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      status: "backlog",
      priority: args.priority,
      createdBy,
      assignee: args.assignee,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity using agentName from caller (not Linear API key)
    await ctx.db.insert("activities", { agent: createdBy, action: "created_task", target: taskId, createdAt: now });
    // AGT-137: New unified activityEvents schema
    await ctx.db.insert("activityEvents", {
      agentId: createdBy,
      agentName: args.agentName.toLowerCase(),
      category: "task",
      eventType: "created",
      title: `${args.agentName} created task: ${args.title}`,
      taskId: taskId,
      projectId: args.projectId,
      timestamp: now,
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

// READ - Get all tasks (never throw — dashboard depends on this)
export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    try {
      if (args.projectId) {
        return await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("tasks").order("desc").collect();
    } catch {
      return [];
    }
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

/**
 * AGT-150: Get tasks grouped by status for Kanban view
 * - DONE column filtered by date range (startTs/endTs)
 * - Other columns (backlog, todo, in_progress, review) show all tasks
 * @returns { backlog: Task[], todo: Task[], inProgress: Task[], review: Task[], done: Task[] }
 */
export const getGroupedByStatus = query({
  args: {
    projectId: v.optional(v.id("projects")),
    startTs: v.optional(v.number()), // Unix timestamp for done filter start
    endTs: v.optional(v.number()),   // Unix timestamp for done filter end
  },
  handler: async (ctx, args) => {
    // Get all tasks (optionally filtered by project)
    let allTasks: Doc<"tasks">[];
    if (args.projectId) {
      allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .collect();
    } else {
      allTasks = await ctx.db.query("tasks").order("desc").collect();
    }

    // Group by status
    const backlog = allTasks.filter((t) => t.status === "backlog");
    const todo = allTasks.filter((t) => t.status === "todo");
    const inProgress = allTasks.filter((t) => t.status === "in_progress");
    const review = allTasks.filter((t) => t.status === "review");

    // DONE column: filter by date range if provided
    let done = allTasks.filter((t) => t.status === "done");
    if (args.startTs !== undefined && args.endTs !== undefined) {
      done = done.filter(
        (t) => t.updatedAt >= args.startTs! && t.updatedAt <= args.endTs!
      );
    }

    return { backlog, todo, inProgress, review, done };
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

// UPDATE - Update task status (ADR-001: agentName from caller for attribution)
export const updateStatus = mutation({
  args: {
    agentName: v.string(),
    id: v.id("tasks"),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    const updatedBy = await resolveAgentIdByName(ctx.db, args.agentName);
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: now,
    });

    // Log activity using agentName from caller (not Linear API key)
    await ctx.db.insert("activities", {
      agent: updatedBy,
      action: "updated_task_status",
      target: args.id,
      metadata: { from: task.status, to: args.status },
      createdAt: now,
    });
    // AGT-137: New unified activityEvents schema
    await ctx.db.insert("activityEvents", {
      agentId: updatedBy,
      agentName: args.agentName.toLowerCase(),
      category: "task",
      eventType: "status_change",
      title: `${args.agentName} moved task to ${args.status}`,
      taskId: args.id,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        fromStatus: task.status,
        toStatus: args.status,
      },
      timestamp: now,
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
    // AGT-137: New unified activityEvents schema
    const assignedByAgent = await ctx.db.get(args.assignedBy);
    const assigneeAgent = await ctx.db.get(args.assignee);
    await ctx.db.insert("activityEvents", {
      agentId: args.assignedBy,
      agentName: assignedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "assigned",
      title: `${assignedByAgent?.name ?? "Unknown"} assigned task to ${assigneeAgent?.name ?? "Unknown"}`,
      taskId: args.id,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      timestamp: now,
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
    // AGT-137: New unified activityEvents schema
    await ctx.db.insert("activityEvents", {
      agentId: args.agentId,
      agentName: agent.name.toLowerCase(),
      category: "task",
      eventType: "assigned",
      title: `${agent.name} was assigned: ${task.title}`,
      taskId: args.taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      timestamp: now,
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
    // AGT-137: New unified activityEvents schema
    const updatedByAgent = await ctx.db.get(updatedBy);
    const taskForUpdate = await ctx.db.get(id);
    await ctx.db.insert("activityEvents", {
      agentId: updatedBy,
      agentName: updatedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "updated",
      title: `${updatedByAgent?.name ?? "Unknown"} updated task`,
      taskId: id,
      linearIdentifier: taskForUpdate?.linearIdentifier,
      projectId: taskForUpdate?.projectId,
      timestamp: now,
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
    const now = Date.now();
    const deletedByAgent = await ctx.db.get(args.deletedBy);
    const taskToDelete = await ctx.db.get(args.id);
    await ctx.db.insert("activities", {
      agent: args.deletedBy,
      action: "deleted_task",
      target: args.id,
      createdAt: now,
    });
    // AGT-137: New unified activityEvents schema
    await ctx.db.insert("activityEvents", {
      agentId: args.deletedBy,
      agentName: deletedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "deleted",
      title: `${deletedByAgent?.name ?? "Unknown"} deleted task: ${taskToDelete?.title ?? "Unknown"}`,
      linearIdentifier: taskToDelete?.linearIdentifier,
      projectId: taskToDelete?.projectId,
      timestamp: now,
    });

    await ctx.db.delete(args.id);
  },
});

// UPSERT - Create or update task by linearId (for Linear sync). ADR-001: activity uses agentName from caller. AGT-134: task.agentName from Linear assignee (Son→max, Sam→sam, Leo→leo).
export const upsertByLinearId = mutation({
  args: {
    agentName: v.string(),
    /** AGT-134: task attribution for Standup (from Linear assignee: Son→max, Sam→sam, Leo→leo) */
    taskAgentName: v.optional(v.string()),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const activityAgentId = await resolveAgentIdByName(ctx.db, args.agentName);

    const existingTasks = await ctx.db
      .query("tasks")
      .withIndex("by_linearId", (q) => q.eq("linearId", args.linearId))
      .collect();

    const existingTask = existingTasks[0];
    const now = Date.now();

    if (existingTask) {
      const oldStatus = existingTask.status;
      const newStatus = args.status;
      const statusChanged = oldStatus !== newStatus;

      await ctx.db.patch(existingTask._id, {
        title: args.title,
        description: args.description,
        status: args.status,
        priority: args.priority,
        assignee: args.assignee,
        updatedAt: args.updatedAt,
        linearIdentifier: args.linearIdentifier,
        linearUrl: args.linearUrl,
        ...(args.taskAgentName != null && { agentName: args.taskAgentName }),
      });

      if (statusChanged) {
        // AGT-168: Check for both status_change and completed events (github-webhook may have logged "completed")
        const isDupeStatusChange = await isDuplicateEvent(ctx.db, existingTask._id, "status_change");
        const isDupeCompleted = newStatus === "done"
          ? await isDuplicateEvent(ctx.db, existingTask._id, "completed")
          : false;
        const isDupe = isDupeStatusChange || isDupeCompleted;

        if (!isDupe) {
          // AGT-179: For "completed" events, attribute to the task's owner (not sync caller)
          // Priority: existingTask.agentName > taskAgentName arg > assignee lookup > fallback to sync caller
          let completionAgentId = activityAgentId;
          let completionAgentName = args.agentName.toLowerCase();

          if (newStatus === "done") {
            // Try to get the actual task owner
            const taskOwnerName = existingTask.agentName ?? args.taskAgentName;
            if (taskOwnerName) {
              try {
                completionAgentId = await resolveAgentIdByName(ctx.db, taskOwnerName);
                completionAgentName = taskOwnerName.toLowerCase();
              } catch {
                // fallback to sync caller if agent not found
              }
            } else if (args.assignee) {
              // Fallback to assignee if no agentName
              const assigneeAgent = await ctx.db.get(args.assignee);
              if (assigneeAgent) {
                completionAgentId = args.assignee;
                completionAgentName = assigneeAgent.name.toLowerCase();
              }
            }
          }

          await ctx.db.insert("activities", {
            agent: newStatus === "done" ? completionAgentId : activityAgentId,
            action: "updated_task_status",
            target: existingTask._id,
            metadata: {
              from: oldStatus,
              to: newStatus,
              source: "linear_sync",
              linearIdentifier: args.linearIdentifier,
            },
            createdAt: now,
          });
          // AGT-137: New unified activityEvents schema
          // AGT-168: Use "completed" event type when status is done
          // AGT-179: Use task owner for completion, sync caller for other status changes
          const eventType = newStatus === "done" ? "completed" : "status_change";
          const eventAgentId = newStatus === "done" ? completionAgentId : activityAgentId;
          const eventAgentName = newStatus === "done" ? completionAgentName : args.agentName.toLowerCase();
          const title = newStatus === "done"
            ? `${completionAgentName.toUpperCase()} completed ${args.linearIdentifier}`
            : `${args.agentName.toUpperCase()} moved ${args.linearIdentifier} to ${newStatus}`;

          // AGT-179: For completed events, show task title in description (not repeated action text)
          const description = newStatus === "done" ? args.title : undefined;

          await ctx.db.insert("activityEvents", {
            agentId: eventAgentId,
            agentName: eventAgentName,
            category: "task",
            eventType,
            title,
            description,
            taskId: existingTask._id,
            linearIdentifier: args.linearIdentifier,
            projectId: existingTask.projectId,
            metadata: {
              fromStatus: oldStatus,
              toStatus: newStatus,
              source: "linear_sync",
            },
            timestamp: now,
          });
        }
      }

      return {
        taskId: existingTask._id,
        created: false,
        statusChanged,
      };
    } else {
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
        createdBy: activityAgentId,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        linearId: args.linearId,
        linearIdentifier: args.linearIdentifier,
        linearUrl: args.linearUrl,
        ...(args.taskAgentName != null && { agentName: args.taskAgentName }),
      });

      await ctx.db.insert("activities", {
        agent: activityAgentId,
        action: "created_task",
        target: taskId,
        metadata: {
          status: args.status,
          source: "linear_sync",
          linearIdentifier: args.linearIdentifier,
        },
        createdAt: now,
      });
      // AGT-137: New unified activityEvents schema
      await ctx.db.insert("activityEvents", {
        agentId: activityAgentId,
        agentName: args.agentName.toLowerCase(),
        category: "task",
        eventType: "created",
        title: `${args.agentName.toUpperCase()} synced ${args.linearIdentifier}: ${args.title}`,
        taskId: taskId,
        linearIdentifier: args.linearIdentifier,
        projectId: args.projectId,
        metadata: {
          toStatus: args.status,
          source: "linear_sync",
        },
        timestamp: now,
      });

      return {
        taskId,
        created: true,
        statusChanged: true,
      };
    }
  },
});

/**
 * AGT-142: Backfill agentName from task description for existing tasks.
 * Parses dispatch patterns to determine which agent owns each task.
 * Run: npx convex run tasks:backfillAgentName
 */
export const backfillAgentName = mutation({
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();

    // Parse agent from description (same logic as linearSync)
    function parseAgentFromDescription(description: string): string | undefined {
      const descLower = description.toLowerCase();

      // Pattern 1: "## Agent: Sam" or "Agent: Sam"
      const agentMatch = descLower.match(/##?\s*agent:\s*(sam|leo|max)/i);
      if (agentMatch) return agentMatch[1].toLowerCase();

      // Pattern 2: "SAM's Steps" or "LEO's Steps" (agent-specific sections)
      if (descLower.includes("sam's steps") || descLower.includes("sam (backend)")) return "sam";
      if (descLower.includes("leo's steps") || descLower.includes("leo (frontend)")) return "leo";
      if (descLower.includes("max's steps") || descLower.includes("max (pm)")) return "max";

      // Pattern 3: Dispatch block with "Sam:" or "Leo:" at start of line
      const dispatchMatch = description.match(/^(Sam|Leo|Max):/im);
      if (dispatchMatch) return dispatchMatch[1].toLowerCase();

      // Pattern 4: Simple "## Dispatch\n...\nSam" or similar
      if (descLower.includes("dispatch") && descLower.includes("sam")) return "sam";
      if (descLower.includes("dispatch") && descLower.includes("leo")) return "leo";

      return undefined;
    }

    let updated = 0;
    let skipped = 0;

    for (const task of allTasks) {
      // Skip if already has agentName
      if (task.agentName) {
        skipped++;
        continue;
      }

      const parsedAgent = parseAgentFromDescription(task.description);
      const agentName = parsedAgent ?? "max"; // default to max (PM) if no dispatch found

      await ctx.db.patch(task._id, { agentName });
      updated++;
    }

    return {
      message: `Backfilled agentName for ${updated} tasks, skipped ${skipped} (already had agentName)`,
      updated,
      skipped,
      total: allTasks.length,
    };
  },
});
