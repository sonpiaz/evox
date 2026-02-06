import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { withAuth } from "./lib/httpAuth";

const http = httpRouter();

// ============================================================
// STATUS ENDPOINT (Phase 5: OpenClaw Integration)
// ============================================================

/**
 * GET /status — System status overview for OpenClaw
 * Returns: agents, pending dispatches, recent activity
 */
http.route({
  path: "/status",
  method: "GET",
  handler: withAuth(async (ctx) => {
    try {
      // Get all agents
      const agents = await ctx.runQuery(api.agents.list);

      // Get pending dispatches
      const pending = await ctx.runQuery(api.dispatches.listPending);

      // Get recent activity (last 10)
      const recentActivity = await ctx.runQuery(api.activityEvents.list, { limit: 10 });

      return new Response(
        JSON.stringify({
          timestamp: Date.now(),
          agents: agents.map((a: any) => ({
            name: a.name,
            role: a.role,
            status: a.status,
            currentTask: a.currentTask ?? null,
          })),
          pendingDispatches: pending.length,
          dispatches: pending.slice(0, 5),
          recentActivity: recentActivity.slice(0, 10),
          webhooks: {
            github: "https://gregarious-elk-556.convex.site/webhook/github",
            linear: "https://gregarious-elk-556.convex.site/webhook/linear",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Status endpoint error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// WEBHOOK HANDLERS (Phase 5: Execution Engine)
// ============================================================

/**
 * POST /webhook/github — Handle GitHub push events
 * Parses "closes AGT-XXX" from commits and marks tasks completed
 */
http.route({
  path: "/webhook/github",
  method: "POST",
  handler: httpAction(async (ctx, request) => { // Webhook: own auth
    try {
      const body = await request.json();
      const event = request.headers.get("x-github-event");

      if (event === "push") {
        const commits = body.commits || [];
        const results = [];

        for (const commit of commits) {
          const match = commit.message.match(/closes?\s+(AGT-\d+)/i);
          if (match) {
            const result = await ctx.runMutation(api.tasks.markCompletedByIdentifier, {
              linearIdentifier: match[1].toUpperCase(),
              commitHash: commit.id.slice(0, 7),
              agentName: commit.author?.username || commit.author?.name || "unknown",
            });
            results.push({ ticket: match[1], completed: !!result });
          }
        }

        return new Response(
          JSON.stringify({ processed: true, results }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ message: `Ignoring event: ${event}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /webhook/linear — Handle Linear issue updates
 * Syncs status changes and creates dispatches for new/assigned issues
 *
 * Auto-dispatch triggers:
 * 1. New issue created with assignee = Sam/Leo
 * 2. Existing issue assigned to Sam/Leo
 * 3. Issue moved to "Todo" or "In Progress" with Sam/Leo assignee
 */
http.route({
  path: "/webhook/linear",
  method: "POST",
  handler: httpAction(async (ctx, request) => { // Webhook: own auth
    try {
      const body = await request.json();
      const AGENTS = ["SAM", "LEO"];
      let dispatched = false;

      // Extract agent from title prefix [SAM] or [LEO]
      const extractAgentFromTitle = (title: string): string | null => {
        const match = title?.match(/^\[(SAM|LEO)\]/i);
        return match ? match[1].toUpperCase() : null;
      };

      // Helper to create dispatch
      const tryDispatch = async (assigneeName: string | null, identifier: string, title: string, description: string) => {
        // First check assignee, then fall back to title prefix
        let agentName = assigneeName?.toUpperCase();
        if (!agentName || !AGENTS.includes(agentName)) {
          agentName = extractAgentFromTitle(title) || undefined;
        }

        if (agentName && AGENTS.includes(agentName)) {
          await ctx.runMutation(api.dispatches.createFromLinear, {
            agentName,
            linearIdentifier: identifier,
            title,
            description: description || "",
          });
          return true;
        }
        return false;
      };

      // Handle issue updates
      if (body.type === "Issue" && body.action === "update") {
        // Sync status if changed
        if (body.data.state) {
          await ctx.runMutation(api.tasks.syncStatusFromLinear, {
            linearId: body.data.id,
            status: body.data.state.name,
          });
        }

        // Auto-dispatch on assignee change
        if (body.updatedFrom?.assigneeId !== undefined) {
          dispatched = await tryDispatch(
            body.data.assignee?.name,
            body.data.identifier,
            body.data.title,
            body.data.description
          );
        }

        // Auto-dispatch when moved to Todo/In Progress with agent assignee
        if (body.updatedFrom?.stateId !== undefined) {
          const newState = body.data.state?.name?.toLowerCase();
          if (newState === "todo" || newState === "in progress") {
            dispatched = await tryDispatch(
              body.data.assignee?.name,
              body.data.identifier,
              body.data.title,
              body.data.description
            );
          }
        }
      }

      // Handle new issues — create dispatch if assigned to agent
      if (body.type === "Issue" && body.action === "create") {
        dispatched = await tryDispatch(
          body.data.assignee?.name,
          body.data.identifier,
          body.data.title,
          body.data.description
        );
      }

      return new Response(
        JSON.stringify({
          received: true,
          type: body.type,
          action: body.action,
          dispatched,
          identifier: body.data?.identifier,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Linear webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// BOOT CONTEXT ENDPOINT (AGT-160: Context Boot Protocol)
// ============================================================

/**
 * POST /bootContext — Assemble full context for agent session
 * Returns: SOUL + WORKING + TASK + SKILLS + DISPATCH RULES
 *
 * Usage: curl -X POST $CONVEX_URL/bootContext -d '{"agentName":"sam","ticketId":"AGT-158"}'
 */
http.route({
  path: "/bootContext",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, ticketId } = body;

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const normalizedName = agentName.toLowerCase();

      // 1. Get agent mapping to find agent ID
      const mapping = await ctx.runQuery(api.agentMappings.getByAgentName, {
        agentName: normalizedName,
      });

      if (!mapping) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentName}' not found in mappings` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const agentId = mapping.convexAgentId;

      // 2. Get agent details
      const agent = await ctx.runQuery(api.agents.get, { id: agentId });
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent record not found for ID ${agentId}` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 3. Get boot context (soul + working + daily from agentMemory)
      const memoryContext = await ctx.runQuery(api.agentMemory.getBootContext, {
        agentId,
      });

      // 4. Get skills
      const skills = await ctx.runQuery(api.skills.getByAgent, { agentId });

      // 5. Get task if ticketId provided
      let task = null;
      if (ticketId) {
        // Find task by linearIdentifier (AGT-XXX format)
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        task = allTasks.find(
          (t: any) => t.linearIdentifier?.toLowerCase() === ticketId.toLowerCase()
        );
      }

      // 6. Get current task if agent has one assigned
      let currentTask = null;
      if (agent.currentTask) {
        currentTask = await ctx.runQuery(api.tasks.get, { id: agent.currentTask });
      }

      // 7. Assemble context document
      const contextSections: string[] = [];

      // === IDENTITY ===
      contextSections.push("=== IDENTITY ===");
      if (memoryContext?.soul?.content) {
        contextSections.push(memoryContext.soul.content);
      } else if (agent.soul) {
        contextSections.push(agent.soul);
      } else {
        contextSections.push(`You are ${agent.name.toUpperCase()}, a ${agent.role} engineer.`);
      }

      // AGT-241: Include Genius DNA if present
      if (memoryContext?.soul?.geniusDNA) {
        contextSections.push("");
        contextSections.push("## Genius DNA");
        contextSections.push(memoryContext.soul.geniusDNA);
      }

      contextSections.push("");

      // === CURRENT STATE ===
      contextSections.push("=== CURRENT STATE ===");
      if (memoryContext?.working?.content) {
        contextSections.push(memoryContext.working.content);
      } else {
        contextSections.push(`Status: ${agent.status}`);
        if (agent.statusReason) {
          contextSections.push(`Reason: ${agent.statusReason}`);
        }
        if (currentTask) {
          contextSections.push(`Current Task: ${currentTask.linearIdentifier ?? currentTask.title}`);
        }
      }
      contextSections.push("");

      // === TASK ===
      if (task) {
        contextSections.push("=== TASK ===");
        contextSections.push(`Ticket: ${task.linearIdentifier}`);
        contextSections.push(`Title: ${task.title}`);
        contextSections.push(`Priority: ${task.priority}`);
        contextSections.push(`Status: ${task.status}`);
        if (task.linearUrl) {
          contextSections.push(`URL: ${task.linearUrl}`);
        }
        contextSections.push("");
        contextSections.push("Description:");
        contextSections.push(task.description);
        contextSections.push("");
      }

      // === SKILLS ===
      if (skills) {
        contextSections.push("=== SKILLS ===");
        contextSections.push(`Autonomy Level: ${skills.autonomyLevelName} (${skills.autonomyLevel})`);
        contextSections.push(`Territory: ${skills.territory.join(", ")}`);
        contextSections.push(`Tasks Completed: ${skills.tasksCompleted}`);
        const trustScore = skills.tasksCompleted > 0
          ? Math.round(((skills.tasksCompleted - skills.tasksWithBugs) / skills.tasksCompleted) * 100)
          : 100;
        contextSections.push(`Trust Score: ${trustScore}%`);
        contextSections.push("");
      }

      // === DISPATCH RULES ===
      contextSections.push("=== DISPATCH RULES ===");
      contextSections.push(`- Commit with "closes ${ticketId || '{TICKET_ID}'}" when done`);
      contextSections.push("- Push immediately after commit");
      contextSections.push("- Leave Linear comment: files changed, what was done");
      contextSections.push("- Update WORKING memory at session end");
      if (skills?.territory) {
        contextSections.push(`- Stay in your territory: ${skills.territory.join(", ")}`);
      }
      contextSections.push("");

      const contextDocument = contextSections.join("\n");

      return new Response(
        JSON.stringify({
          success: true,
          agentName: normalizedName,
          ticketId: ticketId || null,
          context: contextDocument,
          raw: {
            agent: {
              name: agent.name,
              role: agent.role,
              status: agent.status,
              statusReason: agent.statusReason,
            },
            soul: memoryContext?.soul?.content || agent.soul || null,
            working: memoryContext?.working?.content || null,
            daily: memoryContext?.daily?.content || null,
            task: task ? {
              id: task.linearIdentifier,
              title: task.title,
              status: task.status,
              priority: task.priority,
              url: task.linearUrl,
            } : null,
            skills: skills ? {
              autonomyLevel: skills.autonomyLevel,
              autonomyLevelName: skills.autonomyLevelName,
              territory: skills.territory,
              tasksCompleted: skills.tasksCompleted,
            } : null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("bootContext error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /bootContext?agentName=sam&ticketId=AGT-158 — Same as POST but via query params
 */
http.route({
  path: "/bootContext",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentName = url.searchParams.get("agentName");
      const ticketId = url.searchParams.get("ticketId");

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const normalizedName = agentName.toLowerCase();

      // Reuse same logic as POST (make internal request)
      const postRequest = new Request(request.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: normalizedName, ticketId }),
      });

      // Re-run the same logic inline (can't call ourselves)
      // 1. Get agent mapping
      const mapping = await ctx.runQuery(api.agentMappings.getByAgentName, {
        agentName: normalizedName,
      });

      if (!mapping) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentName}' not found in mappings` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const agentId = mapping.convexAgentId;
      const agent = await ctx.runQuery(api.agents.get, { id: agentId });
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent record not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const memoryContext = await ctx.runQuery(api.agentMemory.getBootContext, { agentId });
      const skills = await ctx.runQuery(api.skills.getByAgent, { agentId });

      let task = null;
      if (ticketId) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        task = allTasks.find(
          (t: any) => t.linearIdentifier?.toLowerCase() === ticketId.toLowerCase()
        );
      }

      // Build text-only response for CLI
      const lines: string[] = [];
      lines.push("=== IDENTITY ===");
      lines.push(memoryContext?.soul?.content || agent.soul || `You are ${agent.name.toUpperCase()}, a ${agent.role} engineer.`);
      lines.push("");
      lines.push("=== CURRENT STATE ===");
      lines.push(memoryContext?.working?.content || `Status: ${agent.status}`);
      lines.push("");

      if (task) {
        lines.push("=== TASK ===");
        lines.push(`Ticket: ${task.linearIdentifier}`);
        lines.push(`Title: ${task.title}`);
        lines.push(`Priority: ${task.priority}`);
        lines.push(`Status: ${task.status}`);
        lines.push("");
        lines.push("Description:");
        lines.push(task.description);
        lines.push("");
      }

      lines.push("=== DISPATCH RULES ===");
      lines.push(`- Commit with "closes ${ticketId || '{TICKET_ID}'}" when done`);
      lines.push("- Push immediately after commit");
      lines.push("- Leave Linear comment: files changed, what was done");

      return new Response(lines.join("\n"), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (error) {
      console.error("bootContext GET error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// POST /api/heartbeat - Update agent heartbeat
http.route({
  path: "/api/heartbeat",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentId, status, currentTask } = body;

      // Validate required fields
      if (!agentId || !status) {
        return new Response(
          JSON.stringify({ error: "agentId and status are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate status
      const validStatuses = ["online", "idle", "offline", "busy"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status. Must be: online, idle, offline, or busy" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent by name (case-insensitive)
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === agentId.toLowerCase()
      );

      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentId}' not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse currentTask if provided
      let taskId: Id<"tasks"> | undefined = undefined;
      if (currentTask) {
        // If currentTask is a task ID, use it directly
        if (currentTask.startsWith("j")) {
          taskId = currentTask as Id<"tasks">;
        }
        // Otherwise, find task by title
        else {
          const allTasks = await ctx.runQuery(api.tasks.list, {});
          const task = allTasks.find((t: any) =>
            t.title.toLowerCase().includes(currentTask.toLowerCase())
          );
          if (task) {
            taskId = task._id;
          }
        }
      }

      // Update agent status and currentTask
      await ctx.runMutation(api.agents.updateStatus, {
        id: agent._id,
        status,
      });

      if (taskId !== undefined || currentTask === null) {
        await ctx.runMutation(api.agents.assignTask, {
          id: agent._id,
          taskId,
        });
      }

      // Record heartbeat
      await ctx.runMutation(api.agents.heartbeat, {
        id: agent._id,
        status,
        metadata: { currentTask: currentTask || null },
      });

      // Get updated agent data
      const updatedAgent = await ctx.runQuery(api.agents.get, {
        id: agent._id,
      });

      return new Response(JSON.stringify(updatedAgent), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Heartbeat error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// GET /api/heartbeat?agentId=<name> - Get single agent status
http.route({
  path: "/api/heartbeat",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentId = url.searchParams.get("agentId");

      if (!agentId) {
        return new Response(
          JSON.stringify({ error: "agentId query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent by name (case-insensitive)
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === agentId.toLowerCase()
      );

      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentId}' not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get recent heartbeats for this agent
      const allHeartbeats = await ctx.runQuery(api.agents.list);

      return new Response(JSON.stringify(agent), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get heartbeat error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// POST /api/linear-sync - Trigger Linear sync
http.route({
  path: "/api/linear-sync",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      // Trigger Linear sync action
      const result = await ctx.runAction(api.linearSync.triggerSync, {});

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Linear sync trigger error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Internal server error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-112: TASK COMMENT ENDPOINTS
// ============================================================

/**
 * POST /comment — Post a comment on a task
 * Body: { taskId: "...", agentName: "sam", content: "..." }
 */
http.route({
  path: "/comment",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { taskId, agentName, content, attachments } = body;

      if (!taskId || !agentName || !content) {
        return new Response(
          JSON.stringify({ error: "taskId, agentName, and content are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find task by linearIdentifier (AGT-XXX) or by convex ID
      let actualTaskId: Id<"tasks"> | string = taskId;
      if (taskId.toUpperCase().startsWith("AGT-")) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        const task = allTasks.find(
          (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
        );
        if (!task) {
          return new Response(
            JSON.stringify({ error: `Task ${taskId} not found` }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        actualTaskId = task._id;
      }

      const result = await ctx.runMutation(api.taskComments.postComment, {
        taskId: actualTaskId as Id<"tasks">,
        agentName,
        content,
        attachments,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Post comment error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /comments?taskId=AGT-XXX — Get comments for a task
 */
http.route({
  path: "/comments",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const taskId = url.searchParams.get("taskId");

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: "taskId query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find task by linearIdentifier (AGT-XXX) or by convex ID
      let actualTaskId: Id<"tasks"> | string = taskId;
      if (taskId.toUpperCase().startsWith("AGT-")) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        const task = allTasks.find(
          (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
        );
        if (!task) {
          return new Response(
            JSON.stringify({ error: `Task ${taskId} not found` }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        actualTaskId = task._id;
      }

      const comments = await ctx.runQuery(api.taskComments.listByTask, {
        taskId: actualTaskId as Id<"tasks">,
      });

      return new Response(JSON.stringify({ comments }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get comments error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-118: DIRECT MESSAGING ENDPOINTS
// ============================================================

/**
 * POST /dm — Send a direct message from one agent to another
 * Body: { from: "sam", to: "leo", content: "...", taskId?: "AGT-XXX", priority?: "urgent" }
 */
http.route({
  path: "/dm",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, to, content, taskId, priority } = body;

      if (!from || !to || !content) {
        return new Response(
          JSON.stringify({ error: "from, to, and content are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find task by linearIdentifier if provided
      let relatedTaskId = undefined;
      if (taskId) {
        if (taskId.toUpperCase().startsWith("AGT-")) {
          const allTasks = await ctx.runQuery(api.tasks.list, {});
          const task = allTasks.find(
            (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
          );
          if (task) {
            relatedTaskId = task._id;
          }
        } else {
          relatedTaskId = taskId;
        }
      }

      const result = await ctx.runMutation(api.agentMessaging.sendDirectMessage, {
        fromAgent: from,
        toAgent: to,
        content,
        relatedTaskId,
        priority: priority || "normal",
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Send DM error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /dms?agent=sam&unreadOnly=true — Get DMs for an agent
 */
http.route({
  path: "/dms",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const unreadOnly = url.searchParams.get("unreadOnly") === "true";

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const messages = await ctx.runQuery(api.agentMessaging.getDirectMessages, {
        agentName: agent,
        unreadOnly,
      });

      return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get DMs error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-174: UNIFIED MESSAGING ENDPOINTS
// ============================================================

/**
 * POST /v2/comment — Post a comment using unified messaging
 * Body: { taskId: "AGT-XXX" or convex ID, agentName: "sam", content: "..." }
 */
http.route({
  path: "/v2/comment",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { taskId, agentName, content } = body;

      if (!taskId || !agentName || !content) {
        return new Response(
          JSON.stringify({ error: "taskId, agentName, and content are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find task by linearIdentifier (AGT-XXX) or by convex ID
      let actualTaskId: Id<"tasks"> | string = taskId;
      if (taskId.toUpperCase().startsWith("AGT-")) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        const task = allTasks.find(
          (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
        );
        if (!task) {
          return new Response(
            JSON.stringify({ error: `Task ${taskId} not found` }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        actualTaskId = task._id;
      }

      const result = await ctx.runMutation(api.messaging.postComment, {
        taskId: actualTaskId as Id<"tasks">,
        agentName,
        content,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Post unified comment error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/comments?taskId=AGT-XXX — Get comments using unified messaging
 */
http.route({
  path: "/v2/comments",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const taskId = url.searchParams.get("taskId");
      const linearId = url.searchParams.get("linearId");

      if (!taskId && !linearId) {
        return new Response(
          JSON.stringify({ error: "taskId or linearId query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (linearId) {
        // Get by Linear identifier directly
        const comments = await ctx.runQuery(api.messaging.getCommentsByLinearId, {
          linearIdentifier: linearId.toUpperCase(),
        });
        return new Response(JSON.stringify({ comments }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Find task by linearIdentifier (AGT-XXX) or by convex ID
      let actualTaskId: Id<"tasks"> | string = taskId!;
      if (taskId!.toUpperCase().startsWith("AGT-")) {
        const allTasks = await ctx.runQuery(api.tasks.list, {});
        const task = allTasks.find(
          (t: any) => t.linearIdentifier?.toUpperCase() === taskId!.toUpperCase()
        );
        if (!task) {
          return new Response(
            JSON.stringify({ error: `Task ${taskId} not found` }),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }
        actualTaskId = task._id;
      }

      const comments = await ctx.runQuery(api.messaging.getTaskComments, {
        taskId: actualTaskId as Id<"tasks">,
      });

      return new Response(JSON.stringify({ comments }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get unified comments error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /v2/dm — Send a DM using unified messaging
 * Body: { from: "sam", to: "leo", content: "...", taskId?: "AGT-XXX", priority?: "urgent" }
 */
http.route({
  path: "/v2/dm",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      // Accept both "content" and "message" for flexibility
      const { from, to, content, message, taskId, priority } = body;
      const messageContent = content || message;

      if (!from || !to || !messageContent) {
        return new Response(
          JSON.stringify({ error: "from, to, and content (or message) are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find task by linearIdentifier if provided
      let relatedTaskId: Id<"tasks"> | undefined = undefined;
      if (taskId) {
        if (taskId.toUpperCase().startsWith("AGT-")) {
          const allTasks = await ctx.runQuery(api.tasks.list, {});
          const task = allTasks.find(
            (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
          );
          if (task) {
            relatedTaskId = task._id;
          }
        } else {
          relatedTaskId = taskId as Id<"tasks">;
        }
      }

      const result = await ctx.runMutation(api.messaging.sendDM, {
        from,
        to,
        content: messageContent,
        relatedTaskId,
        priority: priority || "normal",
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Send unified DM error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/dms?agent=sam&unreadOnly=true — Get DMs using unified messaging
 */
http.route({
  path: "/v2/dms",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const unreadOnly = url.searchParams.get("unreadOnly") === "true";

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const messages = await ctx.runQuery(api.messaging.getDMs, {
        agentName: agent,
        unreadOnly,
      });

      return new Response(JSON.stringify({ messages }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get unified DMs error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/unread?agent=sam — Get unread count + messages for boot protocol
 */
http.route({
  path: "/v2/unread",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const unread = await ctx.runQuery(api.messaging.getUnread, {
        agentName: agent,
      });

      return new Response(JSON.stringify(unread), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get unread error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /v2/mark-read — Mark a message as read
 * Body: { messageId: "..." }
 */
http.route({
  path: "/v2/mark-read",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { messageId } = body;

      if (!messageId) {
        return new Response(
          JSON.stringify({ error: "messageId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.messaging.markRead, {
        messageId: messageId as Id<"unifiedMessages">,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Mark read error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /v2/mark-all-read — Mark all messages as read for an agent
 * Body: { agentName: "sam" }
 */
http.route({
  path: "/v2/mark-all-read",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName } = body;

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.messaging.markAllRead, {
        agentName,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Mark all read error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /v2/sendMessage — Unified message sending (DM or channel)
 * Body: { from: string, to?: string, channel?: string, message: string }
 * - If 'to' is provided: sends DM to that agent
 * - If 'channel' is provided: posts to channel
 * - Must have either 'to' or 'channel'
 */
http.route({
  path: "/v2/sendMessage",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, to, channel, message, taskId, priority } = body;

      if (!from || !message) {
        return new Response(
          JSON.stringify({ error: "from and message are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!to && !channel) {
        return new Response(
          JSON.stringify({ error: "Either 'to' (for DM) or 'channel' (for channel post) is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const now = Date.now();

      // Find task by linearIdentifier if provided
      let relatedTaskId: Id<"tasks"> | undefined = undefined;
      if (taskId) {
        if (taskId.toUpperCase().startsWith("AGT-")) {
          const allTasks = await ctx.runQuery(api.tasks.list, {});
          const task = allTasks.find(
            (t: any) => t.linearIdentifier?.toUpperCase() === taskId.toUpperCase()
          );
          if (task) {
            relatedTaskId = task._id;
          }
        } else {
          relatedTaskId = taskId as Id<"tasks">;
        }
      }

      // Find sender agent
      const agents = await ctx.runQuery(api.agents.list);
      const fromAgent = agents.find(
        (a: any) => a.name.toLowerCase() === from.toLowerCase()
      );

      if (to) {
        // Send DM
        const result = await ctx.runMutation(api.messaging.sendDM, {
          from,
          to,
          content: message,
          relatedTaskId,
          priority: priority || "normal",
        });

        return new Response(JSON.stringify({ success: true, type: "dm", ...result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else if (channel && fromAgent) {
        // Post to channel - log as activity event
        await ctx.runMutation(api.activityEvents.log, {
          agentId: fromAgent._id,
          category: "message",
          eventType: "channel_message",
          title: `${from.toUpperCase()} posted to #${channel}`,
          description: message,
          metadata: {
            source: "peer_communication",
          },
        });

        return new Response(JSON.stringify({ success: true, type: "channel", channel, from }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Send message error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/getMessages?agent=sam — Get all messages for agent
 * Returns DMs, @mentions, and relevant channel messages
 */
http.route({
  path: "/v2/getMessages",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const unreadOnly = url.searchParams.get("unreadOnly") === "true";

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get DMs
      const dms = await ctx.runQuery(api.messaging.getDMs, {
        agentName: agent,
        unreadOnly,
      });

      // Get unread count
      const unread = await ctx.runQuery(api.messaging.getUnread, {
        agentName: agent,
      });

      // Get recent channel messages mentioning this agent
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const recentActivity = await ctx.runQuery(api.activityEvents.getByTimeRange, {
        startTs: oneDayAgo,
        endTs: now,
      });

      const channelMentions = recentActivity.filter((a: any) =>
        a.eventType === "channel_message" &&
        a.description?.toLowerCase().includes(`@${agent.toLowerCase()}`)
      );

      return new Response(JSON.stringify({
        dms,
        channelMentions,
        unreadCount: unread.count,
        unreadDMs: unread.dms,
        unreadMentions: unread.mentions,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get messages error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// WEBHOOK ENDPOINTS (AGT-128: Max Visibility Pipeline)
// ============================================================

/**
 * POST /github-webhook — Handle GitHub push events
 * Parses commit messages for AGT-XX and posts comments to Linear
 */
http.route({
  path: "/github-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => { // Webhook: own auth
    try {
      const body = await request.text();
      const payload = JSON.parse(body);

      // Verify GitHub signature if secret is configured (using Web Crypto API)
      const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;
      if (githubSecret) {
        const signature = request.headers.get("x-hub-signature-256");
        if (signature) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(githubSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signatureBuffer = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(body)
          );
          const hashArray = Array.from(new Uint8Array(signatureBuffer));
          const expectedSignature = `sha256=${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
          if (signature !== expectedSignature) {
            console.error("Invalid GitHub webhook signature");
            return new Response(
              JSON.stringify({ error: "Invalid signature" }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Check event type
      const eventType = request.headers.get("x-github-event");
      if (eventType !== "push") {
        return new Response(
          JSON.stringify({ message: `Ignoring event type: ${eventType}` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Process the push event
      const result = await ctx.runAction(api.webhooks.processGitHubPush, {
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("GitHub webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-119: AGENT DAEMON ENDPOINTS (Staggered Heartbeat Scheduler)
// ============================================================

/**
 * GET /getNextDispatch — Get next pending dispatch for daemon
 * Returns the oldest pending dispatch with agent info
 */
http.route({
  path: "/getNextDispatch",
  method: "GET",
  handler: withAuth(async (ctx) => {
    try {
      const pending = await ctx.runQuery(api.dispatches.listPending);

      if (!pending || pending.length === 0) {
        return new Response(
          JSON.stringify({ dispatch: null }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const dispatch = pending[0];

      // Parse payload to get ticket info
      let ticket = null;
      if (dispatch.payload) {
        try {
          const payload = JSON.parse(dispatch.payload);
          ticket = payload.identifier || payload.ticketId || null;
        } catch {}
      }

      return new Response(
        JSON.stringify({
          dispatchId: dispatch._id,
          agentName: dispatch.agentName,
          command: dispatch.command,
          ticket,
          payload: dispatch.payload,
          createdAt: dispatch.createdAt,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("getNextDispatch error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /getNextDispatchForAgent — Get next pending dispatch for specific agent
 * Query param: agent (sam, leo)
 */
http.route({
  path: "/getNextDispatchForAgent",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agentParam = url.searchParams.get("agent");

      if (!agentParam) {
        return new Response(
          JSON.stringify({ error: "agent param required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const agentName = agentParam.toUpperCase();
      const pending = await ctx.runQuery(api.dispatches.listPending);

      // Find first dispatch for this agent
      const dispatch = pending.find((d: any) => d.agentName?.toUpperCase() === agentName);

      if (!dispatch) {
        return new Response(
          JSON.stringify({ dispatchId: null, ticket: null }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse payload to get ticket info
      let ticket = null;
      if (dispatch.payload) {
        try {
          const payload = JSON.parse(dispatch.payload);
          ticket = payload.identifier || payload.ticketId || null;
        } catch {}
      }

      return new Response(
        JSON.stringify({
          dispatchId: dispatch._id,
          agentName: dispatch.agentName,
          command: dispatch.command,
          ticket,
          payload: dispatch.payload,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("getNextDispatchForAgent error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /markDispatchRunning — Mark dispatch as running (daemon calls this)
 * Query param: dispatchId
 */
http.route({
  path: "/markDispatchRunning",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const dispatchId = url.searchParams.get("dispatchId");

      if (!dispatchId) {
        return new Response(
          JSON.stringify({ error: "dispatchId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(api.dispatches.claim, {
        dispatchId: dispatchId as Id<"dispatches">,
      });

      return new Response(
        JSON.stringify({ success: true, dispatchId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("markDispatchRunning error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /markDispatchCompleted — Mark dispatch as completed (daemon calls this after Claude exits)
 * Query params: dispatchId, result (optional)
 */
http.route({
  path: "/markDispatchCompleted",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const dispatchId = url.searchParams.get("dispatchId");
      const result = url.searchParams.get("result");

      if (!dispatchId) {
        return new Response(
          JSON.stringify({ error: "dispatchId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(api.dispatches.complete, {
        dispatchId: dispatchId as Id<"dispatches">,
        result: result ?? undefined,
      });

      return new Response(
        JSON.stringify({ success: true, dispatchId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("markDispatchCompleted error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /markDispatchFailed — Mark dispatch as failed (daemon calls this on error)
 * Query params: dispatchId, error
 */
http.route({
  path: "/markDispatchFailed",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const dispatchId = url.searchParams.get("dispatchId");
      const errorMsg = url.searchParams.get("error") ?? "Unknown error";

      if (!dispatchId) {
        return new Response(
          JSON.stringify({ error: "dispatchId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(api.dispatches.fail, {
        dispatchId: dispatchId as Id<"dispatches">,
        error: errorMsg,
      });

      return new Response(
        JSON.stringify({ success: true, dispatchId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("markDispatchFailed error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /createDispatch — Create a new dispatch (for Max to push work to agents)
 * Body: { agentName: "sam", command: "execute_ticket", ticket: "AGT-215" }
 */
http.route({
  path: "/createDispatch",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, command, ticket, description } = body;

      if (!agentName || !command) {
        return new Response(
          JSON.stringify({ error: "agentName and command are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent by name
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === agentName.toLowerCase()
      );

      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Agent '${agentName}' not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const dispatchId = await ctx.runMutation(api.dispatches.create, {
        agentId: agent._id,
        command,
        payload: JSON.stringify({ identifier: ticket, description }),
      });

      return new Response(
        JSON.stringify({ success: true, dispatchId, agentName, command, ticket }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("createDispatch error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /cleanupDuplicateDispatches — Remove duplicate pending dispatches
 * Keeps the oldest dispatch for each agent+ticket combination
 */
http.route({
  path: "/cleanupDuplicateDispatches",
  method: "POST",
  handler: withAuth(async (ctx) => {
    try {
      const result = await ctx.runMutation(api.dispatches.cleanupDuplicates, {});
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("cleanupDuplicateDispatches error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /dispatchQueue?agent=<name> — Get dispatch queue summary for an agent
 */
http.route({
  path: "/dispatchQueue",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query param required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runQuery(api.dispatches.getQueueForAgent, {
        agentName: agent,
      });
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("dispatchQueue error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /cleanupStuckDispatches — Cleanup dispatches stuck in running state
 * Body: { maxAgeMinutes?: number } - Default 30 minutes
 */
http.route({
  path: "/cleanupStuckDispatches",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const result = await ctx.runMutation(api.dispatches.cleanupStuckDispatches, {
        maxAgeMinutes: body.maxAgeMinutes,
      });
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("cleanupStuckDispatches error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /resetAgentDispatches — Force reset all running dispatches for an agent
 * Body: { agentName: "sam" }
 */
http.route({
  path: "/resetAgentDispatches",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      if (!body.agentName) {
        return new Response(
          JSON.stringify({ error: "agentName is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const result = await ctx.runMutation(api.dispatches.resetAgentDispatches, {
        agentName: body.agentName,
      });
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("resetAgentDispatches error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /vercel-webhook — Handle Vercel deployment events
 * Posts status updates to Linear and creates P0 bug tickets on failure
 */
http.route({
  path: "/vercel-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => { // Webhook: own auth
    try {
      const payload = await request.json();

      // Vercel sends different payload structures for different events
      // We handle: deployment.created, deployment.ready, deployment.error
      const eventType = payload.type || "deployment";

      // Process the deployment event
      const result = await ctx.runAction(api.webhooks.processVercelDeploy, {
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Vercel webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-215: ALERT SYSTEM ENDPOINTS
// ============================================================

/**
 * GET /alerts — List alerts with optional filters
 * Query params: type, severity, status, agentName, limit
 */
http.route({
  path: "/alerts",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const type = url.searchParams.get("type") || undefined;
      const severity = url.searchParams.get("severity") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const agentName = url.searchParams.get("agentName") || undefined;
      const limit = url.searchParams.get("limit");

      const alerts = await ctx.runQuery(api.alerts.listAlerts, {
        type,
        severity,
        status,
        agentName,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return new Response(JSON.stringify({ alerts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("List alerts error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /alerts/stats — Get alert statistics
 * Query params: since (timestamp)
 */
http.route({
  path: "/alerts/stats",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const since = url.searchParams.get("since");

      const stats = await ctx.runQuery(api.alerts.getAlertStats, {
        since: since ? parseInt(since, 10) : undefined,
      });

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get alert stats error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /alerts/critical — Get unacknowledged critical alerts
 */
http.route({
  path: "/alerts/critical",
  method: "GET",
  handler: withAuth(async (ctx) => {
    try {
      const alerts = await ctx.runQuery(api.alerts.getUnacknowledgedCritical);

      return new Response(JSON.stringify({ alerts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get critical alerts error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /alerts/acknowledge — Acknowledge an alert
 * Body: { alertId: string, acknowledgedBy?: string }
 */
http.route({
  path: "/alerts/acknowledge",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { alertId, acknowledgedBy } = body;

      if (!alertId) {
        return new Response(
          JSON.stringify({ error: "alertId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.alerts.acknowledgeAlert, {
        alertId: alertId as Id<"alerts">,
        acknowledgedBy: acknowledgedBy ?? "user",
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Acknowledge alert error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /alerts/preferences — Get alert preferences
 * Query param: target (e.g., "global", "sam")
 */
http.route({
  path: "/alerts/preferences",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const target = url.searchParams.get("target") ?? "global";

      const prefs = await ctx.runQuery(api.alerts.getPreferences, { target });

      return new Response(JSON.stringify(prefs), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /alerts/preferences — Update alert preferences
 * Body: { target, enabledTypes?, channels?, telegramChatId?, email?, ... }
 */
http.route({
  path: "/alerts/preferences",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { target, ...updates } = body;

      if (!target) {
        return new Response(
          JSON.stringify({ error: "target is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.alerts.updatePreferences, {
        target,
        ...updates,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Update preferences error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /alerts/snooze — Snooze alerts for a target
 * Body: { target: string, durationMinutes: number }
 */
http.route({
  path: "/alerts/snooze",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { target, durationMinutes } = body;

      if (!target) {
        return new Response(
          JSON.stringify({ error: "target is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.alerts.snoozeAlerts, {
        target,
        durationMinutes: durationMinutes ?? 60,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Snooze alerts error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-222: SESSION LEARNING SYSTEM ENDPOINTS
// ============================================================

/**
 * GET /learnings — Query learnings with optional filters
 * Query params: agent, topic, query, limit
 */
http.route({
  path: "/learnings",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const topic = url.searchParams.get("topic");
      const searchQuery = url.searchParams.get("query");
      const limit = url.searchParams.get("limit");

      let learnings;

      if (agent && searchQuery) {
        learnings = await ctx.runQuery(api.learnings.search, {
          query: searchQuery,
          agentName: agent,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
      } else if (searchQuery) {
        learnings = await ctx.runQuery(api.learnings.search, {
          query: searchQuery,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
      } else if (topic) {
        learnings = await ctx.runQuery(api.learnings.getByTopic, {
          topic,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
      } else if (agent) {
        learnings = await ctx.runQuery(api.learnings.getByAgent, {
          agentName: agent,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
      } else {
        learnings = await ctx.runQuery(api.learnings.listRecent, {
          limit: limit ? parseInt(limit, 10) : undefined,
        });
      }

      return new Response(JSON.stringify({ learnings }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get learnings error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /submitLearning — Submit a learning after completing a task
 * Body: { agentName, taskId, taskTitle, summary, filesChanged, ... }
 */
http.route({
  path: "/submitLearning",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const {
        agentName,
        taskId,
        taskTitle,
        summary,
        filesChanged,
        challenges,
        patterns,
        codeSnippets,
        feedbackGood,
        feedbackImprove,
        tags,
        timeSpentMinutes,
      } = body;

      if (!agentName || !taskTitle || !summary) {
        return new Response(
          JSON.stringify({ error: "agentName, taskTitle, and summary are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.learnings.submitLearning, {
        agentName,
        taskId: taskId || undefined,
        taskTitle,
        summary,
        filesChanged: filesChanged || [],
        challenges: challenges || undefined,
        patterns: patterns || undefined,
        codeSnippets: codeSnippets || undefined,
        feedbackGood: feedbackGood || undefined,
        feedbackImprove: feedbackImprove || undefined,
        tags: tags || [],
        timeSpentMinutes: timeSpentMinutes || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Submit learning error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /learnings/stats — Get learning statistics
 */
http.route({
  path: "/learnings/stats",
  method: "GET",
  handler: withAuth(async (ctx) => {
    try {
      const stats = await ctx.runQuery(api.learnings.getStats);

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get learning stats error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-225: QA AGENT INTEGRATION ENDPOINTS
// ============================================================

/**
 * POST /triggerQA — Trigger a new QA run
 * Body: { triggeredBy: "github"|"vercel"|"manual"|"agent", commitHash?, prNumber? }
 */
http.route({
  path: "/triggerQA",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { triggeredBy, commitHash, prNumber } = body;

      if (!triggeredBy) {
        return new Response(
          JSON.stringify({ error: "triggeredBy is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.qa.triggerRun, {
        triggeredBy,
        commitHash: commitHash || undefined,
        prNumber: prNumber || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Trigger QA error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /getQAStatus?runId=qa-XXXX — Get QA run status
 */
http.route({
  path: "/getQAStatus",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const runId = url.searchParams.get("runId");

      if (!runId) {
        return new Response(
          JSON.stringify({ error: "runId query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const status = await ctx.runQuery(api.qa.getStatus, { runId });

      if (!status) {
        return new Response(
          JSON.stringify({ error: `QA run ${runId} not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(status), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get QA status error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /updateQATest — Update a specific test result
 * Body: { runId, testName, status, duration?, output? }
 */
http.route({
  path: "/updateQATest",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { runId, testName, status, duration, output } = body;

      if (!runId || !testName || !status) {
        return new Response(
          JSON.stringify({ error: "runId, testName, and status are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.qa.updateTest, {
        runId,
        testName,
        status,
        duration: duration || undefined,
        output: output || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Update QA test error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /completeQARun — Complete a QA run
 * Body: { runId, cancelled?: boolean }
 */
http.route({
  path: "/completeQARun",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { runId, cancelled } = body;

      if (!runId) {
        return new Response(
          JSON.stringify({ error: "runId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.qa.completeRun, {
        runId,
        cancelled: cancelled || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Complete QA run error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /qaRuns — List recent QA runs
 * Query params: limit, status
 */
http.route({
  path: "/qaRuns",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit");
      const status = url.searchParams.get("status");

      const runs = await ctx.runQuery(api.qa.listRecent, {
        limit: limit ? parseInt(limit, 10) : undefined,
        status: status as any || undefined,
      });

      return new Response(JSON.stringify({ runs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("List QA runs error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /qaStats — Get QA statistics
 * Query params: since (timestamp)
 */
http.route({
  path: "/qaStats",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const since = url.searchParams.get("since");

      const stats = await ctx.runQuery(api.qa.getStats, {
        since: since ? parseInt(since, 10) : undefined,
      });

      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get QA stats error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// AGT-226: LONG-RUNNING SESSION ENDPOINTS
// ============================================================

/**
 * GET /getAgentMessages?agent=sam — Get unread messages for agent
 * Returns DMs and @mentions for the agent
 */
http.route({
  path: "/getAgentMessages",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const unread = await ctx.runQuery(api.messaging.getUnread, {
        agentName: agent,
      });

      return new Response(JSON.stringify(unread), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get agent messages error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /markMessagesRead — Mark messages as read for agent
 * Body: { agentName: string, messageId?: string }
 * If messageId provided, marks one message; otherwise marks all
 */
http.route({
  path: "/markMessagesRead",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, messageId } = body;

      if (!agentName) {
        return new Response(
          JSON.stringify({ error: "agentName is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      let result;
      if (messageId) {
        result = await ctx.runMutation(api.messaging.markRead, {
          messageId: messageId as Id<"unifiedMessages">,
        });
      } else {
        result = await ctx.runMutation(api.messaging.markAllRead, {
          agentName,
        });
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Mark messages read error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /postToChannel — Post a message to a team channel
 * Body: { from: string, channel: string, message: string }
 */
http.route({
  path: "/postToChannel",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, channel, message } = body;

      if (!from || !channel || !message) {
        return new Response(
          JSON.stringify({ error: "from, channel, and message are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find agent
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find(
        (a: any) => a.name.toLowerCase() === from.toLowerCase()
      );

      // Log to activity events as channel message
      if (agent) {
        await ctx.runMutation(api.activityEvents.log, {
          agentId: agent._id,
          category: "message",
          eventType: "channel_message",
          title: `Posted to #${channel}`,
          description: message,
          metadata: {
            source: "agent_session",
          },
        });
      }

      return new Response(JSON.stringify({ success: true, channel, from }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Post to channel error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});


// ============================================================
// AGT-229: PRIORITY OVERRIDE ENDPOINTS
// ============================================================

/**
 * POST /createUrgentDispatch — Create urgent (P0) dispatch
 */
http.route({
  path: "/createUrgentDispatch",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, command, ticket, description } = body;
      if (!agentName || !command) {
        return new Response(JSON.stringify({ error: "agentName and command required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find((a: any) => a.name.toLowerCase() === agentName.toLowerCase());
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      const dispatchId = await ctx.runMutation(api.dispatches.create, {
        agentId: agent._id, command, payload: JSON.stringify({ identifier: ticket, description }), priority: 0, isUrgent: true,
      });
      return new Response(JSON.stringify({ success: true, dispatchId, priority: "URGENT" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * POST /sendUrgentMessage — Send urgent alert to agent
 */
http.route({
  path: "/sendUrgentMessage",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { to, message, from } = body;
      if (!to || !message) {
        return new Response(JSON.stringify({ error: "to and message required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const result = await ctx.runMutation(api.messaging.sendDM, {
        from: from || "son", to, content: "🚨 URGENT: " + message, priority: "urgent",
      });
      return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * POST /interruptAgent — Stop agent's current task
 */
http.route({
  path: "/interruptAgent",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agentName, reason } = body;
      if (!agentName) {
        return new Response(JSON.stringify({ error: "agentName required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find((a: any) => a.name.toLowerCase() === agentName.toLowerCase());
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      await ctx.runMutation(api.agents.updateStatus, { id: agent._id, status: "idle" });
      const runningDispatches = await ctx.runQuery(api.dispatches.listByAgent, { agentId: agent._id, status: "running" });
      for (const d of runningDispatches) {
        await ctx.runMutation(api.dispatches.fail, { dispatchId: d._id, error: reason || "Interrupted" });
      }
      await ctx.runMutation(api.messaging.sendDM, {
        from: "son", to: agentName.toLowerCase(), content: "⛔ STOP: " + (reason || "Pause current work."), priority: "urgent",
      });
      return new Response(JSON.stringify({ success: true, interrupted: true, dispatchesCancelled: runningDispatches.length }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

// ============================================================
// AGT-234: AUTO-HANDOFF & PING SYSTEM
// ============================================================

/**
 * POST /pingAgent — Send urgent notification to agent
 */
http.route({
  path: "/pingAgent",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, to, message, taskId, pingType } = body;
      if (!to || !message) {
        return new Response(JSON.stringify({ error: "to and message required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const isUrgent = pingType === "urgent";
      const content = isUrgent ? "🔔 PING: " + message : "📌 " + message;
      const result = await ctx.runMutation(api.messaging.sendDM, {
        from: from || "system", to, content, priority: isUrgent ? "urgent" : "normal", relatedTaskId: taskId,
      });
      const agents = await ctx.runQuery(api.agents.list);
      const agent = agents.find((a: any) => a.name.toLowerCase() === to.toLowerCase());
      if (agent) {
        await ctx.runMutation(api.activityEvents.log, {
          agentId: agent._id, category: "message", eventType: "ping",
          title: (from || "System") + " pinged " + to.toUpperCase(), description: message,
          metadata: { source: "ping_system" },
        });
      }
      return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * POST /handoff — Transfer work to another agent
 */
http.route({
  path: "/handoff",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, to, taskId, message, reason } = body;
      if (!from || !to) {
        return new Response(JSON.stringify({ error: "from and to required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const agents = await ctx.runQuery(api.agents.list);
      const toAgent = agents.find((a: any) => a.name.toLowerCase() === to.toLowerCase());
      const fromAgent = agents.find((a: any) => a.name.toLowerCase() === from.toLowerCase());
      if (!toAgent) {
        return new Response(JSON.stringify({ error: "Target agent not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      const now = Date.now();
      const handoffMessage = message || from.toUpperCase() + " handed off work to you" + (reason ? ": " + reason : "");
      await ctx.runMutation(api.messaging.sendDM, {
        from, to, content: "🤝 HANDOFF: " + handoffMessage, priority: "normal", relatedTaskId: taskId,
      });
      await ctx.runMutation(api.activityEvents.log, {
        agentId: fromAgent?._id || toAgent._id, category: "task", eventType: "handoff",
        title: from.toUpperCase() + " handed off to " + to.toUpperCase(), description: handoffMessage,
        metadata: { source: "handoff_system" },
      });
      // AGT-247: Fire event bus notification for handoff
      await ctx.runMutation(api.agentEvents.publishEventFromHTTP, {
        type: "handoff",
        targetAgent: to.toLowerCase(),
        payload: {
          taskId: taskId || undefined,
          fromAgent: from.toLowerCase(),
          message: handoffMessage,
          priority: "high",
        },
      });
      return new Response(JSON.stringify({ success: true, from, to, message: handoffMessage }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * POST /requestApproval — Ask Max for decision
 */
http.route({
  path: "/requestApproval",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { from, taskId, question, options } = body;
      if (!from || !question) {
        return new Response(JSON.stringify({ error: "from and question required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const content = "❓ APPROVAL NEEDED from " + from.toUpperCase() + ": " + question + (options ? "\nOptions: " + options.join(", ") : "");
      const result = await ctx.runMutation(api.messaging.sendDM, {
        from, to: "max", content, priority: "normal", relatedTaskId: taskId,
      });
      const agents = await ctx.runQuery(api.agents.list);
      const maxAgent = agents.find((a: any) => a.name === "MAX");
      if (maxAgent) {
        await ctx.runMutation(api.notifications.create, {
          to: maxAgent._id, type: "review_request", title: "Approval Request from " + from.toUpperCase(),
          message: question, relatedTask: taskId,
        });
      }
      if (maxAgent) {
        await ctx.runMutation(api.activityEvents.log, {
          agentId: maxAgent._id, category: "message", eventType: "approval_request",
          title: from.toUpperCase() + " requested approval", description: question,
          metadata: { source: "approval_system" },
        });
      }
      // AGT-247: Fire event bus notification for approval request
      await ctx.runMutation(api.agentEvents.publishEventFromHTTP, {
        type: "approval_needed",
        targetAgent: "max",
        payload: {
          taskId: taskId || undefined,
          fromAgent: from.toLowerCase(),
          message: question,
          priority: "urgent",
        },
      });
      return new Response(JSON.stringify({ success: true, ...result, sentTo: "max" }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * POST /v2/learn — Submit session learning (agents call this when ending session)
 * Body: { agent, taskId?, taskTitle, summary, files, challenges?, patterns?, tags }
 */
http.route({
  path: "/v2/learn",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { agent, taskId, taskTitle, summary, files, challenges, patterns, tags } = body;
      if (!agent || !taskTitle || !summary) {
        return new Response(JSON.stringify({ error: "agent, taskTitle, and summary required" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      const result = await ctx.runMutation(api.learnings.submitLearning, {
        agentName: agent, taskId: taskId || undefined, taskTitle, summary,
        filesChanged: files || [], challenges: challenges || undefined,
        patterns: patterns || undefined, tags: tags || ["session"],
      });
      const agents = await ctx.runQuery(api.agents.list);
      const agentRecord = agents.find((a: any) => a.name?.toLowerCase() === agent.toLowerCase());
      if (agentRecord) {
        await ctx.runMutation(api.activityEvents.log, {
          agentId: agentRecord._id, category: "task", eventType: "learning_submitted",
          title: agent.toUpperCase() + " logged session learning", description: summary.substring(0, 200),
          linearIdentifier: taskId || undefined,
        });
      }
      return new Response(JSON.stringify({ success: true, learningId: result.id }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("v2/learn error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

/**
 * GET /v2/learnings — Get recent learnings (for agents to learn from others)
 */
http.route({
  path: "/v2/learnings",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      let learnings;
      if (agent) {
        learnings = await ctx.runQuery(api.learnings.getByAgent, { agentName: agent, limit });
      } else {
        learnings = await ctx.runQuery(api.learnings.listRecent, { limit });
      }
      return new Response(JSON.stringify({ learnings }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

// ============================================================
// AGT-242: PERFORMANCE METRICS ENDPOINTS
// ============================================================

/**
 * GET /api/performance/agent?agent=sam&startDate=2026-02-04&endDate=2026-02-04
 * Get performance metrics for a specific agent
 */
http.route({
  path: "/api/performance/agent",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const startDate = url.searchParams.get("startDate") || undefined;
      const endDate = url.searchParams.get("endDate") || undefined;
      const limit = url.searchParams.get("limit");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const metrics = await ctx.runQuery(api.performanceMetrics.getAgentMetrics, {
        agentName: agent,
        startDate,
        endDate,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return new Response(JSON.stringify({ agent, metrics }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get agent performance error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /api/performance/dashboard?date=2026-02-04
 * Get aggregated metrics for all agents (dashboard overview)
 */
http.route({
  path: "/api/performance/dashboard",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const date = url.searchParams.get("date") || undefined;

      const metrics = await ctx.runQuery(api.performanceMetrics.getAllAgentsMetrics, {
        date,
      });

      return new Response(JSON.stringify({ date, agents: metrics }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get dashboard metrics error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /api/performance/latest?agent=sam
 * Get latest real-time metrics for an agent
 */
http.route({
  path: "/api/performance/latest",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const metrics = await ctx.runQuery(api.performanceMetrics.getLatestMetrics, {
        agentName: agent,
      });

      return new Response(JSON.stringify({ agent, metrics }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get latest metrics error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /api/performance/velocity?agent=sam&hours=24
 * Get velocity trend (tasks per hour) over time
 */
http.route({
  path: "/api/performance/velocity",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const hours = url.searchParams.get("hours");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const trend = await ctx.runQuery(api.performanceMetrics.getVelocityTrend, {
        agentName: agent,
        hours: hours ? parseInt(hours, 10) : undefined,
      });

      return new Response(JSON.stringify({ agent, trend }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get velocity trend error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /api/performance/costs?date=2026-02-04
 * Get cost breakdown by agent
 */
http.route({
  path: "/api/performance/costs",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const date = url.searchParams.get("date") || undefined;

      const costs = await ctx.runQuery(api.performanceMetrics.getCostBreakdown, {
        date,
      });

      return new Response(JSON.stringify({ date, costs }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Get cost breakdown error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});


// ============================================================
// AGT-247: EVENT BUS ENDPOINTS — Real-time Agent Notifications
// ============================================================

/**
 * GET /api/events/subscribe?agent=<name>&since=<timestamp>
 * Subscribe to events for a specific agent.
 * Returns pending events that have not been delivered yet.
 */
http.route({
  path: "/api/events/subscribe",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");
      const since = url.searchParams.get("since");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "agent query parameter is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runQuery(api.agentEvents.subscribeToEvents, {
        agent: agent.toLowerCase(),
        since: since ? parseInt(since) : undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event subscription error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /api/events/ack
 * Acknowledge receipt of an event.
 * Body: { eventId: "..." }
 */
http.route({
  path: "/api/events/ack",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { eventId } = body;

      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "eventId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.agentEvents.acknowledgeEvent, {
        eventId,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event acknowledgment error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /api/events/publish
 * Manually publish an event to an agent.
 * Body: { type: "...", targetAgent: "...", payload: {...} }
 */
http.route({
  path: "/api/events/publish",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { type, targetAgent, payload } = body;

      if (!type || !targetAgent || !payload) {
        return new Response(
          JSON.stringify({ error: "type, targetAgent, and payload are required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.agentEvents.publishEventFromHTTP, {
        type,
        targetAgent: targetAgent.toLowerCase(),
        payload,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Event publish error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// ============================================================
// DEVICE SYNC ENDPOINTS
// ============================================================

/**
 * POST /v2/sessionState — Update session state for agent on device
 */
http.route({
  path: "/v2/sessionState",
  method: "POST",
  handler: withAuth(async (ctx, request) => {
    try {
      const body = await request.json();
      const { device, agent, status, currentTask, currentFile, notes, metadata } = body;

      if (!device || !agent || !status) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: device, agent, status" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(api.deviceSync.updateSessionState, {
        device,
        agent,
        status,
        currentTask,
        currentFile,
        notes,
        metadata,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Session state update error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/syncOverview — Get sync overview of all devices and agents
 */
http.route({
  path: "/v2/syncOverview",
  method: "GET",
  handler: withAuth(async (ctx) => {
    try {
      const overview = await ctx.runQuery(api.deviceSync.getSyncOverview);

      return new Response(JSON.stringify(overview), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Sync overview error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/deviceSessions?device=mac-mini — Get sessions for specific device
 */
http.route({
  path: "/v2/deviceSessions",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const device = url.searchParams.get("device");

      if (!device) {
        return new Response(
          JSON.stringify({ error: "Missing required param: device" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const sessions = await ctx.runQuery(api.deviceSync.getDeviceSessionStates, { device });

      return new Response(JSON.stringify({ device, sessions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Device sessions error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * GET /v2/agentSessions?agent=max — Get sessions for specific agent across devices
 */
http.route({
  path: "/v2/agentSessions",
  method: "GET",
  handler: withAuth(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const agent = url.searchParams.get("agent");

      if (!agent) {
        return new Response(
          JSON.stringify({ error: "Missing required param: agent" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const sessions = await ctx.runQuery(api.deviceSync.getAgentSessionStates, { agent });

      return new Response(JSON.stringify({ agent, sessions }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Agent sessions error:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
