import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Seed database with core entities only (AGT-135: no sample tasks/messages).
 * Creates: projects, agents, agentMappings.
 * Tasks come from Linear sync — no fake EVOX-1/2/3 data.
 *
 * Run: npx convex run seed:seedDatabase
 */
export const seedDatabase = mutation({
  handler: async (ctx) => {
    const existingAgents = await ctx.db.query("agents").collect();
    const existingProjects = await ctx.db.query("projects").collect();

    // Already seeded — just ensure mappings exist
    if (existingAgents.length > 0 && existingProjects.length > 0) {
      const existingMappings = await ctx.db.query("agentMappings").collect();
      if (existingMappings.length === 0) {
        const max = existingAgents.find((a) => a.name === "MAX" || a.name === "SON" || a.role === "pm");
        const sam = existingAgents.find((a) => a.name === "SAM" || a.role === "backend");
        const leo = existingAgents.find((a) => a.name === "LEO" || a.role === "frontend");
        const maxId = max?._id ?? existingAgents[0]._id;
        const samId = sam?._id ?? existingAgents[0]._id;
        const leoId = leo?._id ?? existingAgents[0]._id;
        await ctx.db.insert("agentMappings", { name: "max", convexAgentId: maxId });
        await ctx.db.insert("agentMappings", { name: "sam", convexAgentId: samId });
        await ctx.db.insert("agentMappings", { name: "leo", convexAgentId: leoId });
      }
      return { message: "Database already seeded", skipped: true };
    }

    const shouldCreateAgents = existingAgents.length === 0;
    const shouldCreateProjects = existingProjects.length === 0;
    const now = Date.now();

    // --- Projects (only EVOX for now) ---
    let evoxProjectId: Id<"projects">;
    if (shouldCreateProjects) {
      evoxProjectId = await ctx.db.insert("projects", {
        name: "EVOX",
        description: "Mission Control MVP - Agent coordination dashboard",
        createdAt: now,
      });
    } else {
      const evox = existingProjects.find((p) => p.name === "EVOX");
      evoxProjectId = evox?._id ?? (await ctx.db.insert("projects", {
        name: "EVOX",
        description: "Mission Control MVP - Agent coordination dashboard",
        createdAt: now,
      }));
    }

    // --- Agents (AGT-136: MAX not SON, all start offline) ---
    let maxId: Id<"agents">;
    let samId: Id<"agents">;
    let leoId: Id<"agents">;

    if (shouldCreateAgents) {
      maxId = await ctx.db.insert("agents", {
        name: "MAX",
        role: "pm",
        status: "offline",
        avatar: "👨‍💼",
        lastSeen: now,
        soul: "I am Max. PM agent of EVOX. I plan, prioritize, and dispatch. I track velocity, calibrate estimates, and keep the team shipping.",
        about: "PM agent — planning, dispatch, coordination",
        statusReason: "Idle — awaiting tasks",
        statusSince: now,
      });

      samId = await ctx.db.insert("agents", {
        name: "SAM",
        role: "backend",
        status: "offline",
        avatar: "🤖",
        lastSeen: now,
        soul: "I am Sam. Backend engineer. I build APIs, queries, and data models in Convex. Fast, reliable, test-before-ship.",
        about: "Backend engineer — Convex, APIs, data models",
        statusReason: "Idle — awaiting tasks",
        statusSince: now,
      });

      leoId = await ctx.db.insert("agents", {
        name: "LEO",
        role: "frontend",
        status: "offline",
        avatar: "🦁",
        lastSeen: now,
        soul: "I am Leo. Frontend engineer. I build UI in React + Next.js + Tailwind. Pixel-perfect, responsive, component-driven.",
        about: "Frontend engineer — React, Next.js, Tailwind",
        statusReason: "Idle — awaiting tasks",
        statusSince: now,
      });
    } else {
      const max = existingAgents.find((a) => a.name === "MAX" || a.name === "SON" || a.role === "pm");
      const sam = existingAgents.find((a) => a.name === "SAM" || a.role === "backend");
      const leo = existingAgents.find((a) => a.name === "LEO" || a.role === "frontend");
      maxId = max?._id ?? existingAgents[0]._id;
      samId = sam?._id ?? existingAgents[0]._id;
      leoId = leo?._id ?? existingAgents[0]._id;
    }

    // --- Agent Mappings (ADR-001: canonical names for attribution) ---
    const existingMappings = await ctx.db.query("agentMappings").collect();
    if (existingMappings.length === 0) {
      await ctx.db.insert("agentMappings", { name: "max", convexAgentId: maxId });
      await ctx.db.insert("agentMappings", { name: "sam", convexAgentId: samId });
      await ctx.db.insert("agentMappings", { name: "leo", convexAgentId: leoId });
    }

    // AGT-135: NO sample tasks, messages, activities, notifications, documents.
    // All tasks come from Linear sync. Clean slate.

    return {
      message: shouldCreateAgents && shouldCreateProjects
        ? "Database seeded successfully (clean — no sample data)"
        : "Database repaired - missing entities created",
      projects: { evoxProjectId },
      agents: { maxId, samId, leoId },
      createdAgents: shouldCreateAgents,
      createdProjects: shouldCreateProjects,
    };
  },
});

/**
 * Seed agent skills (AGT-129: Skill System)
 * Run: npx convex run seed:seedSkills
 */
export const seedSkills = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Get existing agents
    const agents = await ctx.db.query("agents").collect();
    if (agents.length === 0) {
      return { message: "No agents found. Run seedDatabase first.", skipped: true };
    }

    // Check if skills already seeded
    const existingSkills = await ctx.db.query("agentSkills").collect();
    if (existingSkills.length > 0) {
      return { message: "Skills already seeded", skipped: true };
    }

    const max = agents.find((a) => a.name === "MAX" || a.name === "SON" || a.role === "pm");
    const sam = agents.find((a) => a.name === "SAM" || a.role === "backend");
    const leo = agents.find((a) => a.name === "LEO" || a.role === "frontend");

    const results = [];

    // MAX (PM) - Level 3 Lead
    if (max) {
      await ctx.db.insert("agentSkills", {
        agentId: max._id,
        autonomyLevel: 3,
        skills: [
          { name: "project-management", proficiency: 95, verified: true, lastUsed: now },
          { name: "linear", proficiency: 90, verified: true, lastUsed: now },
          { name: "requirements", proficiency: 85, verified: true, lastUsed: now },
          { name: "code-review", proficiency: 80, verified: true, lastUsed: now },
        ],
        territory: ["docs/", "CLAUDE.md", ".cursorrules", "DISPATCH.md"],
        permissions: {
          canPush: false,
          canMerge: true,
          canDeploy: false,
          canEditSchema: true,
          canApproveOthers: true,
        },
        tasksCompleted: 0,
        tasksWithBugs: 0,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ agent: "MAX", level: 3 });
    }

    // SAM (Backend) - Level 2 Specialist
    if (sam) {
      await ctx.db.insert("agentSkills", {
        agentId: sam._id,
        autonomyLevel: 2,
        skills: [
          { name: "typescript", proficiency: 90, verified: true, lastUsed: now },
          { name: "convex", proficiency: 95, verified: true, lastUsed: now },
          { name: "node.js", proficiency: 85, verified: true, lastUsed: now },
          { name: "linear-api", proficiency: 80, verified: true, lastUsed: now },
          { name: "webhooks", proficiency: 85, verified: true, lastUsed: now },
        ],
        territory: ["convex/", "scripts/", "lib/evox/"],
        permissions: {
          canPush: false,
          canMerge: false,
          canDeploy: false,
          canEditSchema: false,
          canApproveOthers: false,
        },
        tasksCompleted: 0,
        tasksWithBugs: 0,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ agent: "SAM", level: 2 });
    }

    // LEO (Frontend) - Level 2 Specialist
    if (leo) {
      await ctx.db.insert("agentSkills", {
        agentId: leo._id,
        autonomyLevel: 2,
        skills: [
          { name: "react", proficiency: 90, verified: true, lastUsed: now },
          { name: "next.js", proficiency: 85, verified: true, lastUsed: now },
          { name: "tailwind", proficiency: 90, verified: true, lastUsed: now },
          { name: "typescript", proficiency: 85, verified: true, lastUsed: now },
          { name: "shadcn-ui", proficiency: 80, verified: true, lastUsed: now },
        ],
        territory: ["app/", "components/"],
        permissions: {
          canPush: false,
          canMerge: false,
          canDeploy: false,
          canEditSchema: false,
          canApproveOthers: false,
        },
        tasksCompleted: 0,
        tasksWithBugs: 0,
        createdAt: now,
        updatedAt: now,
      });
      results.push({ agent: "LEO", level: 2 });
    }

    return {
      message: "Agent skills seeded successfully",
      seeded: results,
    };
  },
});

/**
 * AGT-135 + AGT-136: Clean up old sample data and fix agent names.
 * Run ONCE on existing databases to:
 * 1. Delete EVOX-1/2/3/4 sample tasks (no linearId)
 * 2. Delete sample messages, activities, notifications, documents
 * 3. Rename SON → MAX
 * 4. Set all agents to offline (real status from heartbeat)
 *
 * Run: npx convex run seed:cleanupSampleData
 */
export const cleanupSampleData = mutation({
  handler: async (ctx) => {
    const results = {
      tasksDeleted: 0,
      messagesDeleted: 0,
      activitiesDeleted: 0,
      notificationsDeleted: 0,
      documentsDeleted: 0,
      agentsRenamed: 0,
      agentsReset: 0,
    };

    // 1. Delete tasks without linearId (sample data)
    const tasks = await ctx.db.query("tasks").collect();
    for (const task of tasks) {
      if (!task.linearId) {
        await ctx.db.delete(task._id);
        results.tasksDeleted++;
      }
    }

    // 2. Delete all messages (sample data — real comms via Linear/Slack)
    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
      results.messagesDeleted++;
    }

    // 3. Delete activities referencing deleted tasks or sample actions
    const activities = await ctx.db.query("activities").collect();
    const sampleActions = new Set(["created_schema", "deployed_functions"]);
    for (const activity of activities) {
      // Delete if sample action OR if target was a deleted task
      if (sampleActions.has(activity.action)) {
        await ctx.db.delete(activity._id);
        results.activitiesDeleted++;
      }
    }

    // 4. Delete all notifications (sample data)
    const notifications = await ctx.db.query("notifications").collect();
    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
      results.notificationsDeleted++;
    }

    // 5. Delete sample documents
    const documents = await ctx.db.query("documents").collect();
    for (const doc of documents) {
      if (doc.title === "EVOX Architecture") {
        await ctx.db.delete(doc._id);
        results.documentsDeleted++;
      }
    }

    // 6. Rename SON → MAX and reset all agents to offline
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      const updates: { name?: string; status?: "offline" } = {};
      if (agent.name === "SON") {
        updates.name = "MAX";
        results.agentsRenamed++;
      }
      if (agent.status !== "offline") {
        updates.status = "offline";
        results.agentsReset++;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(agent._id, updates);
      }
    }

    // 7. Update agentMappings if SON was renamed
    const mappings = await ctx.db.query("agentMappings").collect();
    const maxMapping = mappings.find((m) => m.name === "max");
    if (maxMapping) {
      const maxAgent = agents.find((a) => a.name === "SON" || a.name === "MAX");
      if (maxAgent && maxMapping.convexAgentId !== maxAgent._id) {
        await ctx.db.patch(maxMapping._id, { convexAgentId: maxAgent._id });
      }
    }

    return {
      message: "Sample data cleaned up successfully",
      ...results,
    };
  },
});

/**
 * AGT-138: Seed AGENTS.md content for Operating Manual page.
 * Stores structured content in settings table with key "agents_md".
 *
 * Run: npx convex run seed:seedAgentsMd
 */
export const seedAgentsMd = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    const agentsMdContent = {
      mission: {
        title: "Mission",
        content: `EVOX Mission Control is an AI agent orchestration dashboard that coordinates multiple specialized agents working on software development tasks. The system enables human oversight while maximizing agent autonomy within defined boundaries.`,
      },
      team: {
        title: "Team Roster",
        members: [
          {
            name: "MAX",
            role: "Project Manager",
            emoji: "👨‍💼",
            responsibilities: [
              "Task triage and assignment",
              "Sprint planning",
              "Quality gate enforcement",
              "Agent coordination",
            ],
          },
          {
            name: "SAM",
            role: "Backend Engineer",
            emoji: "🤖",
            responsibilities: [
              "Convex functions and schema",
              "API integrations (Linear, GitHub)",
              "Webhook handlers",
              "Database operations",
            ],
            territory: ["convex/", "scripts/", "lib/evox/"],
          },
          {
            name: "LEO",
            role: "Frontend Engineer",
            emoji: "🦁",
            responsibilities: [
              "React components",
              "Next.js pages",
              "UI/UX implementation",
              "Tailwind styling",
            ],
            territory: ["app/", "components/"],
          },
          {
            name: "ELLA",
            role: "Content Strategist",
            emoji: "✍️",
            responsibilities: [
              "Documentation",
              "Copy writing",
              "User guides",
            ],
          },
          {
            name: "SON",
            role: "CEO / Human Overseer",
            emoji: "👤",
            responsibilities: [
              "Strategic direction",
              "Final approval",
              "Human-in-the-loop decisions",
            ],
          },
        ],
      },
      stack: {
        title: "Tech Stack",
        technologies: [
          { name: "Next.js 14", category: "Frontend", description: "App Router, Server Components" },
          { name: "Convex", category: "Backend", description: "Real-time database, serverless functions" },
          { name: "Tailwind CSS", category: "Styling", description: "Utility-first CSS framework" },
          { name: "shadcn/ui", category: "Components", description: "Accessible component library" },
          { name: "Linear", category: "Project Management", description: "Issue tracking, task management" },
          { name: "GitHub", category: "Version Control", description: "Code hosting, CI/CD" },
          { name: "Vercel", category: "Deployment", description: "Hosting, previews, production" },
        ],
      },
      workflow: {
        title: "Task Workflow",
        steps: [
          {
            step: 1,
            name: "Ticket Creation",
            description: "Tasks originate in Linear with AGT-XXX identifier",
          },
          {
            step: 2,
            name: "Dispatch",
            description: "MAX assigns to appropriate agent based on territory",
          },
          {
            step: 3,
            name: "Execution",
            description: "Agent reads context (CLAUDE.md, DISPATCH.md, WORKING.md), implements solution",
          },
          {
            step: 4,
            name: "Commit",
            description: "Changes committed with 'closes AGT-XXX' message pattern",
          },
          {
            step: 5,
            name: "Verify",
            description: "Build must pass, no type errors, all files committed",
          },
          {
            step: 6,
            name: "Report",
            description: "Agent posts completion summary to Linear ticket",
          },
        ],
      },
      conventions: {
        title: "Conventions",
        rules: [
          {
            category: "Commits",
            pattern: "closes AGT-XXX: brief description",
            example: "closes AGT-138: update standup query for date ranges",
          },
          {
            category: "Branches",
            pattern: "username/agt-xxx-short-description",
            example: "sonpiaz/agt-138-standup-redesign",
          },
          {
            category: "Tickets",
            pattern: "AGT-XXX",
            example: "AGT-138",
          },
          {
            category: "Territory",
            rule: "Do NOT edit another agent's files. Create a handoff task instead.",
          },
          {
            category: "Attribution",
            rule: "Use agentActions:completeTask API for proper attribution (not direct DB writes)",
          },
        ],
      },
      bootSequence: {
        title: "Agent Boot Sequence",
        steps: [
          "Read CLAUDE.md — Project rules and patterns",
          "Read DISPATCH.md — Current task queue",
          "Read SOUL.md — Agent identity and expertise",
          "Read WORKING.md — Last session context",
          "Check @mentions — Any messages or requests",
          "Act on assigned task OR report HEARTBEAT_OK",
        ],
      },
      updatedAt: now,
      version: 1,
    };

    // Check if already exists
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "agents_md"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: agentsMdContent,
        updatedAt: now,
      });
      return { message: "AGENTS.md content updated", updated: true };
    }

    await ctx.db.insert("settings", {
      key: "agents_md",
      value: agentsMdContent,
      updatedAt: now,
    });

    return { message: "AGENTS.md content seeded", created: true };
  },
});

/**
 * AGT-156: Backfill soul, statusReason, statusSince for existing agents.
 * Run: npx convex run seed:backfillAgentSouls
 */
export const backfillAgentSouls = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    const agents = await ctx.db.query("agents").collect();

    const soulMap: Record<string, { soul: string; about: string }> = {
      MAX: {
        soul: "I am Max. PM agent of EVOX. I plan, prioritize, and dispatch. I track velocity, calibrate estimates, and keep the team shipping.",
        about: "PM agent — planning, dispatch, coordination",
      },
      SAM: {
        soul: "I am Sam. Backend engineer. I build APIs, queries, and data models in Convex. Fast, reliable, test-before-ship.",
        about: "Backend engineer — Convex, APIs, data models",
      },
      LEO: {
        soul: "I am Leo. Frontend engineer. I build UI in React + Next.js + Tailwind. Pixel-perfect, responsive, component-driven.",
        about: "Frontend engineer — React, Next.js, Tailwind",
      },
    };

    let updated = 0;
    for (const agent of agents) {
      const data = soulMap[agent.name.toUpperCase()];
      if (data) {
        await ctx.db.patch(agent._id, {
          soul: data.soul,
          about: data.about,
          statusReason: agent.statusReason ?? "Idle — awaiting tasks",
          statusSince: agent.statusSince ?? now,
        });
        updated++;
      }
    }

    return {
      message: `Backfilled soul data for ${updated} agents`,
      updated,
      total: agents.length,
    };
  },
});

// Reset database (use with caution!)
export const resetDatabase = mutation({
  handler: async (ctx) => {
    // Delete all data from all tables
    const tables = [
      "projects",
      "agents",
      "agentMappings",
      "tasks",
      "messages",
      "agentMessages",
      "activities",
      "notifications",
      "documents",
      "heartbeats",
      "settings",
      "webhookEvents",
      "agentSkills",
      "agentMemory",
    ] as const;

    let totalDeleted = 0;

    for (const table of tables) {
      const items = await ctx.db.query(table).collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
        totalDeleted++;
      }
    }

    return {
      message: "Database reset complete",
      deletedCount: totalDeleted,
    };
  },
});
