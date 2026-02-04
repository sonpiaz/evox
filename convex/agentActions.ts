/**
 * Agent Completion API (AGT-124)
 * + Working Memory Updates (AGT-109)
 * + Daily Notes Auto-Logging (AGT-110)
 *
 * Problem: All 30 tasks attributed to SON because Linear API key = Son's.
 * Solution: Agents write directly to Convex with correct attribution.
 *
 * ADR-001: Attribution comes from caller (agent name), not Linear API key.
 * ADR-002: Auto-update WORKING.md + Daily Notes on task completion.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveAgentIdByName } from "./agentMappings";

// Valid agent names
const AGENT_NAMES = ["leo", "sam", "max", "ella"] as const;

// Valid actions
const ACTIONS = ["completed", "in_progress", "comment"] as const;

// Map action to task status
const ACTION_TO_STATUS: Record<string, "done" | "in_progress" | undefined> = {
  completed: "done",
  in_progress: "in_progress",
  comment: undefined, // comment doesn't change status
};

/**
 * Complete/update a task with correct agent attribution.
 *
 * Usage from CLI:
 * npx convex run agentActions:completeTask '{"agent":"sam","ticket":"AGT-124","action":"completed","summary":"Built the API"}'
 */
export const completeTask = mutation({
  args: {
    agent: v.union(
      v.literal("leo"),
      v.literal("sam"),
      v.literal("max"),
      v.literal("ella")
    ),
    ticket: v.string(), // e.g., "AGT-124"
    action: v.union(
      v.literal("completed"),
      v.literal("in_progress"),
      v.literal("comment")
    ),
    summary: v.string(),
    filesChanged: v.optional(v.array(v.string())),
    commitHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Resolve agent name → Convex agent ID
    const agentId = await resolveAgentIdByName(ctx.db, args.agent);
    const agentDoc = await ctx.db.get(agentId);
    if (!agentDoc) {
      throw new Error(`Agent not found for ID: ${agentId}`);
    }

    // 2. Find task by linearIdentifier (e.g., "AGT-124") using proper index
    const ticketUpper = args.ticket.toUpperCase();
    const task = await ctx.db
      .query("tasks")
      .withIndex("by_linearIdentifier", (q) => q.eq("linearIdentifier", ticketUpper))
      .first();

    if (!task) {
      // Task not in Convex yet — log activity anyway for visibility
      await ctx.db.insert("activities", {
        agent: agentId,
        action: args.action === "completed" ? "completed_task" :
                args.action === "in_progress" ? "started_task" : "commented",
        target: args.ticket,
        metadata: {
          summary: args.summary,
          filesChanged: args.filesChanged,
          commitHash: args.commitHash,
          source: "agent_api",
          note: "Task not found in Convex, activity logged for tracking",
        },
        createdAt: now,
      });
      // AGT-137: New unified activityEvents schema
      const eventType = args.action === "completed" ? "completed" :
                        args.action === "in_progress" ? "started" : "commented";
      await ctx.db.insert("activityEvents", {
        agentId,
        agentName: args.agent,
        category: "task",
        eventType,
        title: `${args.agent.toUpperCase()} ${eventType} ${args.ticket}`,
        description: args.summary,
        linearIdentifier: args.ticket,
        metadata: {
          filesChanged: args.filesChanged,
          commitHash: args.commitHash,
          source: "agent_api",
        },
        timestamp: now,
      });

      return {
        success: true,
        warning: `Task ${args.ticket} not found in Convex. Activity logged.`,
        agent: args.agent,
        agentId,
      };
    }

    // 3. Update task status if action changes it
    const newStatus = ACTION_TO_STATUS[args.action];
    const oldStatus = task.status;

    if (newStatus && newStatus !== oldStatus) {
      await ctx.db.patch(task._id, {
        status: newStatus,
        assignee: agentId, // Ensure agent is assigned
        updatedAt: now,
      });
    }

    // 4. Create activity record with correct agent attribution
    const activityAction = args.action === "completed" ? "completed_task" :
                          args.action === "in_progress" ? "started_task" : "commented_task";

    await ctx.db.insert("activities", {
      agent: agentId,
      action: activityAction,
      target: task._id,
      metadata: {
        summary: args.summary,
        filesChanged: args.filesChanged,
        commitHash: args.commitHash,
        source: "agent_api",
        linearIdentifier: task.linearIdentifier,
        statusChange: newStatus ? { from: oldStatus, to: newStatus } : undefined,
      },
      createdAt: now,
    });
    // AGT-137: New unified activityEvents schema
    const eventType = args.action === "completed" ? "completed" :
                      args.action === "in_progress" ? "started" : "commented";
    await ctx.db.insert("activityEvents", {
      agentId,
      agentName: args.agent,
      category: "task",
      eventType,
      title: `${args.agent.toUpperCase()} ${eventType} ${task.linearIdentifier ?? args.ticket}`,
      description: args.summary,
      taskId: task._id,
      linearIdentifier: task.linearIdentifier,
      projectId: task.projectId,
      metadata: {
        fromStatus: newStatus ? oldStatus : undefined,
        toStatus: newStatus,
        filesChanged: args.filesChanged,
        commitHash: args.commitHash,
        source: "agent_api",
      },
      timestamp: now,
    });

    // 5. Create a message/comment on the task (for thread visibility)
    const commentContent = [
      `**${agentDoc.name.toUpperCase()}** ${args.action === "completed" ? "completed" : args.action === "in_progress" ? "started working on" : "commented on"} ${task.linearIdentifier}`,
      "",
      args.summary,
      args.filesChanged?.length ? `\n**Files:** ${args.filesChanged.join(", ")}` : "",
      args.commitHash ? `\n**Commit:** ${args.commitHash}` : "",
    ].filter(Boolean).join("\n");

    await ctx.db.insert("messages", {
      from: agentId,
      content: commentContent,
      channel: "dev",
      mentions: [],
      createdAt: now,
    });

    // 6. AGT-109: Auto-update WORKING.md with completed task
    // 7. AGT-110: Auto-log to daily notes
    if (args.action === "completed") {
      await updateWorkingMemoryOnComplete(ctx, agentId, task.linearIdentifier ?? args.ticket, args.summary);
      await logToDailyNotes(ctx, agentId, "completed", task.linearIdentifier ?? args.ticket, args.summary);
    } else if (args.action === "in_progress") {
      await logToDailyNotes(ctx, agentId, "started", task.linearIdentifier ?? args.ticket, args.summary);
    }

    return {
      success: true,
      taskId: task._id,
      agent: args.agent,
      agentId,
      action: args.action,
      statusChange: newStatus ? { from: oldStatus, to: newStatus } : null,
      linearIdentifier: task.linearIdentifier,
    };
  },
});

/**
 * AGT-109: Helper to auto-update WORKING.md when task is completed.
 * Appends completed task to "Recent Completions" section.
 */
async function updateWorkingMemoryOnComplete(
  ctx: { db: any },
  agentId: string,
  ticketId: string,
  summary: string
) {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");

  // Get existing WORKING.md
  const workingMemories = await ctx.db
    .query("agentMemory")
    .withIndex("by_agent_type", (q: any) =>
      q.eq("agentId", agentId).eq("type", "working")
    )
    .collect();

  const existing = workingMemories[0];

  // Build completion entry
  const completionEntry = `- [x] ${ticketId}: ${summary.slice(0, 80)}${summary.length > 80 ? "..." : ""} (${timestamp})`;

  if (existing) {
    // Append to Recent Completions section or create it
    let content = existing.content;
    const recentSection = "## Recent Completions";

    if (content.includes(recentSection)) {
      // Insert after the header
      const lines = content.split("\n");
      const sectionIdx = lines.findIndex((l: string) => l.trim() === recentSection);
      if (sectionIdx !== -1) {
        // Find next section or end
        let insertIdx = sectionIdx + 1;
        // Skip empty lines
        while (insertIdx < lines.length && lines[insertIdx].trim() === "") {
          insertIdx++;
        }
        lines.splice(insertIdx, 0, completionEntry);
        content = lines.join("\n");
      }
    } else {
      // Add section at end
      content += `\n\n${recentSection}\n${completionEntry}`;
    }

    // Update timestamp in header if present
    content = content.replace(
      /Last updated: .+/,
      `Last updated: ${timestamp} UTC`
    );

    await ctx.db.patch(existing._id, {
      content,
      updatedAt: now,
      version: existing.version + 1,
    });
  } else {
    // Create new WORKING.md with completion
    const agent = await ctx.db.get(agentId);
    const content = `# ${agent?.name ?? "AGENT"} — Working Memory
Last updated: ${timestamp} UTC

## Current Task
None — session ended

## Recent Completions
${completionEntry}

## Next Steps
Check DISPATCH.md for next task
`;

    await ctx.db.insert("agentMemory", {
      agentId,
      type: "working",
      content,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }
}

/**
 * AGT-110: Helper to auto-log activity to daily notes.
 * Creates or updates today's daily note with task activity.
 */
async function logToDailyNotes(
  ctx: { db: any },
  agentId: string,
  action: "completed" | "started" | "blocked",
  ticketId: string,
  summary: string
) {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toISOString().slice(11, 16); // HH:MM

  // Get today's daily note
  const dailyNotes = await ctx.db
    .query("agentMemory")
    .withIndex("by_agent_date", (q: any) =>
      q.eq("agentId", agentId).eq("date", today)
    )
    .collect();

  const existing = dailyNotes.find((n: any) => n.type === "daily");

  // Build log entry based on action
  const emoji = action === "completed" ? "✓" : action === "started" ? "→" : "⚠";
  const entry = `- [${emoji}] ${timestamp} ${ticketId}: ${summary.slice(0, 60)}${summary.length > 60 ? "..." : ""}`;

  if (existing) {
    // Append to appropriate section
    let content = existing.content;
    const sectionMap: Record<string, string> = {
      completed: "## Completed",
      started: "## In Progress",
      blocked: "## Blockers",
    };
    const section = sectionMap[action];

    if (content.includes(section)) {
      // Insert after section header
      const lines = content.split("\n");
      const sectionIdx = lines.findIndex((l: string) => l.trim() === section);
      if (sectionIdx !== -1) {
        let insertIdx = sectionIdx + 1;
        // Skip empty lines
        while (insertIdx < lines.length && lines[insertIdx].trim() === "") {
          insertIdx++;
        }
        lines.splice(insertIdx, 0, entry);
        content = lines.join("\n");
      }
    } else {
      // Add section
      content += `\n\n${section}\n${entry}`;
    }

    await ctx.db.patch(existing._id, {
      content,
      updatedAt: now,
      version: existing.version + 1,
    });
  } else {
    // Create new daily note
    const agent = await ctx.db.get(agentId);
    const sectionMap: Record<string, string> = {
      completed: "## Completed",
      started: "## In Progress",
      blocked: "## Blockers",
    };

    const content = `# ${agent?.name ?? "AGENT"} — Daily Note
Date: ${today}

${sectionMap[action]}
${entry}
`;

    await ctx.db.insert("agentMemory", {
      agentId,
      type: "daily",
      content,
      date: today,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }
}

/**
 * AGT-110: Manually add an entry to today's daily note.
 * For logging blockers, notes, or custom entries.
 *
 * Usage:
 * npx convex run agentActions:logDailyEntry '{"agent":"sam","section":"blocker","content":"Waiting for Linear API credentials"}'
 */
export const logDailyEntry = mutation({
  args: {
    agent: v.union(
      v.literal("leo"),
      v.literal("sam"),
      v.literal("max"),
      v.literal("ella")
    ),
    section: v.union(
      v.literal("completed"),
      v.literal("in_progress"),
      v.literal("blocker"),
      v.literal("note"),
      v.literal("tomorrow")
    ),
    content: v.string(),
    ticketId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agentId = await resolveAgentIdByName(ctx.db, args.agent);
    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${args.agent}`);
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString().slice(11, 16);

    // Get today's daily note
    const dailyNotes = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_date", (q: any) =>
        q.eq("agentId", agentId).eq("date", today)
      )
      .collect();

    const existing = dailyNotes.find((n: any) => n.type === "daily");

    // Build entry
    const prefix = args.ticketId ? `${args.ticketId}: ` : "";
    const entry = `- ${timestamp} ${prefix}${args.content}`;

    // Section headers
    const sectionHeaders: Record<string, string> = {
      completed: "## Completed",
      in_progress: "## In Progress",
      blocker: "## Blockers",
      note: "## Notes",
      tomorrow: "## Tomorrow",
    };
    const sectionHeader = sectionHeaders[args.section];

    if (existing) {
      let content = existing.content;

      if (content.includes(sectionHeader)) {
        const lines = content.split("\n");
        const sectionIdx = lines.findIndex((l: string) => l.trim() === sectionHeader);
        if (sectionIdx !== -1) {
          let insertIdx = sectionIdx + 1;
          while (insertIdx < lines.length && lines[insertIdx].trim() === "") {
            insertIdx++;
          }
          lines.splice(insertIdx, 0, entry);
          content = lines.join("\n");
        }
      } else {
        content += `\n\n${sectionHeader}\n${entry}`;
      }

      await ctx.db.patch(existing._id, {
        content,
        updatedAt: now,
        version: existing.version + 1,
      });

      return { success: true, updated: true };
    } else {
      const content = `# ${agent.name} — Daily Note
Date: ${today}

${sectionHeader}
${entry}
`;

      const id = await ctx.db.insert("agentMemory", {
        agentId,
        type: "daily",
        content,
        date: today,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      return { success: true, created: true, id };
    }
  },
});

/**
 * AGT-109: Update WORKING.md at session end.
 * Agents call this to save their working context for next session.
 *
 * Usage:
 * npx convex run agentActions:updateWorkingMemory '{"agent":"sam","currentTask":"AGT-110","status":"In Progress","nextSteps":["Complete daily notes","Test auto-logging"],"blockers":[],"notes":"Schema done, need to add cron."}'
 */
export const updateWorkingMemory = mutation({
  args: {
    agent: v.union(
      v.literal("leo"),
      v.literal("sam"),
      v.literal("max"),
      v.literal("ella")
    ),
    currentTask: v.optional(v.string()),
    status: v.optional(v.string()),
    nextSteps: v.optional(v.array(v.string())),
    blockers: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    decisions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");

    // Resolve agent
    const agentId = await resolveAgentIdByName(ctx.db, args.agent);
    const agentDoc = await ctx.db.get(agentId);
    if (!agentDoc) {
      throw new Error(`Agent not found: ${args.agent}`);
    }

    // Get existing WORKING.md to preserve Recent Completions
    const workingMemories = await ctx.db
      .query("agentMemory")
      .withIndex("by_agent_type", (q: any) =>
        q.eq("agentId", agentId).eq("type", "working")
      )
      .collect();

    const existing = workingMemories[0];

    // Extract recent completions from existing if any
    let recentCompletions = "";
    if (existing?.content) {
      const match = existing.content.match(/## Recent Completions\n([\s\S]*?)(?=\n## |$)/);
      if (match) {
        recentCompletions = match[1].trim();
      }
    }

    // Build new WORKING.md
    const sections = [
      `# ${agentDoc.name} — Working Memory`,
      `Last updated: ${timestamp} UTC`,
      "",
      "## Current Task",
      args.currentTask ?? "None",
      "",
      "## Status",
      args.status ?? "Idle",
    ];

    if (args.decisions?.length) {
      sections.push("", "## Recent Decisions");
      args.decisions.forEach((d) => sections.push(`- ${d}`));
    }

    if (args.blockers?.length) {
      sections.push("", "## Blockers");
      args.blockers.forEach((b) => sections.push(`- ${b}`));
    } else {
      sections.push("", "## Blockers", "None");
    }

    if (args.nextSteps?.length) {
      sections.push("", "## Next Steps");
      args.nextSteps.forEach((s, i) => sections.push(`${i + 1}. ${s}`));
    }

    if (args.notes) {
      sections.push("", "## Notes", args.notes);
    }

    if (recentCompletions) {
      sections.push("", "## Recent Completions", recentCompletions);
    }

    const content = sections.join("\n");

    if (existing) {
      await ctx.db.patch(existing._id, {
        content,
        updatedAt: now,
        version: existing.version + 1,
      });
      return { success: true, updated: true, version: existing.version + 1 };
    } else {
      const id = await ctx.db.insert("agentMemory", {
        agentId,
        type: "working",
        content,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      return { success: true, updated: false, created: true, id };
    }
  },
});

/**
 * Query to verify agent completion stats (for dashboard).
 * AGT-192: Limit tasks query to reduce bandwidth costs
 */
export const getAgentStats = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").take(10);
    const tasks = await ctx.db.query("tasks").take(500);

    const stats = agents.map((agent) => {
      const agentTasks = tasks.filter((t) => t.assignee === agent._id);
      const completed = agentTasks.filter((t) => t.status === "done").length;
      const inProgress = agentTasks.filter((t) => t.status === "in_progress").length;
      const total = agentTasks.length;

      return {
        name: agent.name,
        role: agent.role,
        completed,
        inProgress,
        total,
      };
    });

    return stats;
  },
});
