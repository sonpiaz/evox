import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  // Agent management
  agents: defineTable({
    name: v.string(),
    role: v.union(v.literal("pm"), v.literal("backend"), v.literal("frontend")),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
    statusReason: v.optional(v.string()), // Why agent is in this status (e.g., "Working on AGT-150")
    statusSince: v.optional(v.number()),  // Timestamp when status last changed
    currentTask: v.optional(v.id("tasks")),
    avatar: v.string(),
    soul: v.optional(v.string()), // Agent identity/personality summary (from SOUL.md)
    lastSeen: v.number(),
    lastHeartbeat: v.optional(v.number()), // AGT-119: Last heartbeat timestamp
    linearUserId: v.optional(v.string()), // Linear user ID for API attribution
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"]),

  // Agent name → Convex/Linear mapping (ADR-001: attribution from caller, not Linear API key)
  agentMappings: defineTable({
    name: v.string(), // canonical: "max" | "sam" | "leo"
    convexAgentId: v.id("agents"),
    linearUserId: v.optional(v.string()), // Linear user ID for API calls
  }).index("by_name", ["name"]),

  // Task management
  tasks: defineTable({
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    assignee: v.optional(v.id("agents")),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    createdBy: v.id("agents"),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Linear integration fields
    linearId: v.optional(v.string()),
    linearIdentifier: v.optional(v.string()), // e.g., "AGT-72"
    linearUrl: v.optional(v.string()),
    // AGT-134: attribution for Standup (Son→max, Sam→sam, Leo→leo); group by agentName not assignee
    agentName: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_agentName", ["agentName"])
    .index("by_priority", ["priority"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_linearId", ["linearId"]),

  // Communication
  messages: defineTable({
    from: v.id("agents"),
    content: v.string(),
    channel: v.union(
      v.literal("general"),
      v.literal("dev"),
      v.literal("design")
    ),
    mentions: v.array(v.id("agents")),
    threadId: v.optional(v.id("messages")),
    createdAt: v.number(),
  })
    .index("by_channel", ["channel"])
    .index("by_thread", ["threadId"]),

  // Agent-to-agent messages (AGT-123: handoff, update, request, fyi)
  agentMessages: defineTable({
    from: v.id("agents"),
    to: v.id("agents"),
    type: v.union(
      v.literal("handoff"),
      v.literal("update"),
      v.literal("request"),
      v.literal("fyi")
    ),
    content: v.string(),
    taskRef: v.optional(v.id("tasks")),
    status: v.union(v.literal("unread"), v.literal("read")),
    timestamp: v.number(),
  })
    .index("by_to_status", ["to", "status"])
    .index("by_from_to", ["from", "to"])
    .index("by_timestamp", ["timestamp"]),

  // Activity tracking
  activities: defineTable({
    agent: v.id("agents"),
    action: v.string(),
    target: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agent"])
    .index("by_created_at", ["createdAt"]),

  // AGT-137: Unified Activity Events (single source of truth for activity feed)
  // Typed categories, proper entity references, human-readable display fields
  activityEvents: defineTable({
    // WHO: Agent that performed the action
    agentId: v.id("agents"),
    agentName: v.string(), // Denormalized for fast display (max, sam, leo)

    // WHAT: Event category and type
    category: v.union(
      v.literal("task"),     // Task status changes, assignments
      v.literal("git"),      // Commits, pushes, PRs
      v.literal("deploy"),   // Vercel deployments
      v.literal("system"),   // Sync, errors, admin actions
      v.literal("message")   // Agent communications
    ),
    eventType: v.string(),   // e.g., "status_change", "push", "deploy_success"

    // CONTEXT: What was affected
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()), // AGT-XXX for display
    projectId: v.optional(v.id("projects")),

    // DISPLAY: Human-readable summary
    title: v.string(),       // Short: "SAM completed AGT-137"
    description: v.optional(v.string()), // Longer details if needed

    // METADATA: Structured data for the event type
    metadata: v.optional(v.object({
      // Task events
      fromStatus: v.optional(v.string()),
      toStatus: v.optional(v.string()),
      // Git events
      commitHash: v.optional(v.string()),
      branch: v.optional(v.string()),
      filesChanged: v.optional(v.array(v.string())),
      // Deploy events
      deploymentUrl: v.optional(v.string()),
      deploymentStatus: v.optional(v.string()),
      // Error events
      errorMessage: v.optional(v.string()),
      // Generic
      source: v.optional(v.string()), // "linear_sync", "webhook", "manual"
    })),

    // TIMESTAMPS
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_agent", ["agentId", "timestamp"])
    .index("by_category", ["category", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_linearId", ["linearIdentifier", "timestamp"]),

  // Notification system
  notifications: defineTable({
    to: v.id("agents"),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("review_request")
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    relatedTask: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    createdAt: v.number(),
  })
    .index("by_recipient", ["to"])
    .index("by_read_status", ["to", "read"]),

  // Documentation
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    author: v.id("agents"),
    project: v.string(),
    updatedAt: v.number(),
  })
    .index("by_project", ["project"])
    .index("by_author", ["author"]),

  // Health monitoring
  heartbeats: defineTable({
    agent: v.id("agents"),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_agent", ["agent"])
    .index("by_timestamp", ["timestamp"]),

  // Settings
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Webhook events from GitHub/Vercel (AGT-128: Max Visibility Pipeline)
  webhookEvents: defineTable({
    source: v.union(v.literal("github"), v.literal("vercel")),
    eventType: v.string(), // "push", "deployment.ready", "deployment.error", etc.
    payload: v.string(), // JSON stringified
    linearTicketId: v.optional(v.string()), // matched AGT-XX
    commentPosted: v.boolean(), // did we post to Linear?
    createdAt: v.number(),
  })
    .index("by_source", ["source"])
    .index("by_created_at", ["createdAt"]),

  // Agent Skills (AGT-129: Skill System per ADR-005)
  // Tracks agent capabilities, autonomy level, and skill progression
  agentSkills: defineTable({
    agentId: v.id("agents"),
    // Autonomy level (1=Intern, 2=Specialist, 3=Lead)
    autonomyLevel: v.union(v.literal(1), v.literal(2), v.literal(3)),
    // Skills with proficiency (0-100)
    skills: v.array(v.object({
      name: v.string(),           // e.g., "typescript", "react", "convex", "linear-api"
      proficiency: v.number(),    // 0-100
      verified: v.boolean(),      // Human-verified skill
      lastUsed: v.optional(v.number()), // Timestamp
    })),
    // Territory (file patterns this agent can edit)
    territory: v.array(v.string()), // e.g., ["convex/", "scripts/", "lib/evox/"]
    // Permissions
    permissions: v.object({
      canPush: v.boolean(),           // Git push (usually requires approval)
      canMerge: v.boolean(),          // Merge PRs
      canDeploy: v.boolean(),         // Deploy to production
      canEditSchema: v.boolean(),     // Database schema changes
      canApproveOthers: v.boolean(),  // Approve other agents' PRs
    }),
    // Stats
    tasksCompleted: v.number(),
    tasksWithBugs: v.number(),       // For trust calculation
    avgTaskDuration: v.optional(v.number()), // Minutes
    lastPromotedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_autonomy_level", ["autonomyLevel"]),

  // Agent persistent memory (ADR-002: Hierarchical Memory Architecture)
  // AGT-107: SOUL.md per agent, AGT-109: WORKING.md per agent, AGT-110: Daily notes
  agentMemory: defineTable({
    agentId: v.id("agents"),
    type: v.union(
      v.literal("soul"),    // SOUL.md - identity, role, expertise (rarely updated)
      v.literal("working"), // WORKING.md - current context (updated every session)
      v.literal("daily")    // Daily notes - standup summaries (rotates daily)
    ),
    content: v.string(),
    date: v.optional(v.string()), // For daily notes: YYYY-MM-DD
    createdAt: v.number(),
    updatedAt: v.number(),
    version: v.number(), // Optimistic concurrency
  })
    .index("by_agent_type", ["agentId", "type"])
    .index("by_agent_date", ["agentId", "date"])
    .index("by_type", ["type"]),
});
