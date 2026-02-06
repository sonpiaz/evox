/**
 * Message Status System
 *
 * Status flow: sent → delivered → seen → replied
 *
 * Encoded status:
 * 0 = pending (not delivered yet)
 * 1 = delivered (in recipient's inbox)
 * 2 = seen (recipient opened/read)
 * 3 = replied (recipient sent response)
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Status enum
export const MessageStatus = {
  PENDING: 0,
  DELIVERED: 1,
  SEEN: 2,
  REPLIED: 3,
} as const;

export const StatusLabels = {
  0: "pending",
  1: "delivered",
  2: "seen",
  3: "replied",
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

    // Only recipient can mark as seen
    if (message.to !== args.agentName) {
      throw new Error("Only recipient can mark message as seen");
    }

    // Don't downgrade status (e.g., replied → seen)
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    if (currentStatus >= MessageStatus.SEEN) {
      return { success: true, alreadySeen: true };
    }

    await ctx.db.patch(args.messageId, {
      statusCode: MessageStatus.SEEN,
      seenAt: Date.now(),
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

    await ctx.db.patch(args.originalMessageId, {
      statusCode: MessageStatus.REPLIED,
      repliedAt: Date.now(),
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
