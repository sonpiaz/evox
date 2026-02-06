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
    // AGT-182: Show creation like Linear (e.g., "MAX created AGT-182")
    await ctx.db.insert("activityEvents", {
      agentId: createdBy,
      agentName: args.agentName.toLowerCase(),
      category: "task",
      eventType: "created",
      title: `${args.agentName.toUpperCase()} created task`,
      description: args.title, // AGT-182: Task title in description
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
// AGT-192: Limit to 500 to reduce bandwidth costs
export const list = query({
  args: {
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit ?? 500;
      if (args.projectId) {
        return await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .order("desc")
          .take(limit);
      }
      return await ctx.db.query("tasks").order("desc").take(limit);
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
 * - Uses indexed queries per status (no full table scan)
 * - DONE column filtered by date range (startTs/endTs)
 * - All columns limited to 500 each (matches getStats)
 * @returns { backlog: Task[], todo: Task[], inProgress: Task[], review: Task[], done: Task[] }
 */
export const getGroupedByStatus = query({
  args: {
    projectId: v.optional(v.id("projects")),
    startTs: v.optional(v.number()), // Unix timestamp for done filter start
    endTs: v.optional(v.number()),   // Unix timestamp for done filter end
  },
  handler: async (ctx, args) => {
    // Query each status separately using index (much more efficient)
    const [backlog, todo, inProgress, review, done] = await Promise.all([
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "backlog")).order("desc").take(500),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "todo")).order("desc").take(500),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "in_progress")).order("desc").take(500),
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "review")).order("desc").take(500),
      // Match getStats take(500) so counts are consistent across views
      ctx.db.query("tasks").withIndex("by_status", q => q.eq("status", "done")).order("desc").take(500),
    ]);

    // AGT-189: Filter done tasks by completedAt (not updatedAt) if date range provided
    // This ensures "Done Today" shows tasks completed today, not just updated today
    let filteredDone = done;
    if (args.startTs !== undefined && args.endTs !== undefined) {
      filteredDone = done.filter(t => {
        const completedAt = t.completedAt ?? t.updatedAt; // fallback for legacy tasks
        return completedAt >= args.startTs! && completedAt <= args.endTs!;
      });
    }

    // Filter by project if provided
    if (args.projectId) {
      return {
        backlog: backlog.filter(t => t.projectId === args.projectId),
        todo: todo.filter(t => t.projectId === args.projectId),
        inProgress: inProgress.filter(t => t.projectId === args.projectId),
        review: review.filter(t => t.projectId === args.projectId),
        done: filteredDone.filter(t => t.projectId === args.projectId),
      };
    }

    return { backlog, todo, inProgress, review, done: filteredDone };
  },
});

// READ - Get tasks by assignee (limited to 50)
export const getByAssignee = query({
  args: {
    assignee: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assignee", args.assignee))
      .order("desc")
      .take(args.limit ?? 50);
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

    // Set completedAt when moving to done
    const patchData: { status: typeof args.status; updatedAt: number; completedAt?: number } = {
      status: args.status,
      updatedAt: now,
    };
    if (args.status === "done") {
      patchData.completedAt = now;
    }
    await ctx.db.patch(args.id, patchData);

    // Log activity using agentName from caller (not Linear API key)
    await ctx.db.insert("activities", {
      agent: updatedBy,
      action: "updated_task_status",
      target: args.id,
      metadata: { from: task.status, to: args.status },
      createdAt: now,
    });
    // AGT-137: New unified activityEvents schema
    // AGT-182: Show full transition like Linear (e.g., "SAM moved AGT-182 from Backlog → Todo")
    const ticketId = task.linearIdentifier || task.title;
    const fromStatusDisplay = task.status.replace("_", " ");
    const toStatusDisplay = args.status.replace("_", " ");
    await ctx.db.insert("activityEvents", {
      agentId: updatedBy,
      agentName: args.agentName.toLowerCase(),
      category: "task",
      eventType: "status_change",
      title: `${args.agentName.toUpperCase()} moved ${ticketId} from ${fromStatusDisplay} → ${toStatusDisplay}`,
      description: task.title, // AGT-182: Include task title for context
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
    // AGT-182: Show assignment like Linear (e.g., "MAX assigned AGT-182 to SAM")
    const assignedByAgent = await ctx.db.get(args.assignedBy);
    const assigneeAgent = await ctx.db.get(args.assignee);
    const ticketId = task.linearIdentifier || task.title;
    await ctx.db.insert("activityEvents", {
      agentId: args.assignedBy,
      agentName: assignedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "assigned",
      title: `${(assignedByAgent?.name ?? "Unknown").toUpperCase()} assigned ${ticketId} to ${(assigneeAgent?.name ?? "Unknown").toUpperCase()}`,
      description: task.title, // AGT-182: Include task title for context
      taskId: args.id,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        assignedTo: assigneeAgent?.name?.toLowerCase(), // AGT-182: Track who was assigned
      },
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
    // AGT-182: Show assignment like Linear (e.g., "SAM was assigned AGT-182")
    const ticketId = task.linearIdentifier || task.title;
    await ctx.db.insert("activityEvents", {
      agentId: args.agentId,
      agentName: agent.name.toLowerCase(),
      category: "task",
      eventType: "assigned",
      title: `${agent.name.toUpperCase()} was assigned ${ticketId}`,
      description: task.title, // AGT-182: Include task title for context
      taskId: args.taskId,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        assignedTo: agent.name.toLowerCase(), // AGT-182: Track who was assigned
      },
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
    // AGT-182: Show update like Linear (e.g., "MAX updated AGT-182")
    const updatedByAgent = await ctx.db.get(updatedBy);
    const taskForUpdate = await ctx.db.get(id);
    const ticketId = taskForUpdate?.linearIdentifier || taskForUpdate?.title || "task";
    await ctx.db.insert("activityEvents", {
      agentId: updatedBy,
      agentName: updatedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "updated",
      title: `${(updatedByAgent?.name ?? "Unknown").toUpperCase()} updated ${ticketId}`,
      description: taskForUpdate?.title, // AGT-182: Task title in description
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
    // AGT-182: Show deletion like Linear (e.g., "MAX deleted AGT-182")
    const ticketId = taskToDelete?.linearIdentifier || taskToDelete?.title || "task";
    await ctx.db.insert("activityEvents", {
      agentId: args.deletedBy,
      agentName: deletedByAgent?.name?.toLowerCase() ?? "unknown",
      category: "task",
      eventType: "deleted",
      title: `${(deletedByAgent?.name ?? "Unknown").toUpperCase()} deleted ${ticketId}`,
      description: taskToDelete?.title, // AGT-182: Task title in description
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

      // AGT-192: Only patch if data actually changed (reduces write conflicts by 90%)
      const hasChanges =
        existingTask.title !== args.title ||
        existingTask.description !== args.description ||
        existingTask.status !== args.status ||
        existingTask.priority !== args.priority ||
        existingTask.assignee !== args.assignee ||
        existingTask.linearIdentifier !== args.linearIdentifier ||
        existingTask.linearUrl !== args.linearUrl ||
        (args.taskAgentName != null && existingTask.agentName !== args.taskAgentName);

      if (hasChanges) {
        await ctx.db.patch(existingTask._id, {
          title: args.title,
          description: args.description,
          status: args.status,
          priority: args.priority,
          assignee: args.assignee,
          updatedAt: now,
          linearIdentifier: args.linearIdentifier,
          linearUrl: args.linearUrl,
          ...(args.taskAgentName != null && { agentName: args.taskAgentName }),
        });
      }

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
            // AGT-179: Use task owner for completion attribution
            // Priority: task.agentName (if NOT "max") > assignee > sync caller
            // IMPORTANT: Skip agentName="max" since that's the default from parseAgentFromDescription
            // and doesn't represent actual task ownership

            // First try: task's stored agentName (but only if it's NOT the default "max")
            if (existingTask.agentName && existingTask.agentName.toLowerCase() !== "max") {
              try {
                completionAgentId = await resolveAgentIdByName(ctx.db, existingTask.agentName);
                completionAgentName = existingTask.agentName.toLowerCase();
              } catch {
                // agent not found, continue to next fallback
              }
            }

            // Second try: task's assignee (if first didn't work or was "max")
            if (completionAgentName === args.agentName.toLowerCase() && existingTask.assignee) {
              const assigneeAgent = await ctx.db.get(existingTask.assignee);
              if (assigneeAgent) {
                completionAgentId = existingTask.assignee;
                completionAgentName = assigneeAgent.name.toLowerCase();
              }
            }

            // Third try: args.assignee (in case existingTask.assignee is null but args has it)
            if (completionAgentName === args.agentName.toLowerCase() && args.assignee) {
              const assigneeAgent = await ctx.db.get(args.assignee);
              if (assigneeAgent) {
                completionAgentId = args.assignee;
                completionAgentName = assigneeAgent.name.toLowerCase();
              }
            }
            // If all fallbacks failed, we keep the sync caller (args.agentName = "max")
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
          // AGT-182: Show full transition like Linear (e.g., "SAM moved AGT-182 from backlog → todo")
          const eventType = newStatus === "done" ? "completed" : "status_change";
          const eventAgentId = newStatus === "done" ? completionAgentId : activityAgentId;
          const eventAgentName = newStatus === "done" ? completionAgentName : args.agentName.toLowerCase();
          const fromStatusDisplay = oldStatus.replace("_", " ");
          const toStatusDisplay = newStatus.replace("_", " ");
          const title = newStatus === "done"
            ? `${completionAgentName.toUpperCase()} completed ${args.linearIdentifier}`
            : `${args.agentName.toUpperCase()} moved ${args.linearIdentifier} from ${fromStatusDisplay} → ${toStatusDisplay}`;

          // AGT-179/182: Show task title in description for context
          const description = args.title;

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
        updatedAt: now, // Use current time when syncing to our system
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
      // AGT-182: Show creation like Linear (e.g., "MAX synced AGT-182")
      await ctx.db.insert("activityEvents", {
        agentId: activityAgentId,
        agentName: args.agentName.toLowerCase(),
        category: "task",
        eventType: "created",
        title: `${args.agentName.toUpperCase()} synced ${args.linearIdentifier}`,
        description: args.title, // AGT-182: Task title in description
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
 * AGT-179: Backfill agentName from task title/description for existing tasks.
 * Uses smart heuristics to determine which agent owns each task.
 * Run: npx convex run tasks:backfillAgentName
 *
 * Heuristics:
 * 1. [UI] prefix in title → Leo (frontend)
 * 2. [Bug] prefix + UI-related keywords → Leo (frontend bug)
 * 3. [Backend] or [API] prefix → Sam (backend)
 * 4. Description dispatch patterns → explicit agent
 * 5. Default: max (PM tasks, planning, etc.)
 */
export const backfillAgentName = mutation({
  handler: async (ctx) => {
    const allTasks = await ctx.db.query("tasks").collect();

    // Determine agent from title and description
    function determineAgent(title: string, description: string): string {
      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();

      // Pattern 1: Explicit [UI] prefix → Leo
      if (titleLower.startsWith("[ui]")) return "leo";

      // Pattern 2: [Bug] with UI-related content → Leo
      if (titleLower.startsWith("[bug]")) {
        // Check if it's a frontend bug
        const uiKeywords = ["activity", "sidebar", "panel", "layout", "feed", "modal", "drawer", "kanban", "card", "button", "css", "style", "component", "render", "ui"];
        if (uiKeywords.some(k => titleLower.includes(k) || descLower.includes(k))) {
          return "leo";
        }
        // Backend bug keywords
        const backendKeywords = ["api", "database", "convex", "sync", "webhook", "mutation", "query", "schema", "linear"];
        if (backendKeywords.some(k => titleLower.includes(k) || descLower.includes(k))) {
          return "sam";
        }
      }

      // Pattern 3: Explicit backend prefixes → Sam
      if (titleLower.startsWith("[backend]") || titleLower.startsWith("[api]")) return "sam";

      // Pattern 4: Description-based dispatch patterns
      // "## Agent: Sam" or "Agent: Sam"
      const agentMatch = descLower.match(/##?\s*agent:\s*(sam|leo|max)/i);
      if (agentMatch) return agentMatch[1].toLowerCase();

      // "SAM's Steps" or "LEO's Steps"
      if (descLower.includes("sam's steps") || descLower.includes("sam (backend)")) return "sam";
      if (descLower.includes("leo's steps") || descLower.includes("leo (frontend)")) return "leo";
      if (descLower.includes("max's steps") || descLower.includes("max (pm)")) return "max";

      // Dispatch block "Sam:" or "Leo:" at start of line
      const dispatchMatch = description.match(/^(Sam|Leo|Max):/im);
      if (dispatchMatch) return dispatchMatch[1].toLowerCase();

      // "## Dispatch\n...\nSam"
      if (descLower.includes("dispatch") && descLower.includes("sam")) return "sam";
      if (descLower.includes("dispatch") && descLower.includes("leo")) return "leo";

      // Pattern 5: Title keywords as fallback
      // Frontend keywords
      const frontendKeywords = ["activity feed", "agent profile", "sidebar", "panel", "layout", "drawer", "modal", "kanban", "design", "polish", "overhaul"];
      if (frontendKeywords.some(k => titleLower.includes(k))) return "leo";

      // Backend keywords
      const backendKeywordsTitle = ["sync", "webhook", "api", "schema", "memory", "attribution"];
      if (backendKeywordsTitle.some(k => titleLower.includes(k))) return "sam";

      // Default to max (PM)
      return "max";
    }

    let updated = 0;
    let skipped = 0;
    const changes: Array<{ linearId: string; from: string; to: string }> = [];

    for (const task of allTasks) {
      // Only update if agentName is "max" (the default) - to fix incorrect defaults
      if (task.agentName && task.agentName.toLowerCase() !== "max") {
        skipped++;
        continue;
      }

      const newAgentName = determineAgent(task.title, task.description);

      // Only update if it's different from current (or current is undefined/max)
      const currentAgentName = task.agentName?.toLowerCase() || "max";
      if (newAgentName !== currentAgentName) {
        await ctx.db.patch(task._id, { agentName: newAgentName });
        changes.push({
          linearId: task.linearIdentifier || task._id.toString(),
          from: currentAgentName,
          to: newAgentName,
        });
        updated++;
      } else {
        skipped++;
      }
    }

    return {
      message: `Backfilled agentName for ${updated} tasks, skipped ${skipped}`,
      updated,
      skipped,
      total: allTasks.length,
      changes,
    };
  },
});

// Mark task completed by Linear identifier (from GitHub webhook)
// AGT-198: Use proper index to avoid write conflicts
export const markCompletedByIdentifier = mutation({
  args: {
    linearIdentifier: v.string(),
    commitHash: v.string(),
    agentName: v.string(),
  },
  handler: async (ctx, { linearIdentifier, commitHash, agentName }) => {
    // Find task by linearIdentifier using proper index
    const ticketUpper = linearIdentifier.toUpperCase();
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) => q.eq("linearIdentifier", ticketUpper))
      .first();

    if (!task) {
      console.log(`Task not found: ${linearIdentifier}`);
      return null;
    }

    const now = Date.now();

    // Update task status to done with completedAt timestamp
    await ctx.db.patch(task._id, {
      status: "done",
      updatedAt: now,
      completedAt: now,
    });

    // Find agent by name (small table, ~3 agents)
    const agents = await ctx.db.query("agents").take(10);
    const agent = agents.find(
      (a) => a.name.toUpperCase() === agentName.toUpperCase()
    );

    // Log activity
    if (agent) {
      await ctx.db.insert("activityLogs", {
        agentId: agent._id,
        agentName: agent.name.toLowerCase(),
        eventType: "completed",
        taskId: task._id,
        linearIdentifier,
        toStatus: "done",
        timestamp: now,
      });

      await ctx.db.insert("activityEvents", {
        agentId: agent._id,
        agentName: agent.name.toLowerCase(),
        category: "task",
        eventType: "completed",
        title: `${agent.name.toUpperCase()} completed ${linearIdentifier}`,
        description: task.title,
        taskId: task._id,
        linearIdentifier,
        projectId: task.projectId,
        metadata: {
          commitHash,
          source: "github-webhook",
          toStatus: "done",
        },
        timestamp: now,
      });
    }

    return task._id;
  },
});

// Sync task status from Linear webhook
export const syncStatusFromLinear = mutation({
  args: {
    linearId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { linearId, status }) => {
    // Find task by linearId
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearId", (q) => q.eq("linearId", linearId))
      .first();

    if (!task) {
      console.log(`Task not found for linearId: ${linearId}`);
      return null;
    }

    // Map Linear status to our status
    const statusMap: Record<string, string> = {
      "Backlog": "backlog",
      "Todo": "todo",
      "In Progress": "in_progress",
      "In Review": "review",
      "Done": "done",
      "Canceled": "done",
    };

    const mappedStatus = statusMap[status] || "backlog";

    // Skip write if status hasn't changed (avoids conflicts from webhook retries)
    if (task.status === mappedStatus) {
      return task._id;
    }

    const now = Date.now();

    await ctx.db.patch(task._id, {
      status: mappedStatus as "backlog" | "todo" | "in_progress" | "review" | "done",
      updatedAt: now,
    });

    return task._id;
  },
});

// ============================================================================
// COST TRACKING QUERIES
// ============================================================================

/**
 * Get tasks with their aggregated cost data
 * Joins tasks with costLogs to provide cost-per-task visibility
 */
export const listWithCosts = query({
  args: {
    projectId: v.optional(v.id("projects")),
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    )),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 500);

    // Get tasks based on filters
    let tasksQuery;
    if (args.status) {
      tasksQuery = ctx.db
        .query("tasks")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc");
    } else {
      tasksQuery = ctx.db.query("tasks").order("desc");
    }

    const tasks = await tasksQuery.take(limit);

    // Filter by project if specified
    const filteredTasks = args.projectId
      ? tasks.filter((t) => t.projectId === args.projectId)
      : tasks;

    // Get cost data for each task
    const tasksWithCosts = await Promise.all(
      filteredTasks.map(async (task) => {
        const costs = await ctx.db
          .query("costLogs")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .collect();

        const totalInputTokens = costs.reduce((sum, c) => sum + c.inputTokens, 0);
        const totalOutputTokens = costs.reduce((sum, c) => sum + c.outputTokens, 0);
        const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);

        return {
          ...task,
          costData: {
            totalInputTokens,
            totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            totalCost,
            logCount: costs.length,
          },
        };
      })
    );

    return tasksWithCosts;
  },
});

/**
 * Get a single task with its full cost breakdown
 */
export const getWithCosts = query({
  args: {
    id: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    const costs = await ctx.db
      .query("costLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.id))
      .order("desc")
      .collect();

    const totalInputTokens = costs.reduce((sum, c) => sum + c.inputTokens, 0);
    const totalOutputTokens = costs.reduce((sum, c) => sum + c.outputTokens, 0);
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);

    // Group costs by agent
    const costsByAgent: Record<string, {
      agentName: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      entries: number;
    }> = {};

    for (const cost of costs) {
      if (!costsByAgent[cost.agentName]) {
        costsByAgent[cost.agentName] = {
          agentName: cost.agentName,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          entries: 0,
        };
      }
      costsByAgent[cost.agentName].inputTokens += cost.inputTokens;
      costsByAgent[cost.agentName].outputTokens += cost.outputTokens;
      costsByAgent[cost.agentName].cost += cost.cost;
      costsByAgent[cost.agentName].entries += 1;
    }

    return {
      ...task,
      costData: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        logCount: costs.length,
        byAgent: Object.values(costsByAgent),
        recentLogs: costs.slice(0, 10), // Last 10 cost entries
      },
    };
  },
});

/**
 * Get cost summary across all tasks (for dashboard)
 */
export const getCostSummary = query({
  args: {
    startTs: v.optional(v.number()),
    endTs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startTs = args.startTs ?? Date.now() - 24 * 60 * 60 * 1000; // Default: last 24h
    const endTs = args.endTs ?? Date.now();

    // Get all cost logs in the time range
    const allCosts = await ctx.db
      .query("costLogs")
      .withIndex("by_timestamp")
      .collect();

    const filteredCosts = allCosts.filter(
      (c) => c.timestamp >= startTs && c.timestamp <= endTs
    );

    // Group by task
    const costsByTask = new Map<string, {
      taskId: Id<"tasks"> | undefined;
      linearIdentifier: string | undefined;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      entries: number;
    }>();

    for (const cost of filteredCosts) {
      const key = cost.taskId?.toString() ?? "no_task";
      const existing = costsByTask.get(key);
      if (existing) {
        existing.inputTokens += cost.inputTokens;
        existing.outputTokens += cost.outputTokens;
        existing.cost += cost.cost;
        existing.entries += 1;
      } else {
        costsByTask.set(key, {
          taskId: cost.taskId,
          linearIdentifier: cost.linearIdentifier,
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
          cost: cost.cost,
          entries: 1,
        });
      }
    }

    // Get task details for the ones with IDs
    const taskCosts = Array.from(costsByTask.values());
    const tasksWithDetails = await Promise.all(
      taskCosts.map(async (tc) => {
        if (!tc.taskId) {
          return {
            ...tc,
            taskTitle: "Unassigned work",
            taskStatus: "unknown",
          };
        }
        const task = await ctx.db.get(tc.taskId);
        return {
          ...tc,
          taskTitle: task?.title ?? "Unknown task",
          taskStatus: task?.status ?? "unknown",
        };
      })
    );

    // Sort by cost descending
    tasksWithDetails.sort((a, b) => b.cost - a.cost);

    return {
      startTs,
      endTs,
      totalCost: filteredCosts.reduce((sum, c) => sum + c.cost, 0),
      totalTokens: filteredCosts.reduce(
        (sum, c) => sum + c.inputTokens + c.outputTokens,
        0
      ),
      taskCount: costsByTask.size,
      costsByTask: tasksWithDetails.slice(0, 20), // Top 20 by cost
    };
  },
});
