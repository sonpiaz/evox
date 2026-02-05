/**
 * Agent-to-agent messages (AGT-123): handoff, update, request, fyi.
 * Resolve agent names via agentMappings for getUnreadMessages / getConversation.
 */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveAgentIdByName } from "./agentMappings";

const messageType = v.union(
  v.literal("handoff"),
  v.literal("update"),
  v.literal("request"),
  v.literal("fyi")
);
const messageStatus = v.union(v.literal("unread"), v.literal("read"));

/** Send a message from one agent to another. */
export const sendMessage = mutation({
  args: {
    fromAgentName: v.string(),
    toAgentName: v.string(),
    type: messageType,
    content: v.string(),
    taskRef: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const fromId = await resolveAgentIdByName(ctx.db, args.fromAgentName);
    const toId = await resolveAgentIdByName(ctx.db, args.toAgentName);
    const now = Date.now();
    return await ctx.db.insert("agentMessages", {
      from: fromId,
      to: toId,
      type: args.type,
      content: args.content,
      taskRef: args.taskRef,
      status: "unread",
      timestamp: now,
    });
  },
});

/** Unread counts for all mapped agents (max, sam, leo). For dashboard boot. */
export const getUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const names = ["max", "sam", "leo"] as const;
    const counts: Record<string, number> = {};
    for (const name of names) {
      try {
        const toId = await resolveAgentIdByName(ctx.db, name);
        const list = await ctx.db
          .query("agentMessages")
          .withIndex("by_to_status", (q) =>
            q.eq("to", toId).eq("status", "unread")
          )
          .collect();
        counts[name] = list.length;
      } catch {
        counts[name] = 0;
      }
    }
    return counts;
  },
});

/** Get unread messages for an agent (by canonical name). Used in agent boot sequence. */
export const getUnreadMessages = query({
  args: {
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    let toId;
    try {
      toId = await resolveAgentIdByName(ctx.db, args.agentName);
    } catch {
      return [];
    }
    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_to_status", (q) =>
        q.eq("to", toId).eq("status", "unread")
      )
      .order("desc")
      .collect();
    const withSenders = await Promise.all(
      messages.map(async (m) => {
        const from = await ctx.db.get(m.from);
        const task = m.taskRef ? await ctx.db.get(m.taskRef) : null;
        return {
          ...m,
          fromAgent: from
            ? { name: from.name, avatar: from.avatar }
            : null,
          taskRefDisplay: task
            ? { linearIdentifier: task.linearIdentifier, title: task.title }
            : null,
        };
      })
    );
    return withSenders;
  },
});

/** Mark a message as read. */
export const markAsRead = mutation({
  args: {
    messageId: v.id("agentMessages"),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    await ctx.db.patch(args.messageId, { status: "read" });
  },
});

/** List all messages to or from an agent (for Agent Profile Messages tab). */
export const listForAgent = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const [toMe, fromMe] = await Promise.all([
      ctx.db
        .query("agentMessages")
        .withIndex("by_to_status", (q) => q.eq("to", args.agentId))
        .collect(),
      ctx.db
        .query("agentMessages")
        .withIndex("by_from_to", (q) => q.eq("from", args.agentId))
        .collect(),
    ]);
    const merged = [...toMe, ...fromMe].sort((a, b) => b.timestamp - a.timestamp);
    const limited = merged.slice(0, limit);
    const withAgents = await Promise.all(
      limited.map(async (m) => {
        const from = await ctx.db.get(m.from);
        const to = await ctx.db.get(m.to);
        const task = m.taskRef ? await ctx.db.get(m.taskRef) : null;
        return {
          ...m,
          fromAgent: from ? { name: from.name, avatar: from.avatar } : null,
          toAgent: to ? { name: to.name, avatar: to.avatar } : null,
          taskRefDisplay: task
            ? { linearIdentifier: task.linearIdentifier, title: task.title }
            : null,
        };
      })
    );
    return withAgents;
  },
});

/** Get conversation between two agents (by canonical names), ordered by timestamp. */
export const getConversation = query({
  args: {
    agent1: v.string(),
    agent2: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const a1 = await resolveAgentIdByName(ctx.db, args.agent1);
    const a2 = await resolveAgentIdByName(ctx.db, args.agent2);
    const fromAtoB = await ctx.db
      .query("agentMessages")
      .withIndex("by_from_to", (q) => q.eq("from", a1).eq("to", a2))
      .order("desc")
      .collect();
    const fromBtoA = await ctx.db
      .query("agentMessages")
      .withIndex("by_from_to", (q) => q.eq("from", a2).eq("to", a1))
      .order("desc")
      .collect();
    const merged = [...fromAtoB, ...fromBtoA].sort(
      (x, y) => x.timestamp - y.timestamp
    );
    const limited = args.limit ? merged.slice(-args.limit) : merged;
    const withAgents = await Promise.all(
      limited.map(async (m) => {
        const from = await ctx.db.get(m.from);
        const to = await ctx.db.get(m.to);
        const task = m.taskRef ? await ctx.db.get(m.taskRef) : null;
        return {
          ...m,
          fromAgent: from
            ? { name: from.name, avatar: from.avatar }
            : null,
          toAgent: to ? { name: to.name, avatar: to.avatar } : null,
          taskRefDisplay: task
            ? { linearIdentifier: task.linearIdentifier, title: task.title }
            : null,
        };
      })
    );
    return withAgents;
  },
});

/** Get all messages across the system with optional filters. AGT-237 */
export const getAllMessages = query({
  args: {
    agentName: v.optional(v.string()),
    messageType: v.optional(messageType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    let messages = await ctx.db
      .query("agentMessages")
      .order("desc")
      .take(limit * 2); // Get more for filtering

    // Filter by agent (from or to)
    if (args.agentName) {
      try {
        const agentId = await resolveAgentIdByName(ctx.db, args.agentName);
        messages = messages.filter(
          (m) => m.from === agentId || m.to === agentId
        );
      } catch {
        return [];
      }
    }

    // Filter by type
    if (args.messageType) {
      messages = messages.filter((m) => m.type === args.messageType);
    }

    // Take limit after filtering
    const limited = messages.slice(0, limit);

    // Hydrate with agent data
    const withAgents = await Promise.all(
      limited.map(async (m) => {
        const from = await ctx.db.get(m.from);
        const to = await ctx.db.get(m.to);
        const task = m.taskRef ? await ctx.db.get(m.taskRef) : null;
        return {
          ...m,
          fromAgent: from ? { name: from.name, avatar: from.avatar } : null,
          toAgent: to ? { name: to.name, avatar: to.avatar } : null,
          taskRefDisplay: task
            ? { linearIdentifier: task.linearIdentifier, title: task.title }
            : null,
        };
      })
    );
    return withAgents;
  },
});

/** Get analytics for communication log. AGT-237 */
export const getAnalytics = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 500;
    const messages = await ctx.db
      .query("agentMessages")
      .order("desc")
      .take(limit);

    // Message volume per agent
    const volumeByAgent: Record<string, number> = {};
    // Active pairs: "agent1<>agent2" -> count
    const pairCounts: Record<string, number> = {};
    // Response times: collect all response deltas
    const responseTimes: number[] = [];

    const agentCache = new Map<string, { name: string; avatar: string }>();
    for (const msg of messages) {
      // Get agent names
      let fromName = agentCache.get(msg.from);
      if (!fromName) {
        const agent = await ctx.db.get(msg.from);
        if (agent && agent.name && agent.avatar) {
          fromName = { name: agent.name, avatar: agent.avatar };
          agentCache.set(msg.from, fromName);
        }
      }

      let toName = agentCache.get(msg.to);
      if (!toName) {
        const agent = await ctx.db.get(msg.to);
        if (agent && agent.name && agent.avatar) {
          toName = { name: agent.name, avatar: agent.avatar };
          agentCache.set(msg.to, toName);
        }
      }

      if (fromName && toName) {
        // Volume by agent
        volumeByAgent[fromName.name] = (volumeByAgent[fromName.name] || 0) + 1;

        // Active pairs (normalize order)
        const pair = [fromName.name, toName.name].sort().join("<>");
        pairCounts[pair] = (pairCounts[pair] || 0) + 1;
      }
    }

    // Calculate response times: find messages where B responds to A within 1 hour
    const messagesByRecipient = new Map<string, typeof messages>();
    for (const msg of messages) {
      const key = msg.to;
      if (!messagesByRecipient.has(key)) {
        messagesByRecipient.set(key, []);
      }
      messagesByRecipient.get(key)!.push(msg);
    }

    for (const msg of messages) {
      // Look for replies from recipient to sender within 1 hour
      const potentialReplies = messagesByRecipient.get(msg.from) || [];
      for (const reply of potentialReplies) {
        if (
          reply.from === msg.to &&
          reply.timestamp > msg.timestamp &&
          reply.timestamp - msg.timestamp < 3600000 // 1 hour
        ) {
          responseTimes.push(reply.timestamp - msg.timestamp);
          break; // Only count first reply
        }
      }
    }

    // Convert to sorted arrays
    const volumeByAgentSorted = Object.entries(volumeByAgent)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ agent: name, count }));

    const topPairs = Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pair, count]) => ({ pair, count }));

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      volumeByAgent: volumeByAgentSorted,
      topPairs,
      avgResponseTime,
      totalMessages: messages.length,
    };
  },
});

/**
 * Clean up spam messages (from invalid/non-existent agents)
 * Run: npx convex run agentMessages:cleanupSpam
 */
export const cleanupSpam = mutation({
  args: {},
  handler: async (ctx) => {
    const allMessages = await ctx.db.query("agentMessages").collect();
    let deleted = 0;
    for (const msg of allMessages) {
      const fromAgent = await ctx.db.get(msg.from);
      if (!fromAgent) {
        await ctx.db.delete(msg._id);
        deleted++;
      }
    }
    return { deleted, message: `Cleaned up ${deleted} spam messages` };
  },
});

// ============================================================================
// P0 CEO REQUEST: Channel Messages with Keywords
// For LEO's AgentCommsWidget
// ============================================================================

/**
 * Extract keywords from message content
 * - Ticket IDs: AGT-XXX, #AGT-XXX
 * - Actions: shipped, fixed, blocked, completed, started, deployed, merged
 * - Components: dashboard, api, backend, frontend, convex, etc.
 */
function extractKeywords(content: string): string[] {
  const keywords: Set<string> = new Set();

  // Ticket IDs (AGT-123, #AGT-123)
  const ticketRegex = /#?(AGT-\d+)/gi;
  const ticketMatches = content.matchAll(ticketRegex);
  for (const match of ticketMatches) {
    keywords.add(match[1].toUpperCase());
  }

  // Action words
  const actionWords = [
    "shipped", "fixed", "blocked", "completed", "started",
    "deployed", "merged", "done", "working", "reviewing",
    "testing", "failed", "passed", "error", "success",
    "✅", "❌", "🔄", "🚀", "⚠️"
  ];
  const contentLower = content.toLowerCase();
  for (const action of actionWords) {
    if (contentLower.includes(action.toLowerCase())) {
      keywords.add(action);
    }
  }

  // Component/area keywords
  const componentWords = [
    "dashboard", "api", "backend", "frontend", "convex",
    "schema", "endpoint", "widget", "component", "hook",
    "agent", "dispatch", "health", "metrics", "test"
  ];
  for (const comp of componentWords) {
    if (contentLower.includes(comp)) {
      keywords.add(comp);
    }
  }

  // Limit to 5 keywords, prioritize tickets
  const result = Array.from(keywords);
  const tickets = result.filter(k => k.startsWith("AGT-"));
  const others = result.filter(k => !k.startsWith("AGT-"));
  return [...tickets, ...others].slice(0, 5);
}

/**
 * Get channel messages with extracted keywords
 * For AgentCommsWidget - shows agent communication activity
 */
export const getChannelMessagesWithKeywords = query({
  args: {
    channel: v.optional(v.string()), // Filter by channel (dev, general, design)
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { channel, limit = 20 }) => {
    // Get channel messages from activityEvents
    let events = await ctx.db
      .query("activityEvents")
      .withIndex("by_category", (q) => q.eq("category", "message"))
      .order("desc")
      .take(limit * 2); // Get more to filter

    // Filter by channel if specified
    if (channel) {
      events = events.filter((e) =>
        e.title?.toLowerCase().includes(`#${channel.toLowerCase()}`)
      );
    }

    // Limit after filtering
    events = events.slice(0, limit);

    // Transform to response format
    const messages = events.map((e) => {
      const content = e.description ?? "";
      const keywords = extractKeywords(content);

      // Extract channel from title (e.g., "Posted to #dev")
      const channelMatch = e.title?.match(/#(\w+)/);
      const msgChannel = channelMatch ? channelMatch[1] : "general";

      // Create summary (first 100 chars)
      const summary = content.length > 100
        ? content.slice(0, 100) + "..."
        : content;

      return {
        id: e._id,
        sender: e.agentName,
        channel: msgChannel,
        keywords,
        summary,
        timestamp: e.timestamp,
      };
    });

    return {
      messages,
      count: messages.length,
      updatedAt: Date.now(),
    };
  },
});
