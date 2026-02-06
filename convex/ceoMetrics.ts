/**
 * CEO Dashboard Metrics
 * Optimized queries for 3-second glanceability
 */

import { query } from "./_generated/server";
import { v } from "convex/values";
import { VALID_AGENTS } from "./agentRegistry";

/**
 * Get agent online status summary
 * Returns: { online: number, total: number, agents: AgentStatus[] }
 */
export const getAgentStatus = query({
  args: {},
  handler: async (ctx) => {
    const allAgents = await ctx.db.query("agents").collect();
    const agents = allAgents.filter((a) =>
      VALID_AGENTS.includes(a.name.toLowerCase() as any)
    );
    const now = Date.now();
    const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const agentStatuses = agents.map((agent) => {
      const lastSeen = agent.lastSeen || agent.lastHeartbeat || 0;
      const status = agent.status?.toLowerCase() || "offline";
      const isOnline =
        (status === "online" || status === "busy") &&
        now - lastSeen < ONLINE_THRESHOLD;

      return {
        name: agent.name,
        avatar: agent.avatar || "?",
        status: isOnline ? (status === "busy" ? "busy" : "online") : "offline",
        isOnline,
      };
    });

    const online = agentStatuses.filter((a) => a.isOnline).length;

    return {
      online,
      total: agents.length,
      agents: agentStatuses,
    };
  },
});

/**
 * Get today's key metrics
 * Returns: { completed: number, inProgress: number, blocked: number, cost: number }
 */
export const getTodayMetrics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const daysBack = args.days ?? 1;
    const periodStart = daysBack === 1
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : now.getTime() - daysBack * 24 * 60 * 60 * 1000;

    const tasks = await ctx.db.query("tasks").collect();

    // Count tasks by status
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;

    for (const task of tasks) {
      const status = task.status?.toLowerCase() || "";

      if (status === "done" && task.completedAt && task.completedAt >= periodStart) {
        completed++;
      } else if (status === "in_progress" || status === "review") {
        inProgress++;
      } else if (status === "backlog" || status === "todo") {
        if (task.priority?.toLowerCase() === "urgent") {
          blocked++;
        }
      }
    }

    // Get today's cost from performance metrics
    const today = now.toISOString().split("T")[0];
    const metrics = await ctx.db
      .query("performanceMetrics")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    const cost = metrics.reduce((sum, m) => sum + (m.totalCost || 0), 0);

    return {
      completed,
      inProgress,
      blocked,
      cost,
    };
  },
});

/**
 * Get blockers requiring attention
 * Only returns urgent items
 */
export const getBlockers = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();

    const blockers = tasks
      .filter((task) => {
        const status = task.status?.toLowerCase() || "";
        const priority = task.priority?.toLowerCase() || "";
        // Urgent tasks not yet in progress, or stale in-progress
        return (
          (priority === "urgent" && (status === "backlog" || status === "todo")) ||
          (status === "in_progress" && Date.now() - (task.updatedAt || 0) > 24 * 60 * 60 * 1000)
        );
      })
      .slice(0, 5)
      .map((task) => ({
        id: task._id,
        title: task.title || task.linearIdentifier || "Unknown",
        linearId: task.linearIdentifier,
        owner: task.agentName || "Unassigned",
        urgent: task.priority?.toLowerCase() === "urgent",
        stale: Date.now() - (task.updatedAt || 0) > 24 * 60 * 60 * 1000,
      }));

    return blockers;
  },
});

/**
 * Get today's wins (completed tasks)
 */
export const getWins = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const tasks = await ctx.db.query("tasks").collect();

    const wins = tasks
      .filter((task) => {
        const status = task.status?.toLowerCase() || "";
        return status === "done" && task.completedAt && task.completedAt >= todayStart;
      })
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 5)
      .map((task) => ({
        id: task._id,
        title: task.title || task.linearIdentifier || "Task completed",
        linearId: task.linearIdentifier,
        agent: task.agentName || "Unknown",
        completedAt: task.completedAt,
      }));

    return wins;
  },
});

/**
 * Get unified live feed - IMPACT ONLY, NO NOISE
 * Shows: commits, task completions, file changes, meaningful actions
 * Hides: heartbeats, "posted to #dev", generic messages
 */
export const getLiveFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get agents for enrichment
    const agents = await ctx.db.query("agents").collect();
    const agentMap = new Map(agents.map((a) => [a.name.toLowerCase(), a]));

    type FeedItem = {
      id: string;
      type: "commit" | "task" | "activity";
      agent: string;
      avatar: string;
      action: string;
      detail: string;
      meta?: string; // files changed, lines added, etc.
      timestamp: number;
      impact: "high" | "medium" | "low";
    };

    const feedItems: FeedItem[] = [];

    // 1. GIT COMMITS - High impact, shows real work
    const commits = await ctx.db
      .query("gitActivity")
      .order("desc")
      .take(limit);

    for (const commit of commits) {
      const agent = agentMap.get(commit.agentName?.toLowerCase() || "");
      const avatar = agent?.avatar || "?";
      const message = commit.message?.split("\n")[0]?.slice(0, 50) || "";

      // Build meta info
      const metaParts: string[] = [];
      if (commit.filesChanged) metaParts.push(`${commit.filesChanged} files`);
      if (commit.additions) metaParts.push(`+${commit.additions}`);
      if (commit.deletions) metaParts.push(`-${commit.deletions}`);

      feedItems.push({
        id: commit._id,
        type: "commit",
        agent: commit.agentName?.toUpperCase() || "?",
        avatar,
        action: "shipped",
        detail: message,
        meta: metaParts.length > 0 ? metaParts.join(" ") : commit.shortHash,
        timestamp: commit.pushedAt || commit._creationTime,
        impact: "high",
      });
    }

    // 2. TASK COMPLETIONS - High impact
    const activities = await ctx.db
      .query("activityEvents")
      .order("desc")
      .take(limit * 3);

    // NOISE FILTER - skip these event types entirely
    const NOISE_EVENTS = [
      "channel_message",
      "heartbeat",
      "message",
      "posted",
      "dm",
    ];

    // NOISE PATTERNS in descriptions
    const NOISE_PATTERNS = [
      /posted to #/i,
      /heartbeat/i,
      /status.?ok/i,
      /online/i,
      /standing by/i,
      /session (start|complete)/i,
    ];

    for (const act of activities) {
      const eventType = act.eventType?.toLowerCase() || "";
      const description = act.description || "";

      // Skip noise event types
      if (NOISE_EVENTS.some(n => eventType.includes(n))) continue;

      // Skip noise patterns in description
      if (NOISE_PATTERNS.some(p => p.test(description))) continue;

      const agent = agentMap.get(act.agentName?.toLowerCase() || "");
      const avatar = agent?.avatar || "?";

      let action = "";
      let detail = "";
      let impact: "high" | "medium" | "low" = "medium";

      if (eventType === "completed" || eventType === "task_completed") {
        action = "completed";
        detail = act.linearIdentifier
          ? `${act.linearIdentifier}: ${act.title || description.slice(0, 40)}`
          : description.slice(0, 50);
        impact = "high";
      } else if (eventType === "created" || eventType === "task_created") {
        action = "created";
        detail = act.linearIdentifier || description.slice(0, 40);
        impact = "medium";
      } else if (eventType === "push" || eventType === "deploy_success") {
        action = eventType === "push" ? "pushed" : "deployed";
        detail = description.slice(0, 40);
        impact = "high";
      } else if (eventType === "pr_merged") {
        action = "merged PR";
        detail = description.slice(0, 40);
        impact = "high";
      } else if (eventType === "status_change" || eventType === "moved") {
        // Only show moves to In Progress or Done
        const toStatus = act.metadata?.toStatus?.toLowerCase() || "";
        if (!["in_progress", "done", "review"].includes(toStatus)) continue;
        action = toStatus === "done" ? "finished" : "started";
        detail = act.linearIdentifier || description.slice(0, 40);
        impact = toStatus === "done" ? "high" : "medium";
      } else {
        continue; // Skip other events
      }

      feedItems.push({
        id: act._id,
        type: "task",
        agent: act.agentName?.toUpperCase() || "?",
        avatar,
        action,
        detail,
        timestamp: act.timestamp || act._creationTime,
        impact,
      });
    }

    // Sort by timestamp descending, then by impact
    feedItems.sort((a, b) => {
      const timeDiff = b.timestamp - a.timestamp;
      if (Math.abs(timeDiff) < 60000) { // Within 1 minute, sort by impact
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      }
      return timeDiff;
    });

    // Dedupe by agent+action+detail (keep most recent)
    const seen = new Set<string>();
    const deduped = feedItems.filter((item) => {
      const key = `${item.agent}-${item.action}-${item.detail.slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.slice(0, limit);
  },
});

/**
 * Get North Star progress
 * Based on vision milestones
 */
export const getNorthStarProgress = query({
  args: {},
  handler: async (ctx) => {
    // Check vision progress from database
    const progress = await ctx.db.query("visionProgress").first();

    if (progress) {
      return {
        percentage: progress.percentComplete || 0,
        weeklyChange: progress.weeklyChange || 0,
        phase: progress.currentPhase || "Unknown",
        milestones: progress.milestones || [],
      };
    }

    // Fallback: calculate from automation metrics
    const automationMetrics = await ctx.db.query("automationMetrics").order("desc").first();

    return {
      percentage: automationMetrics?.progressPercent || 0,
      weeklyChange: 0,
      phase: automationMetrics?.currentPhase || "Phase 1",
      milestones: [],
    };
  },
});

/**
 * Get recent agent comms from agentMessages table
 * (unifiedMessages is empty — agentMessages has real data)
 */
export const getRecentComms = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    const messages = await ctx.db
      .query("agentMessages")
      .order("desc")
      .take(limit);

    // Hydrate agent names
    const agents = await ctx.db.query("agents").collect();
    const agentMap = new Map(agents.map((a) => [a._id.toString(), a]));

    return messages.map((msg) => {
      const fromAgent = agentMap.get(msg.from.toString());
      const toAgent = agentMap.get(msg.to.toString());
      return {
        _id: msg._id,
        from: fromAgent?.name?.toLowerCase() || "?",
        to: toAgent?.name?.toLowerCase() || "?",
        content: msg.content,
        type: msg.type,
        timestamp: msg._creationTime,
        keywords: [] as string[],
      };
    });
  },
});
