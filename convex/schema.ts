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
    about: v.optional(v.string()), // Short 1-line description (fallback if soul is empty)
    lastSeen: v.number(),
    lastHeartbeat: v.optional(v.number()), // AGT-119: Last heartbeat timestamp
    linearUserId: v.optional(v.string()), // Linear user ID for API attribution
    metadata: v.optional(v.object({
      preferredModel: v.optional(v.union(v.literal("claude"), v.literal("codex"))),
    })),
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
    completedAt: v.optional(v.number()), // When task was marked done
    // Linear integration fields
    linearId: v.optional(v.string()),
    linearIdentifier: v.optional(v.string()), // e.g., "AGT-72"
    linearUrl: v.optional(v.string()),
    // AGT-134: attribution for Standup (Son→max, Sam→sam, Leo→leo); group by agentName not assignee
    agentName: v.optional(v.string()),
    // AGT-209: Approval Workflow
    requiresApproval: v.optional(v.boolean()),
    approvalStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    // AGT-210: Self-Healing Retry
    retryCount: v.optional(v.number()),
    lastError: v.optional(v.string()),
    escalatedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_agentName", ["agentName"])
    .index("by_priority", ["priority"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_linearId", ["linearId"])
    .index("by_linearIdentifier", ["linearIdentifier"]),

  // Communication - Channel messages
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

  // AGT-112: Task Comments (comment threads on tasks)
  taskComments: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.id("agents"),
    content: v.string(), // Markdown supported
    attachments: v.optional(v.array(v.id("documents"))),
    // @mentions parsed from content
    mentions: v.optional(v.array(v.id("agents"))),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_agent", ["fromAgentId", "createdAt"]),

  // AGT-174: Unified Communication System
  // Single table for all agent messaging: comments, DMs, dispatches, system messages
  // Replaces separate taskComments and agentMessages tables
  unifiedMessages: defineTable({
    fromAgent: v.string(),                    // "sam", "leo", "max", "son"
    toAgent: v.optional(v.string()),          // DM target, undefined = task comment/broadcast
    taskId: v.optional(v.id("tasks")),        // Task reference for comments
    linearIdentifier: v.optional(v.string()), // "AGT-112" for display
    content: v.string(),                      // Markdown, supports @mentions
    type: v.union(
      v.literal("comment"),                   // Comment on task
      v.literal("dm"),                        // Direct message
      v.literal("dispatch"),                  // Max dispatching task to agent
      v.literal("system")                     // System notification
    ),
    mentions: v.optional(v.array(v.string())), // ["leo", "son"] parsed from @Leo @Son
    priority: v.optional(v.union(
      v.literal("normal"),
      v.literal("urgent")
    )),
    read: v.optional(v.boolean()),            // For DMs/mentions tracking
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_from_agent", ["fromAgent", "createdAt"])
    .index("by_to_agent", ["toAgent", "createdAt"])
    .index("by_to_agent_unread", ["toAgent", "read"])
    .index("by_type", ["type", "createdAt"])
    .index("by_linearId", ["linearIdentifier", "createdAt"]),

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
      assignedTo: v.optional(v.string()), // AGT-182: Track who was assigned
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

  // AGT-115: Notification system (enhanced for @mentions)
  notifications: defineTable({
    to: v.id("agents"),
    from: v.optional(v.id("agents")), // AGT-115: Who triggered the notification
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("review_request"),
      v.literal("comment"),  // AGT-112: New comment on a task
      v.literal("dm")        // AGT-118: Direct message
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    relatedTask: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    commentId: v.optional(v.id("taskComments")), // AGT-112
    createdAt: v.number(),
  })
    .index("by_recipient", ["to"])
    .index("by_read_status", ["to", "read"])
    .index("by_agent_time", ["to", "createdAt"]),

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
  // AGT-194: heartbeat_protocol - system-wide protocol (stored under MAX)
  agentMemory: defineTable({
    agentId: v.id("agents"),
    type: v.union(
      v.literal("soul"),              // SOUL.md - identity, role, expertise (rarely updated)
      v.literal("working"),           // WORKING.md - current context (updated every session)
      v.literal("daily"),             // Daily notes - standup summaries (rotates daily)
      v.literal("heartbeat_protocol") // AGT-194: Heartbeat protocol documentation
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

  // Scratch pad for quick notes
  scratchNotes: defineTable({
    content: v.string(),
    createdBy: v.optional(v.id("agents")),
    updatedAt: v.number(),
  }),

  // Phase 5: Execution Engine dispatches
  dispatches: defineTable({
    agentId: v.id("agents"),
    command: v.string(),
    payload: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("completed"), v.literal("failed")),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_agent", ["agentId", "status"])
    .index("by_created", ["createdAt"]),

  // Activity logs (Linear-style events)
  activityLogs: defineTable({
    agentId: v.id("agents"),
    agentName: v.string(),
    eventType: v.union(
      v.literal("created"),
      v.literal("assigned"),
      v.literal("moved"),
      v.literal("completed"),
      v.literal("commented")
    ),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    assignedTo: v.optional(v.id("agents")),
    comment: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_agent", ["agentId", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_type", ["eventType", "timestamp"]),

  // AGT-197: Execution Visibility - File Activity Tracking
  // Tracks file reads/writes during agent execution for transparency
  fileActivity: defineTable({
    agentName: v.string(),                    // "sam", "leo", "max"
    filePath: v.string(),                     // Relative path: "convex/schema.ts"
    action: v.union(
      v.literal("read"),
      v.literal("write"),
      v.literal("create"),
      v.literal("delete")
    ),
    taskId: v.optional(v.id("tasks")),        // Related task if any
    linearIdentifier: v.optional(v.string()), // "AGT-197" for display
    linesChanged: v.optional(v.number()),     // For write actions
    timestamp: v.number(),
  })
    .index("by_agent", ["agentName", "timestamp"])
    .index("by_file", ["filePath", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // AGT-212: Kill Switch / System State
  systemState: defineTable({
    key: v.string(),                      // "global" for main switch
    paused: v.boolean(),
    pausedAt: v.optional(v.number()),
    pauseReason: v.optional(v.string()),
    pausedBy: v.optional(v.string()),     // Who triggered the pause
    resumedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  // AGT-211: Rate Limiting
  rateLimits: defineTable({
    agentName: v.string(),
    hourlyTaskLimit: v.number(),          // Max tasks per hour
    dailyTaskLimit: v.optional(v.number()), // Max tasks per day
    maxTokensPerTask: v.number(),         // Max tokens per single task
    maxCostPerDay: v.optional(v.number()), // Max USD cost per day
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentName"]),

  // AGT-193: Cost Tracking — API token usage per agent per task
  costLogs: defineTable({
    agentName: v.string(),                    // "sam", "leo", "max"
    taskId: v.optional(v.id("tasks")),        // Related task if any
    linearIdentifier: v.optional(v.string()), // "AGT-193" for display
    sessionId: v.optional(v.string()),        // Group costs by session
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),                         // USD cost
    model: v.optional(v.string()),            // "claude-3-opus", "claude-3-sonnet", etc.
    timestamp: v.number(),
  })
    .index("by_agent", ["agentName", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // AGT-215: Alert System — Push Notifications for Agent Events
  alerts: defineTable({
    // Alert type: what triggered this alert
    type: v.union(
      v.literal("agent_failed"),      // Agent execution failed
      v.literal("agent_stuck"),       // Agent stuck >30 min on task
      v.literal("needs_approval"),    // Task requires human approval
      v.literal("task_blocked"),      // Task blocked by dependency
      v.literal("rate_limit_hit"),    // Agent hit rate limit
      v.literal("kill_switch")        // System paused via kill switch
    ),
    // Severity level
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    // Delivery channel
    channel: v.union(
      v.literal("telegram"),
      v.literal("email"),
      v.literal("browser"),
      v.literal("slack")
    ),
    // Alert content
    title: v.string(),
    message: v.string(),
    // Context
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    // Delivery status
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("snoozed")
    ),
    sentAt: v.optional(v.number()),
    deliveryError: v.optional(v.string()),
    // Acknowledgment
    acknowledged: v.optional(v.boolean()),
    acknowledgedBy: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_type", ["type", "createdAt"])
    .index("by_severity", ["severity", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_agent", ["agentName", "createdAt"])
    .index("by_task", ["taskId", "createdAt"])
    .index("by_created", ["createdAt"]),

  // AGT-215: Alert Preferences — Configurable alert rules per user/agent
  alertPreferences: defineTable({
    // Who this preference is for (agent name or "global")
    target: v.string(),
    // Which alert types to receive
    enabledTypes: v.array(v.union(
      v.literal("agent_failed"),
      v.literal("agent_stuck"),
      v.literal("needs_approval"),
      v.literal("task_blocked"),
      v.literal("rate_limit_hit"),
      v.literal("kill_switch")
    )),
    // Preferred channels (in priority order)
    channels: v.array(v.union(
      v.literal("telegram"),
      v.literal("email"),
      v.literal("browser"),
      v.literal("slack")
    )),
    // Telegram config (if enabled)
    telegramChatId: v.optional(v.string()),
    telegramBotToken: v.optional(v.string()), // Stored securely, used for custom bots
    // Email config (if enabled)
    email: v.optional(v.string()),
    // Thresholds
    stuckThresholdMinutes: v.optional(v.number()), // Default 30
    // Snooze/quiet hours
    snoozedUntil: v.optional(v.number()),
    quietHoursStart: v.optional(v.number()), // 0-23
    quietHoursEnd: v.optional(v.number()),   // 0-23
    // Active status
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_target", ["target"]),

  // AGT-197: Execution Visibility - Execution Logs
  // Detailed logs from agent execution for debugging and audit
  executionLogs: defineTable({
    agentName: v.string(),                    // "sam", "leo", "max"
    sessionId: v.optional(v.string()),        // Group logs by session
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error")
    ),
    message: v.string(),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    metadata: v.optional(v.object({
      command: v.optional(v.string()),        // CLI command executed
      exitCode: v.optional(v.number()),       // Command exit code
      duration: v.optional(v.number()),       // Execution time in ms
      filesAffected: v.optional(v.array(v.string())),
      error: v.optional(v.string()),          // Error details
    })),
    timestamp: v.number(),
  })
    .index("by_agent", ["agentName", "timestamp"])
    .index("by_session", ["sessionId", "timestamp"])
    .index("by_level", ["level", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
});
