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
    currentTask: v.optional(v.id("tasks")),
    avatar: v.string(),
    lastSeen: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_name", ["name"]),

  // Task management
  tasks: defineTable({
    projectId: v.id("projects"),
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
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"])
    .index("by_assignee", ["assignee"])
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
});
