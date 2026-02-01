import { mutation } from "./_generated/server";

export const seedDatabase = mutation({
  handler: async (ctx) => {
    // Check if already seeded
    const existingAgents = await ctx.db.query("agents").collect();
    if (existingAgents.length > 0) {
      return { message: "Database already seeded", skipped: true };
    }

    const now = Date.now();

    // Create projects
    const evoxProjectId = await ctx.db.insert("projects", {
      name: "EVOX",
      description: "Mission Control MVP - Agent coordination dashboard",
      createdAt: now,
    });

    const agentFactoryId = await ctx.db.insert("projects", {
      name: "Agent Factory",
      description: "AI agent creation and management platform",
      createdAt: now,
    });

    const affitorId = await ctx.db.insert("projects", {
      name: "Affitor",
      description: "Affiliate marketing automation tool",
      createdAt: now,
    });

    const myTimezoneId = await ctx.db.insert("projects", {
      name: "MyTimezone",
      description: "Global time zone coordination app",
      createdAt: now,
    });

    // Create agents
    const sonId = await ctx.db.insert("agents", {
      name: "SON",
      role: "pm",
      status: "online",
      avatar: "👨‍💼",
      lastSeen: now,
    });

    const samId = await ctx.db.insert("agents", {
      name: "SAM",
      role: "backend",
      status: "online",
      avatar: "🤖",
      lastSeen: now,
    });

    const leoId = await ctx.db.insert("agents", {
      name: "LEO",
      role: "frontend",
      status: "offline",
      avatar: "🦁",
      lastSeen: now,
    });

    // Create initial tasks
    const task1 = await ctx.db.insert("tasks", {
      projectId: evoxProjectId,
      title: "EVOX-1: Setup Convex schema",
      description: "Create schema.ts with 7 tables: agents, tasks, messages, activities, notifications, documents, heartbeats",
      status: "in_progress",
      priority: "urgent",
      assignee: samId,
      createdBy: sonId,
      createdAt: now,
      updatedAt: now,
    });

    const task2 = await ctx.db.insert("tasks", {
      projectId: evoxProjectId,
      title: "EVOX-2: Create backend CRUD functions",
      description: "Implement CRUD operations for agents, tasks, messages, activities in Convex",
      status: "in_progress",
      priority: "high",
      assignee: samId,
      createdBy: sonId,
      createdAt: now,
      updatedAt: now,
    });

    const task3 = await ctx.db.insert("tasks", {
      projectId: evoxProjectId,
      title: "EVOX-3: Design Mission Control UI",
      description: "Create main dashboard layout with agent status, task board, and activity feed",
      status: "todo",
      priority: "high",
      assignee: leoId,
      createdBy: sonId,
      createdAt: now,
      updatedAt: now,
    });

    const task4 = await ctx.db.insert("tasks", {
      projectId: evoxProjectId,
      title: "EVOX-4: Implement real-time updates",
      description: "Connect frontend to Convex subscriptions for live data updates",
      status: "backlog",
      priority: "medium",
      createdBy: sonId,
      createdAt: now,
      updatedAt: now,
    });

    // Create welcome messages
    await ctx.db.insert("messages", {
      from: sonId,
      content: "Welcome to EVOX Mission Control! Let's build something amazing. 🚀",
      channel: "general",
      mentions: [samId, leoId],
      createdAt: now,
    });

    await ctx.db.insert("messages", {
      from: samId,
      content: "Backend infrastructure ready. Schema and CRUD functions deployed. ⚙️",
      channel: "dev",
      mentions: [],
      createdAt: now + 1000,
    });

    // Create initial activities
    await ctx.db.insert("activities", {
      agent: samId,
      action: "created_schema",
      target: "convex/schema.ts",
      metadata: { tables: 7 },
      createdAt: now,
    });

    await ctx.db.insert("activities", {
      agent: samId,
      action: "deployed_functions",
      target: "convex/",
      metadata: { files: ["agents.ts", "tasks.ts", "messages.ts", "activities.ts"] },
      createdAt: now + 1000,
    });

    await ctx.db.insert("activities", {
      agent: sonId,
      action: "created_task",
      target: task1,
      createdAt: now + 2000,
    });

    // Create initial notifications
    await ctx.db.insert("notifications", {
      to: samId,
      type: "assignment",
      title: "New Task Assigned",
      message: "You've been assigned: EVOX-1: Setup Convex schema",
      read: false,
      relatedTask: task1,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      to: samId,
      type: "assignment",
      title: "New Task Assigned",
      message: "You've been assigned: EVOX-2: Create backend CRUD functions",
      read: false,
      relatedTask: task2,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      to: leoId,
      type: "assignment",
      title: "New Task Assigned",
      message: "You've been assigned: EVOX-3: Design Mission Control UI",
      read: false,
      relatedTask: task3,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      to: samId,
      type: "mention",
      title: "You were mentioned",
      message: "Welcome to EVOX Mission Control! Let's build something amazing. 🚀",
      read: false,
      createdAt: now,
    });

    await ctx.db.insert("notifications", {
      to: leoId,
      type: "mention",
      title: "You were mentioned",
      message: "Welcome to EVOX Mission Control! Let's build something amazing. 🚀",
      read: false,
      createdAt: now,
    });

    // Create initial documentation
    await ctx.db.insert("documents", {
      title: "EVOX Architecture",
      content: `# EVOX Architecture

## Tech Stack
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Database: Convex (real-time, serverless)

## Agent Territories
- SON (PM): Project management, requirements, coordination
- SAM (Backend): convex/, scripts/, lib/evox/
- LEO (Frontend): app/evox/, components/evox/

## Rules
- Commit format: closes EVOX-XX
- No auto-push unless Son approves
- Types first: schema.ts before UI`,
      author: sonId,
      project: "EVOX",
      updatedAt: now,
    });

    // Create initial heartbeats
    await ctx.db.insert("heartbeats", {
      agent: sonId,
      status: "online",
      timestamp: now,
      metadata: { source: "seed" },
    });

    await ctx.db.insert("heartbeats", {
      agent: samId,
      status: "online",
      timestamp: now,
      metadata: { source: "seed" },
    });

    await ctx.db.insert("heartbeats", {
      agent: leoId,
      status: "offline",
      timestamp: now,
      metadata: { source: "seed" },
    });

    return {
      message: "Database seeded successfully",
      projects: { evoxProjectId, agentFactoryId, affitorId, myTimezoneId },
      agents: { sonId, samId, leoId },
      tasks: { task1, task2, task3, task4 },
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
      "tasks",
      "messages",
      "activities",
      "notifications",
      "documents",
      "heartbeats",
      "settings",
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
