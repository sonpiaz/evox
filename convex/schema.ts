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
    agentId: v.optional(v.string()), // AGT-332: Stable agent ID (e.g., "agt_max_001")
    role: v.union(
      v.literal("pm"),
      v.literal("backend"),
      v.literal("frontend"),
      v.literal("qa"),
      v.literal("devops"),
      v.literal("content"),
      v.literal("security"),
      v.literal("data"),
      v.literal("research"),
      v.literal("design")
    ),
    status: v.union(
      v.literal("online"),
      v.literal("idle"),
      v.literal("offline"),
      v.literal("busy")
    ),
    statusReason: v.optional(v.string()), // Why agent is in this status (e.g., "Working on AGT-150")
    statusSince: v.optional(v.number()),  // Timestamp when status last changed
    currentTask: v.optional(v.id("tasks")),
    avatar: v.optional(v.string()),
    soul: v.optional(v.string()), // Agent identity/personality summary (from SOUL.md)
    about: v.optional(v.string()), // Short 1-line description (fallback if soul is empty)
    lastSeen: v.number(),
    lastHeartbeat: v.optional(v.number()), // AGT-119: Last heartbeat timestamp
    linearUserId: v.optional(v.string()), // Linear user ID for API attribution
    metadata: v.optional(v.object({
      preferredModel: v.optional(v.union(v.literal("claude"), v.literal("codex"))),
    })),
    // AGT-216: Auto-Recovery fields
    circuitBreakerTripped: v.optional(v.boolean()),   // True = agent stopped after too many failures
    restartCount: v.optional(v.number()),             // Total restarts in recovery window
    consecutiveFailures: v.optional(v.number()),      // Failures since last success (for circuit breaker)
    recoveryBackoffLevel: v.optional(v.number()),     // 0=1min, 1=5min, 2=15min backoff
    lastRestartAt: v.optional(v.number()),            // Timestamp of last auto-restart
    // AGT-252: Auto-Spawn Agent fields
    skills: v.optional(v.array(v.string())),          // Agent skills (e.g., ["convex", "typescript"])
    territory: v.optional(v.array(v.string())),       // File patterns (e.g., ["convex/", "scripts/"])
    geniusDNA: v.optional(v.array(v.string())),       // Genius DNA markers (e.g., ["von_neumann", "feynman"])
    basePrompt: v.optional(v.string()),               // Base system prompt for agent
    spawnedAt: v.optional(v.number()),                // When agent was auto-spawned
    spawnReason: v.optional(v.string()),              // Why agent was spawned
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"])
    .index("by_agentId", ["agentId"]),

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
    // AGT-316: Blocker Detection
    blockedBy: v.optional(v.array(v.string())),  // Task IDs or Linear identifiers blocking this task
    blockedSince: v.optional(v.number()),         // Timestamp when task became blocked
    // AGT-318: Escalation Tiers
    escalationTier: v.optional(v.number()),       // 0=none, 1=T1, 2=T2, 3=T3, 4=T4
    // AGT-335: Loop P2 — Task-Message Linkage
    linkedMessageId: v.optional(v.id("agentMessages")),  // Message that spawned this task
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
    .index("by_agentName", ["agentName"])
    .index("by_priority", ["priority"])
    .index("by_project_status", ["projectId", "status"])
    .index("by_linearId", ["linearId"])
    .index("by_linearIdentifier", ["linearIdentifier"])
    .index("by_completedAt", ["completedAt"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_linkedMessage", ["linkedMessageId"]),

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
    // Reply threading: parentId references another comment
    parentId: v.optional(v.id("taskComments")),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_agent", ["fromAgentId", "createdAt"])
    .index("by_parent", ["parentId", "createdAt"]),

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
    // Legacy: kept for backward compatibility
    status: v.optional(v.union(v.literal("unread"), v.literal("read"))),
    // Message status system: 0=pending, 1=delivered, 2=seen, 3=replied, 4=acted, 5=reported
    statusCode: v.optional(v.number()),
    seenAt: v.optional(v.number()),
    repliedAt: v.optional(v.number()),
    // CORE-209: The Loop — extended status tracking
    actedAt: v.optional(v.number()),       // When recipient started acting on message
    reportedAt: v.optional(v.number()),    // When recipient reported completion
    // SLA tracking
    expectedReplyBy: v.optional(v.number()),   // seenAt + 15 min
    expectedActionBy: v.optional(v.number()),  // repliedAt + 2 hours
    expectedReportBy: v.optional(v.number()),  // actedAt + 24 hours
    // Loop metadata
    loopBroken: v.optional(v.boolean()),
    loopBrokenReason: v.optional(v.string()),
    // Work linkage
    linkedTaskId: v.optional(v.id("tasks")),
    finalReport: v.optional(v.string()),
    timestamp: v.number(),
    sentAt: v.optional(v.number()), // Alias for timestamp
    priority: v.optional(v.union(
      v.literal("normal"),
      v.literal("urgent")
    )),
  })
    .index("by_to_status", ["to", "status"])
    .index("by_from_to", ["from", "to"])
    .index("by_timestamp", ["timestamp"])
    .index("by_statusCode", ["statusCode"])
    .index("by_to_statusCode", ["to", "statusCode"]),

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

  activityEvents: defineTable({
    agentId: v.id("agents"),
    agentName: v.string(),
    category: v.union(
      v.literal("task"),
      v.literal("git"),
      v.literal("deploy"),
      v.literal("system"),
      v.literal("message")
    ),
    eventType: v.string(),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.object({
      fromStatus: v.optional(v.string()),
      toStatus: v.optional(v.string()),
      assignedTo: v.optional(v.string()),
      subtaskCount: v.optional(v.number()),
      subtasks: v.optional(v.array(v.string())),
      commitHash: v.optional(v.string()),
      branch: v.optional(v.string()),
      filesChanged: v.optional(v.array(v.string())),
      deploymentUrl: v.optional(v.string()),
      deploymentStatus: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      source: v.optional(v.string()),
    })),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_agent", ["agentId", "timestamp"])
    .index("by_category", ["category", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_linearId", ["linearIdentifier", "timestamp"]),

  notifications: defineTable({
    to: v.id("agents"),
    from: v.optional(v.id("agents")),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("review_request"),
      v.literal("comment"),
      v.literal("dm")
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    relatedTask: v.optional(v.id("tasks")),
    messageId: v.optional(v.id("messages")),
    commentId: v.optional(v.id("taskComments")),
    createdAt: v.number(),
  })
    .index("by_recipient", ["to"])
    .index("by_read_status", ["to", "read"])
    .index("by_agent_time", ["to", "createdAt"]),

  documents: defineTable({
    title: v.string(),
    content: v.string(),
    author: v.id("agents"),
    project: v.string(),
    updatedAt: v.number(),
  })
    .index("by_project", ["project"])
    .index("by_author", ["author"]),

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
  // AGT-241: geniusDNA - Genius thinking framework per agent
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
    geniusDNA: v.optional(v.string()), // AGT-241: Genius DNA (von Neumann, Feynman, etc.)
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
    // AGT-229: Priority Override
    // 0=URGENT (boss override), 1=HIGH, 2=NORMAL, 3=LOW
    priority: v.optional(v.number()),
    isUrgent: v.optional(v.boolean()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    // AGT-308: Auto-Retry with Exponential Backoff
    retryCount: v.optional(v.number()),          // Number of retries attempted
    maxRetries: v.optional(v.number()),           // Max retries (default 3)
    nextRetryAt: v.optional(v.number()),          // Scheduled retry timestamp
    originalDispatchId: v.optional(v.id("dispatches")), // Link to original if this is a retry
  })
    .index("by_status", ["status"])
    .index("by_agent", ["agentId", "status"])
    .index("by_created", ["createdAt"])
    .index("by_priority", ["status", "priority", "createdAt"]),

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

  fileActivity: defineTable({
    agentName: v.string(),
    filePath: v.string(),
    action: v.union(
      v.literal("read"),
      v.literal("write"),
      v.literal("create"),
      v.literal("delete")
    ),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    linesChanged: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_agent", ["agentName", "timestamp"])
    .index("by_file", ["filePath", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  systemState: defineTable({
    key: v.string(),
    paused: v.boolean(),
    pausedAt: v.optional(v.number()),
    pauseReason: v.optional(v.string()),
    pausedBy: v.optional(v.string()),
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

  // AGT-80: Git Activity Tracking — Commits per agent
  gitActivity: defineTable({
    // Commit info
    commitHash: v.string(),               // Full SHA
    shortHash: v.string(),                // 7-char short SHA
    message: v.string(),                  // Commit message
    timestamp: v.number(),                // Commit timestamp

    // Author info (from GitHub)
    authorName: v.string(),               // Git author name
    authorUsername: v.optional(v.string()), // GitHub username if available
    authorEmail: v.optional(v.string()),  // Git author email

    // Agent attribution (mapped from author)
    agentName: v.optional(v.string()),    // "sam", "leo", "max" if matched

    // Task linkage
    linkedTaskId: v.optional(v.id("tasks")),
    linkedTicketId: v.optional(v.string()), // "AGT-XXX" from commit message

    // GitHub context
    repo: v.string(),                     // "owner/repo"
    branch: v.string(),                   // Branch name
    url: v.optional(v.string()),          // Commit URL

    // Push info
    pushedAt: v.number(),                 // When webhook received
    pushedBy: v.optional(v.string()),     // Pusher username
  })
    .index("by_agent", ["agentName", "pushedAt"])
    .index("by_timestamp", ["pushedAt"])
    .index("by_task", ["linkedTaskId"])
    .index("by_commit", ["commitHash"]),

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
    metadata: v.optional(v.any()),            // Flexible metadata for various log types
    timestamp: v.number(),
  })
    .index("by_agent", ["agentName", "timestamp"])
    .index("by_session", ["sessionId", "timestamp"])
    .index("by_level", ["level", "timestamp"])
    .index("by_task", ["taskId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // AGT-214: Cron Scheduler — Dynamic scheduled tasks
  // Allows scheduling recurring agent tasks (standup, reports, grooming)
  schedules: defineTable({
    // Schedule identity
    name: v.string(),                           // "daily-standup", "weekly-report"
    description: v.optional(v.string()),        // Human-readable description

    // Task template to execute
    taskTemplate: v.union(
      v.literal("daily_standup"),               // Generate daily standup summary
      v.literal("weekly_report"),               // Generate weekly progress report
      v.literal("backlog_grooming"),            // Prioritize and clean backlog
      v.literal("health_check"),                // Check agent health and uptime
      v.literal("custom")                       // Custom task (uses customConfig)
    ),

    // Scheduling configuration
    cronExpression: v.string(),                 // Cron format: "0 18 * * *" (6 PM daily)
    timezone: v.optional(v.string()),           // IANA timezone: "America/Los_Angeles"

    // Execution configuration
    targetAgent: v.optional(v.string()),        // Which agent runs this: "max", "sam", "leo", or undefined = system
    customConfig: v.optional(v.object({         // For custom templates
      action: v.optional(v.string()),
      payload: v.optional(v.string()),
    })),

    // State
    enabled: v.boolean(),
    lastRun: v.optional(v.number()),            // Timestamp of last execution
    lastRunStatus: v.optional(v.union(
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped")
    )),
    lastRunError: v.optional(v.string()),
    nextRun: v.optional(v.number()),            // Scheduled next run timestamp
    scheduledJobId: v.optional(v.string()),     // Convex scheduler job ID

    // Metadata
    createdBy: v.optional(v.string()),          // "son", "max", etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_enabled", ["enabled"])
    .index("by_template", ["taskTemplate"])
    .index("by_next_run", ["nextRun"]),

  // AGT-222: Session Learning System — Auto-report, Feedback Loop, Team Sync
  // Stores learnings from each agent session for team knowledge sharing
  learnings: defineTable({
    // Who learned this
    agentName: v.string(),

    // Task context
    taskId: v.optional(v.string()),           // Linear identifier like "AGT-222"
    taskTitle: v.string(),

    // What was learned
    summary: v.string(),                       // Brief summary of the work
    filesChanged: v.array(v.string()),         // List of files modified
    challenges: v.optional(v.string()),        // What was difficult
    patterns: v.optional(v.string()),          // Patterns/best practices discovered

    // Code snippets worth remembering
    codeSnippets: v.optional(v.array(v.object({
      file: v.string(),
      code: v.string(),
      explanation: v.string(),
    }))),

    // Feedback loop
    feedbackGood: v.optional(v.string()),      // What went well
    feedbackImprove: v.optional(v.string()),   // What could be improved

    // Categorization
    tags: v.array(v.string()),                 // e.g., ["convex", "schema", "api"]

    // Metrics
    timeSpentMinutes: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_agent", ["agentName", "createdAt"])
    .index("by_task", ["taskId"])
    .index("by_timestamp", ["createdAt"]),

  // AGT-242: Agent Performance Tracking — Velocity + Cost
  // Hourly aggregated metrics per agent for Elon Dashboard
  performanceMetrics: defineTable({
    // Agent identity
    agentName: v.string(),                      // "sam", "leo", "max", "quinn"

    // Time bucket
    hourBucket: v.string(),                     // "2026-02-04T06" (ISO hour bucket)
    date: v.string(),                           // "2026-02-04" for daily queries

    // Velocity metrics
    tasksCompleted: v.number(),                 // Tasks completed this hour
    tasksStarted: v.number(),                   // Tasks started this hour
    tasksFailed: v.number(),                    // Tasks failed this hour

    // Cost metrics (aggregated from costLogs)
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalCost: v.number(),                      // USD

    // Duration metrics (minutes)
    totalDurationMinutes: v.number(),           // Sum of task durations
    avgDurationMinutes: v.optional(v.number()), // Average duration this hour

    // Utilization (from heartbeats)
    activeMinutes: v.number(),                  // Minutes in "busy" or "online" status
    idleMinutes: v.number(),                    // Minutes in "idle" status
    offlineMinutes: v.number(),                 // Minutes in "offline" status
    utilizationPercent: v.optional(v.number()), // activeMinutes / (active + idle) * 100

    // Error tracking
    errorCount: v.number(),                     // Errors logged this hour

    // Computed metrics (for quick dashboard access)
    velocityPerHour: v.optional(v.number()),    // Tasks per hour (rolling)
    avgCostPerTask: v.optional(v.number()),     // Average cost per task
    errorRate: v.optional(v.number()),          // Errors / total tasks

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent_hour", ["agentName", "hourBucket"])
    .index("by_agent_date", ["agentName", "date"])
    .index("by_hour", ["hourBucket"])
    .index("by_date", ["date"]),

  // AGT-225: QA Agent Integration — Automated Test Gate
  // Stores QA run results for CI/CD quality gates
  qaRuns: defineTable({
    // Run identity
    runId: v.string(),                        // Unique run ID (e.g., "qa-1707012345")
    triggeredBy: v.string(),                  // "github", "vercel", "manual", "agent"
    commitHash: v.optional(v.string()),       // Git commit that triggered this
    prNumber: v.optional(v.number()),         // PR number if applicable

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),

    // Test results
    tests: v.array(v.object({
      name: v.string(),                       // "next-build", "tsc", "eslint", "e2e"
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed"),
        v.literal("skipped")
      ),
      duration: v.optional(v.number()),       // Duration in ms
      output: v.optional(v.string()),         // Truncated output/error
      startedAt: v.optional(v.number()),
      finishedAt: v.optional(v.number()),
    })),

    // Summary
    totalTests: v.number(),
    passedTests: v.number(),
    failedTests: v.number(),
    duration: v.optional(v.number()),         // Total duration in ms

    // Actions taken
    deployBlocked: v.optional(v.boolean()),   // Was deploy blocked?
    alertSent: v.optional(v.boolean()),       // Was alert sent?
    bugTicketCreated: v.optional(v.string()), // Linear ticket ID if created

    // Timestamps
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "startedAt"])
    .index("by_runId", ["runId"])
    .index("by_commit", ["commitHash"]),

  // AGT-247: Event Bus — Real-time Agent Notifications
  // Replaces 60s polling with instant push notifications
  agentEvents: defineTable({
    // Event type
    type: v.union(
      v.literal("task_assigned"),      // New task assigned to agent
      v.literal("task_completed"),     // Task completed by agent
      v.literal("handoff"),            // Task handed off to another agent
      v.literal("mention"),            // Agent mentioned in message/comment
      v.literal("approval_needed"),    // Task requires approval
      v.literal("system_alert"),       // System-wide alert
      v.literal("dispatch")            // New dispatch available
    ),

    // Target agent (who should receive this notification)
    targetAgent: v.string(),           // "sam", "leo", "max", "quinn"

    // Event payload
    payload: v.object({
      taskId: v.optional(v.string()),           // Linear identifier like "AGT-247"
      dispatchId: v.optional(v.string()),       // Convex dispatch ID
      fromAgent: v.optional(v.string()),        // Who triggered this event
      message: v.optional(v.string()),          // Human-readable message
      priority: v.optional(v.union(             // Event priority
        v.literal("low"),
        v.literal("normal"),
        v.literal("high"),
        v.literal("urgent")
      )),
      metadata: v.optional(v.any()),            // Additional event data
    }),

    // Status
    status: v.union(
      v.literal("pending"),            // Not yet delivered
      v.literal("delivered"),          // Agent acknowledged receipt
      v.literal("expired")             // Event too old, discarded
    ),

    // Timestamps
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
    expiresAt: v.number(),             // Auto-expire after 5 minutes
  })
    .index("by_target_status", ["targetAgent", "status", "createdAt"])
    .index("by_target_created", ["targetAgent", "createdAt"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),

  // AGT-248: Agent Mesh — P2P Communication without coordinator
  // Direct peer-to-peer messaging with broadcast support
  meshMessages: defineTable({
    // Message type
    type: v.union(
      v.literal("direct"),             // 1:1 message
      v.literal("broadcast"),          // 1:many message
      v.literal("ping"),               // Heartbeat check
      v.literal("ack")                 // Acknowledgment/reply
    ),

    // Participants
    fromAgent: v.string(),             // Sender: "sam", "leo", "max", "quinn"
    toAgents: v.array(v.string()),     // Recipients (array for broadcast support)

    // Content
    content: v.string(),               // Message payload
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("normal"),
      v.literal("high"),
      v.literal("urgent")
    )),
    taskRef: v.optional(v.string()),   // Optional task reference (AGT-XXX)
    replyTo: v.optional(v.id("meshMessages")), // For threaded conversations

    // Delivery tracking
    status: v.union(
      v.literal("pending"),            // Sent but not delivered
      v.literal("delivered"),          // All recipients received
      v.literal("completed")           // All recipients acknowledged
    ),
    deliveredTo: v.optional(v.array(v.string())),  // Which agents have received
    acknowledgedBy: v.optional(v.array(v.string())), // Which agents have acked

    // Timestamps
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),  // When last recipient received
    completedAt: v.optional(v.number()),  // When all recipients acked
    expiresAt: v.number(),               // Auto-cleanup TTL
  })
    .index("by_from", ["fromAgent", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),

  // AGT-249: Self-Spawning Agents — Worker Pools
  // Parent agents spawn sub-agents (workers) for parallel task execution

  debates: defineTable({
    topic: v.string(),
    context: v.optional(v.string()),
    initiatedBy: v.string(),
    positions: v.array(v.object({
      agent: v.string(),
      stance: v.string(),
      arguments: v.array(v.string()),
      evidence: v.optional(v.array(v.string())),
      submittedAt: v.number(),
    })),
    status: v.union(
      v.literal("open"),
      v.literal("resolved"),
      v.literal("escalated"),
      v.literal("closed")
    ),
    resolution: v.optional(v.string()),
    resolvedBy: v.optional(v.string()),
    votes: v.optional(v.array(v.object({
      agent: v.string(),
      position: v.number(),
      votedAt: v.number(),
    }))),
    taskRef: v.optional(v.string()),
    outcomeApplied: v.boolean(),
    impactMeasured: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_initiator", ["initiatedBy", "createdAt"])
    .index("by_task", ["taskRef"]),

  visionProgress: defineTable({
    metric: v.string(),
    description: v.string(),
    unit: v.string(),
    target: v.number(),
    current: v.number(),
    trend: v.union(
      v.literal("up"),
      v.literal("down"),
      v.literal("stable")
    ),
    progressPercent: v.number(),
    history: v.array(v.object({
      value: v.number(),
      timestamp: v.number(),
    })),
    contributions: v.optional(v.array(v.object({
      agent: v.string(),
      task: v.string(),
      impact: v.number(),
      timestamp: v.number(),
    }))),
    onTrack: v.boolean(),
    risk: v.optional(v.string()),
    createdAt: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_metric", ["metric"])
    .index("by_onTrack", ["onTrack"]),

  automationMetrics: defineTable({
    key: v.string(),
    progressPercent: v.number(),
    milestones: v.array(v.object({
      percent: v.number(),
      label: v.string(),
      achieved: v.boolean(),
      achievedAt: v.optional(v.number()),
      achievedBy: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // AGT-92: Execution Engine Core — Track execution runs
  executions: defineTable({
    taskId: v.string(), // Linear issue ID e.g. "AGT-89"
    agentId: v.id("agents"), // Reference to agents table
    agentName: v.string(), // "Sam", "Leo" for display
    status: v.union(
      v.literal("running"),
      v.literal("paused"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("stopped")
    ),
    // Execution state for step-based resumption
    messages: v.optional(v.string()), // JSON stringified message history
    stagedChanges: v.optional(v.string()), // JSON stringified Map<path, content>
    currentStep: v.number(), // Current tool loop iteration
    maxSteps: v.number(), // Safety limit (default 50)
    // Metadata
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    tokensUsed: v.number(),
    filesChanged: v.array(v.string()),
    commitSha: v.optional(v.string()),
    error: v.optional(v.string()),
    // Config
    model: v.string(), // "claude-sonnet-4-5-20250929"
    repo: v.string(), // "owner/repo"
    branch: v.string(), // "main"
  })
    .index("by_status", ["status"])
    .index("by_taskId", ["taskId"])
    .index("by_agentId", ["agentId"]),

  // AGT-92: Execution Engine Core — Real-time execution step logs
  engineLogs: defineTable({
    executionId: v.id("executions"),
    timestamp: v.number(),
    step: v.number(),
    type: v.union(
      v.literal("system"),
      v.literal("thinking"),
      v.literal("tool_call"),
      v.literal("tool_result"),
      v.literal("message"),
      v.literal("error"),
      v.literal("commit")
    ),
    content: v.string(),
    metadata: v.optional(v.string()),
  })
    .index("by_execution", ["executionId", "timestamp"])
    .index("by_execution_step", ["executionId", "step"]),

  // Device Sync - Cross-device session state
  sessionStates: defineTable({
    device: v.string(), // "mac-mini" | "macbook" | other device identifier
    agent: v.string(), // Agent name (evox, sam, leo, max, etc.)
    status: v.union(
      v.literal("active"),
      v.literal("idle"),
      v.literal("offline")
    ),
    currentTask: v.optional(v.string()), // Current task ID or description
    currentFile: v.optional(v.string()), // Current file being worked on
    notes: v.optional(v.string()), // Session notes
    metadata: v.optional(v.object({
      hostname: v.optional(v.string()),
      workingDirectory: v.optional(v.string()),
      gitBranch: v.optional(v.string()),
    })),
    lastHeartbeat: v.number(),
    createdAt: v.number(),
  })
    .index("by_agent", ["agent"])
    .index("by_device", ["device"])
    .index("by_device_agent", ["device", "agent"])
    .index("by_lastHeartbeat", ["lastHeartbeat"]),

  // Agent Feedback - Quality ratings and feedback
  agentFeedback: defineTable({
    targetAgent: v.string(), // Agent receiving feedback (e.g., "evox")
    fromAgent: v.optional(v.string()), // Agent giving feedback (e.g., "max")
    fromUser: v.optional(v.string()), // User giving feedback (e.g., "ceo")
    taskId: v.optional(v.string()), // Related task/ticket
    rating: v.union(
      v.literal(1), // Poor
      v.literal(2), // Below average
      v.literal(3), // Average
      v.literal(4), // Good
      v.literal(5)  // Excellent
    ),
    category: v.union(
      v.literal("quality"),       // Output quality
      v.literal("speed"),         // Execution speed
      v.literal("communication"), // Communication clarity
      v.literal("coordination"),  // Team coordination
      v.literal("autonomy"),      // Autonomous decision-making
      v.literal("accuracy")       // Task accuracy
    ),
    feedback: v.string(), // Written feedback
    suggestions: v.optional(v.string()), // Improvement suggestions
    createdAt: v.number(),
  })
    .index("by_target", ["targetAgent", "createdAt"])
    .index("by_category", ["targetAgent", "category"])
    .index("by_rating", ["targetAgent", "rating"]),

  // Agent Learnings - Lessons learned and best practices
  agentLearnings: defineTable({
    agent: v.string(), // Agent that learned (e.g., "evox")
    title: v.string(), // Short title
    category: v.union(
      v.literal("mistake"),      // Mistake to avoid
      v.literal("best-practice"), // Best practice discovered
      v.literal("quality-tip"),   // Quality improvement tip
      v.literal("workflow"),      // Workflow improvement
      v.literal("communication"), // Communication lesson
      v.literal("coordination")   // Coordination lesson
    ),
    lesson: v.string(), // The learning content
    context: v.optional(v.string()), // When/where this was learned
    relatedTask: v.optional(v.string()), // Related task/ticket
    importance: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
    verified: v.boolean(), // Has this been verified/validated?
    verifiedBy: v.optional(v.string()), // Who verified (CEO, agent)
    createdAt: v.number(),
    appliedCount: v.optional(v.number()), // How many times applied
  })
    .index("by_agent", ["agent", "createdAt"])
    .index("by_category", ["agent", "category"])
    .index("by_importance", ["agent", "importance"])
    .index("by_verified", ["agent", "verified"]),

  // CORE-209: The Loop — Aggregated metrics per agent per period
  loopMetrics: defineTable({
    agentName: v.string(),
    period: v.string(),              // "hourly" | "daily"
    periodKey: v.string(),           // "2026-02-06T14" or "2026-02-06"
    totalMessages: v.number(),
    loopsClosed: v.number(),         // Reached REPORTED (5)
    loopsBroken: v.number(),
    avgSeenTimeMs: v.optional(v.number()),
    avgReplyTimeMs: v.optional(v.number()),
    avgActionTimeMs: v.optional(v.number()),
    avgReportTimeMs: v.optional(v.number()),
    slaBreaches: v.number(),
    completionRate: v.number(),      // loopsClosed / totalMessages (0-1)
    timestamp: v.number(),
  })
    .index("by_agent_period", ["agentName", "period", "periodKey"])
    .index("by_period", ["period", "periodKey"]),

  // Task Dispatch Tracking — who assigned what to whom
  taskAssignments: defineTable({
    fromAgent: v.string(),                // "EVOX", "MAX", "SAM"
    toAgent: v.string(),                  // "SAM", "LEO", "QUINN"
    task: v.string(),                     // Short description
    ticket: v.optional(v.string()),       // "AGT-336"
    status: v.union(
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    assignedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    result: v.optional(v.string()),
    commitHash: v.optional(v.string()),
  })
    .index("by_from", ["fromAgent", "assignedAt"])
    .index("by_to", ["toAgent", "assignedAt"])
    .index("by_ticket", ["ticket"])
    .index("by_status", ["status", "assignedAt"]),

  // CORE-209: The Loop — SLA breach alerts
  loopAlerts: defineTable({
    messageId: v.id("agentMessages"),
    agentName: v.string(),           // Agent who breached SLA
    alertType: v.union(
      v.literal("reply_overdue"),    // Seen but not replied > 15 min
      v.literal("action_overdue"),   // Replied but not acted > 2 hours
      v.literal("report_overdue"),   // Acted but not reported > 24 hours
      v.literal("loop_broken")       // Explicitly broken
    ),
    severity: v.union(
      v.literal("warning"),
      v.literal("critical")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("resolved"),
      v.literal("escalated")
    ),
    escalatedTo: v.optional(v.string()),  // "max" or "ceo"
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentName", "status"])
    .index("by_status", ["status", "createdAt"])
    .index("by_message", ["messageId"]),

});
