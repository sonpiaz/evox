/**
 * Message Status System — "The Loop"
 *
 * Status flow: sent → delivered → seen → replied → acted → reported
 *
 * Encoded status:
 * 0 = pending (not delivered yet)
 * 1 = delivered (in recipient's inbox)
 * 2 = seen (recipient opened/read)
 * 3 = replied (recipient sent response)
 * 4 = acted (recipient started working on it)  — CORE-209
 * 5 = reported (recipient reported completion)  — CORE-209
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { resolveAgentIdByName, resolveAgentNameById } from "./agentMappings";

// Status enum
export const MessageStatus = {
  PENDING: 0,
  DELIVERED: 1,
  SEEN: 2,
  REPLIED: 3,
  ACTED: 4,
  REPORTED: 5,
} as const;

export const StatusLabels = {
  0: "pending",
  1: "delivered",
  2: "seen",
  3: "replied",
  4: "acted",
  5: "reported",
} as const;

// SLA durations (single source of truth — import, never duplicate)
export const SLA = {
  REPLY: 15 * 60 * 1000,         // 15 minutes
  ACTION: 2 * 60 * 60 * 1000,    // 2 hours
  REPORT: 24 * 60 * 60 * 1000,   // 24 hours
} as const;

// ============================================================
// MARK MESSAGE AS SEEN
// ============================================================

/**
 * Agent marks message as seen/read
 */
export const markAsSeen = mutation({
  args: {
    messageId: v.id("agentMessages"),
    agentName: v.string(), // Who is marking it seen
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Resolve message.to (Convex ID) → agent name for comparison
    const recipientName = await resolveAgentNameById(ctx.db, message.to);

    // Only recipient can mark as seen
    if (recipientName !== args.agentName.toLowerCase()) {
      throw new Error("Only recipient can mark message as seen");
    }

    // Don't downgrade status (e.g., replied → seen)
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    if (currentStatus >= MessageStatus.SEEN) {
      return { success: true, alreadySeen: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      statusCode: MessageStatus.SEEN,
      seenAt: now,
      expectedReplyBy: now + SLA.REPLY, // CORE-209: SLA tracking
    });

    return { success: true, alreadySeen: false };
  },
});

/**
 * Mark multiple messages as seen (bulk)
 */
export const markMultipleAsSeen = mutation({
  args: {
    messageIds: v.array(v.id("agentMessages")),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    let marked = 0;

    for (const messageId of args.messageIds) {
      try {
        const result = await ctx.runMutation(api.messageStatus.markAsSeen, {
          messageId,
          agentName: args.agentName,
        });
        if (!result.alreadySeen) marked++;
      } catch (e) {
        console.error(`Failed to mark ${messageId}:`, e);
      }
    }

    return { success: true, markedCount: marked };
  },
});

/**
 * Auto-mark message as replied when recipient sends back
 */
export const markAsReplied = mutation({
  args: {
    originalMessageId: v.id("agentMessages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.originalMessageId);

    if (!message) {
      throw new Error("Original message not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.originalMessageId, {
      statusCode: MessageStatus.REPLIED,
      repliedAt: now,
      expectedActionBy: now + SLA.ACTION, // CORE-209: SLA tracking
    });

    return { success: true };
  },
});

// ============================================================
// GET MESSAGE STATUS
// ============================================================

/**
 * Get status of a specific message
 */
export const getMessageStatus = query({
  args: {
    messageId: v.id("agentMessages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      return null;
    }

    const status = message.statusCode ?? MessageStatus.DELIVERED;

    return {
      messageId: args.messageId,
      status,
      statusLabel: StatusLabels[status as keyof typeof StatusLabels],
      sentAt: message.sentAt ?? message.timestamp,
      seenAt: message.seenAt,
      repliedAt: message.repliedAt,
      from: message.from,
      to: message.to,
    };
  },
});

/**
 * Get conversation thread with statuses
 */
export const getConversationWithStatus = query({
  args: {
    agent1: v.string(),
    agent2: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get all messages between agent1 and agent2
    const allMessages = await ctx.db
      .query("agentMessages")
      .filter((q) =>
        q.or(
          q.and(q.eq(q.field("from"), args.agent1), q.eq(q.field("to"), args.agent2)),
          q.and(q.eq(q.field("from"), args.agent2), q.eq(q.field("to"), args.agent1))
        )
      )
      .order("desc")
      .take(limit);

    return allMessages.map((msg) => ({
      _id: msg._id,
      from: msg.from,
      to: msg.to,
      content: msg.content,
      priority: msg.priority,
      sentAt: msg.sentAt ?? msg.timestamp,
      status: msg.statusCode ?? MessageStatus.DELIVERED,
      statusLabel: StatusLabels[(msg.statusCode ?? MessageStatus.DELIVERED) as keyof typeof StatusLabels],
      seenAt: msg.seenAt,
      repliedAt: msg.repliedAt,
    }));
  },
});

/**
 * Get all messages sent by CEO/user with status
 */
export const getSentMessagesWithStatus = query({
  args: {
    fromAgent: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const messages = await ctx.db
      .query("agentMessages")
      .filter((q) => q.eq(q.field("from"), args.fromAgent))
      .order("desc")
      .take(limit);

    // Group by recipient
    const byRecipient: Record<string, typeof messages> = {};

    for (const msg of messages) {
      if (!byRecipient[msg.to]) {
        byRecipient[msg.to] = [];
      }
      byRecipient[msg.to].push(msg);
    }

    return {
      messages: messages.map((msg) => ({
        _id: msg._id,
        from: msg.from,
        to: msg.to,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : ""),
        priority: msg.priority,
        sentAt: msg.sentAt ?? msg.timestamp,
        status: msg.statusCode ?? MessageStatus.DELIVERED,
        statusLabel: StatusLabels[(msg.statusCode ?? MessageStatus.DELIVERED) as keyof typeof StatusLabels],
        seenAt: msg.seenAt,
        repliedAt: msg.repliedAt,
      })),
      byRecipient: Object.entries(byRecipient).map(([recipient, msgs]) => ({
        recipient,
        messageCount: msgs.length,
        lastMessage: msgs[0],
        unreadCount: msgs.filter((m) => (m.statusCode ?? 1) < MessageStatus.SEEN).length,
        unrepliedCount: msgs.filter((m) => (m.statusCode ?? 1) < MessageStatus.REPLIED).length,
      })),
    };
  },
});

/**
 * Get inbox overview for agent (with unread/unseen counts)
 */
export const getInboxOverview = query({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all messages TO this agent
    const messages = await ctx.db
      .query("agentMessages")
      .filter((q) => q.eq(q.field("to"), args.agentName))
      .order("desc")
      .take(100);

    const unseenCount = messages.filter((m) => (m.statusCode ?? 1) < MessageStatus.SEEN).length;
    const unrepliedCount = messages.filter((m) => (m.statusCode ?? 1) < MessageStatus.REPLIED).length;

    // Group by sender
    const bySender: Record<string, typeof messages> = {};

    for (const msg of messages) {
      if (!bySender[msg.from]) {
        bySender[msg.from] = [];
      }
      bySender[msg.from].push(msg);
    }

    return {
      agentName: args.agentName,
      totalMessages: messages.length,
      unseenCount,
      unrepliedCount,
      bySender: Object.entries(bySender).map(([sender, msgs]) => ({
        sender,
        messageCount: msgs.length,
        lastMessage: msgs[0],
        unseenCount: msgs.filter((m) => (m.statusCode ?? 1) < MessageStatus.SEEN).length,
      })),
    };
  },
});

// ============================================================
// DASHBOARD QUERIES
// ============================================================

/**
 * Get all conversations for dashboard view
 */
export const getAllConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    const messages = await ctx.db
      .query("agentMessages")
      .order("desc")
      .take(limit);

    // Group into conversations (agent1 <-> agent2)
    const conversations = new Map<string, {
      participants: [string, string];
      messages: typeof messages;
      lastMessage: typeof messages[0];
      totalCount: number;
      unseenCount: number;
    }>();

    for (const msg of messages) {
      // Create conversation key (sorted to avoid duplicates)
      const key = [msg.from, msg.to].sort().join("<->");

      if (!conversations.has(key)) {
        conversations.set(key, {
          participants: [msg.from, msg.to] as [string, string],
          messages: [],
          lastMessage: msg,
          totalCount: 0,
          unseenCount: 0,
        });
      }

      const conv = conversations.get(key)!;
      conv.messages.push(msg);
      conv.totalCount++;

      if ((msg.statusCode ?? 1) < MessageStatus.SEEN) {
        conv.unseenCount++;
      }
    }

    return Array.from(conversations.entries()).map(([key, conv]) => ({
      conversationKey: key,
      participants: conv.participants,
      messageCount: conv.totalCount,
      unseenCount: conv.unseenCount,
      lastMessage: {
        from: conv.lastMessage.from,
        to: conv.lastMessage.to,
        content: conv.lastMessage.content.substring(0, 80) + "...",
        sentAt: conv.lastMessage.sentAt ?? conv.lastMessage.timestamp,
        status: conv.lastMessage.statusCode ?? MessageStatus.DELIVERED,
        statusLabel: StatusLabels[(conv.lastMessage.statusCode ?? MessageStatus.DELIVERED) as keyof typeof StatusLabels],
      },
    })).sort((a, b) => b.lastMessage.sentAt - a.lastMessage.sentAt);
  },
});

// ============================================================
// CORE-209: THE LOOP — Extended Status Mutations
// ============================================================

/**
 * Mark message as ACTED — recipient started working on it.
 * Sets status = 4, links to task, starts report SLA timer.
 */
export const markAsActed = mutation({
  args: {
    messageId: v.id("agentMessages"),
    agentName: v.string(),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Resolve agent name → Convex ID (messages store Convex IDs, not names)
    const agentId = await resolveAgentIdByName(ctx.db, args.agentName);

    // Only recipient can mark as acted
    if (message.to !== agentId) {
      throw new Error("Only recipient can mark message as acted");
    }

    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    if (currentStatus >= MessageStatus.ACTED) {
      return { success: true, alreadyActed: true };
    }

    // AGT-337: Enforce loop order — must be REPLIED before ACTED
    if (currentStatus < MessageStatus.REPLIED) {
      throw new Error(
        `Loop order violation: cannot mark as ACTED before REPLIED (current: ${StatusLabels[currentStatus as keyof typeof StatusLabels] ?? currentStatus})`
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      statusCode: MessageStatus.ACTED,
      actedAt: now,
      expectedReportBy: now + SLA.REPORT,
      linkedTaskId: args.taskId,
    });

    // Resolve any active loop alerts for this message
    const alerts = await ctx.db
      .query("loopAlerts")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const alert of alerts) {
      if (alert.alertType === "reply_overdue" || alert.alertType === "action_overdue") {
        await ctx.db.patch(alert._id, { status: "resolved", resolvedAt: now });
      }
    }

    return { success: true, alreadyActed: false };
  },
});

/**
 * Mark message as REPORTED — loop closed.
 * Sets status = 5, stores final report, clears all pending alerts.
 */
export const markAsReported = mutation({
  args: {
    messageId: v.id("agentMessages"),
    agentName: v.string(),
    report: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Resolve agent name → Convex ID (messages store Convex IDs, not names)
    const agentId = await resolveAgentIdByName(ctx.db, args.agentName);

    // Only recipient can mark as reported
    if (message.to !== agentId) {
      throw new Error("Only recipient can mark message as reported");
    }

    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    if (currentStatus >= MessageStatus.REPORTED) {
      return { success: true, alreadyReported: true };
    }

    // AGT-337: Enforce loop order — must be ACTED before REPORTED
    if (currentStatus < MessageStatus.ACTED) {
      throw new Error(
        `Loop order violation: cannot mark as REPORTED before ACTED (current: ${StatusLabels[currentStatus as keyof typeof StatusLabels] ?? currentStatus})`
      );
    }

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      statusCode: MessageStatus.REPORTED,
      reportedAt: now,
      finalReport: args.report,
    });

    // Resolve ALL active loop alerts for this message
    const alerts = await ctx.db
      .query("loopAlerts")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const alert of alerts) {
      await ctx.db.patch(alert._id, { status: "resolved", resolvedAt: now });
    }

    return { success: true, alreadyReported: false };
  },
});

/**
 * Mark loop as explicitly broken — preserves audit trail, escalates to MAX.
 */
export const markLoopBroken = mutation({
  args: {
    messageId: v.id("agentMessages"),
    agentName: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    await ctx.db.patch(args.messageId, {
      loopBroken: true,
      loopBrokenReason: args.reason,
    });

    // Create loop_broken alert
    await ctx.db.insert("loopAlerts", {
      messageId: args.messageId,
      agentName: args.agentName,
      alertType: "loop_broken",
      severity: "critical",
      status: "escalated",
      escalatedTo: "max",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================
// AGT-337: LOOP P4 — Enforcement & Compliance
// ============================================================

/**
 * Enforce loop order: agents CANNOT skip stages.
 * Validates that targetStatus is the next sequential stage.
 * Throws if the transition would skip a stage.
 */
export const enforceLoopOrder = mutation({
  args: {
    messageId: v.id("agentMessages"),
    targetStatus: v.number(),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const currentStatus = message.statusCode ?? MessageStatus.PENDING;

    if (currentStatus >= args.targetStatus) {
      return { valid: true, currentStatus, reason: "Already at or past target" };
    }

    if (args.targetStatus > currentStatus + 1) {
      const currentLabel = StatusLabels[currentStatus as keyof typeof StatusLabels] ?? "unknown";
      const targetLabel = StatusLabels[args.targetStatus as keyof typeof StatusLabels] ?? "unknown";
      const nextLabel = StatusLabels[(currentStatus + 1) as keyof typeof StatusLabels] ?? "unknown";

      throw new Error(
        `Loop order violation: cannot skip from "${currentLabel}" to "${targetLabel}". ` +
        `Next required: "${nextLabel}".`
      );
    }

    return { valid: true, currentStatus };
  },
});

/**
 * Escalate a stuck message to a manager.
 * Creates a loopAlert + sends DM via unifiedMessages.
 */
export const escalateToManager = mutation({
  args: {
    messageId: v.id("agentMessages"),
    reason: v.string(),
    escalateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const now = Date.now();
    const target = args.escalateTo?.toLowerCase() ?? "max";
    const agentName = await resolveAgentNameById(ctx.db, message.to);

    await ctx.db.insert("loopAlerts", {
      messageId: args.messageId,
      agentName,
      alertType: "loop_broken",
      severity: "critical",
      status: "escalated",
      escalatedTo: target,
      createdAt: now,
    });

    await ctx.db.insert("unifiedMessages", {
      fromAgent: "system",
      toAgent: target === "ceo" ? "son" : target,
      content: `ESCALATION: ${agentName.toUpperCase()} — ${args.reason}. Message: ${args.messageId}`,
      type: "system",
      priority: "urgent",
      read: false,
      createdAt: now,
    });

    return { success: true, escalatedTo: target };
  },
});

/**
 * Get loop compliance stats per agent.
 * Returns: total messages, loops closed, broken, SLA breaches, compliance %.
 */
export const getAgentLoopCompliance = query({
  args: {
    agentName: v.optional(v.string()),
    sinceDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - (args.sinceDays ?? 7) * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (args.agentName) {
      const agentId = await resolveAgentIdByName(ctx.db, args.agentName);
      const messages = await ctx.db
        .query("agentMessages")
        .withIndex("by_to_statusCode", (q) => q.eq("to", agentId))
        .filter((q) => q.gte(q.field("timestamp"), since))
        .collect();

      return [buildCompliance(args.agentName, messages, now)];
    }

    // All agents
    const allMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    const byAgent = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      const name = await resolveAgentNameById(ctx.db, msg.to);
      if (!byAgent.has(name)) byAgent.set(name, []);
      byAgent.get(name)!.push(msg);
    }

    return Array.from(byAgent.entries()).map(([name, msgs]) =>
      buildCompliance(name, msgs, now)
    );
  },
});

function buildCompliance(agentName: string, messages: any[], now: number) {
  const total = messages.length;
  const closed = messages.filter((m: any) => (m.statusCode ?? 0) >= MessageStatus.REPORTED).length;
  const broken = messages.filter((m: any) => m.loopBroken).length;

  let slaBreaches = 0;
  for (const m of messages) {
    if (m.expectedReplyBy && !m.repliedAt && now > m.expectedReplyBy) slaBreaches++;
    if (m.expectedActionBy && !m.actedAt && now > m.expectedActionBy) slaBreaches++;
    if (m.expectedReportBy && !m.reportedAt && now > m.expectedReportBy) slaBreaches++;
  }

  return {
    agentName,
    totalMessages: total,
    loopsClosed: closed,
    loopsBroken: broken,
    slaBreaches,
    inProgress: total - closed - broken,
    compliancePercent: total > 0 ? Math.round((closed / total) * 100) : 100,
  };
}
