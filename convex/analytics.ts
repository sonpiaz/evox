/**
 * Analytics - Unified Dashboard Analytics
 *
 * Centralized analytics for EVOX Mission Control:
 * - Page view tracking
 * - Agent activity aggregation
 * - Task completion rates
 * - Performance metrics rollups
 * - Cost tracking summaries
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// =============================================================================
// PAGE VIEW TRACKING
// =============================================================================

/**
 * Record a page view event
 * Called from client when user navigates to a page
 */
export const recordPageView = mutation({
  args: {
    page: v.string(), // e.g., "/", "/live", "/ceo"
    referrer: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nowDate = new Date(now);
    const date = `${nowDate.getUTCFullYear()}-${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nowDate.getUTCDate()).padStart(2, '0')}`;
    const hour = `${date}T${String(nowDate.getUTCHours()).padStart(2, '0')}`;

    // Log to activityEvents for unified tracking
    // Find or create system agent for page views
    const systemAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", "system"))
      .first();

    const agentId = systemAgent?._id;

    if (agentId) {
      await ctx.db.insert("activityEvents", {
        agentId,
        agentName: "system",
        category: "system",
        eventType: "page_view",
        title: `Page view: ${args.page}`,
        metadata: {
          source: "analytics",
        },
        timestamp: now,
      });
    }

    // Return tracking info
    return {
      tracked: true,
      page: args.page,
      timestamp: now,
      date,
      hour,
    };
  },
});

// =============================================================================
// DASHBOARD ANALYTICS QUERIES
// =============================================================================

/**
 * Get comprehensive dashboard analytics
 * Single query for Elon-style dashboard
 */
export const getDashboardAnalytics = query({
  args: {
    date: v.optional(v.string()), // "2026-02-05" - defaults to today
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const date = args.date || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

    // Get all agents
    const agents = await ctx.db.query("agents").collect();
    const agentNames = agents.map(a => a.name);

    // Get today's performance metrics
    const performanceMetrics = await ctx.db
      .query("performanceMetrics")
      .withIndex("by_date", (q) => q.eq("date", date))
      .collect();

    // Aggregate agent metrics
    const agentStats: Record<string, {
      name: string;
      status: string;
      tasksCompleted: number;
      tasksFailed: number;
      totalCost: number;
      avgDuration: number;
      utilization: number;
      lastSeen: number;
    }> = {};

    for (const agent of agents) {
      agentStats[agent.name] = {
        name: agent.name,
        status: agent.status,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalCost: 0,
        avgDuration: 0,
        utilization: 0,
        lastSeen: agent.lastSeen,
      };
    }

    for (const m of performanceMetrics) {
      if (agentStats[m.agentName]) {
        agentStats[m.agentName].tasksCompleted += m.tasksCompleted;
        agentStats[m.agentName].tasksFailed += m.tasksFailed;
        agentStats[m.agentName].totalCost += m.totalCost;
        agentStats[m.agentName].utilization = m.utilizationPercent || 0;
        agentStats[m.agentName].avgDuration = m.avgDurationMinutes || 0;
      }
    }

    // Get task stats
    const tasks = await ctx.db.query("tasks").collect();
    const tasksByStatus = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
    for (const task of tasks) {
      if (task.status in tasksByStatus) {
        tasksByStatus[task.status as keyof typeof tasksByStatus]++;
      }
    }

    // Get today's activity events
    const dayStart = new Date(date).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const todayEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.and(
        q.gte(q.field("timestamp"), dayStart),
        q.lt(q.field("timestamp"), dayEnd)
      ))
      .collect();

    // Aggregate totals
    const totals = {
      totalAgents: agents.length,
      onlineAgents: agents.filter(a => a.status === "online" || a.status === "busy").length,
      totalTasksToday: Object.values(agentStats).reduce((sum, a) => sum + a.tasksCompleted, 0),
      totalCostToday: Object.values(agentStats).reduce((sum, a) => sum + a.totalCost, 0),
      totalEventsToday: todayEvents.length,
      tasksInProgress: tasksByStatus.in_progress,
      tasksPending: tasksByStatus.todo + tasksByStatus.backlog,
      tasksCompleted: tasksByStatus.done,
    };

    return {
      date,
      generatedAt: Date.now(),
      totals,
      agents: Object.values(agentStats),
      tasksByStatus,
      recentEvents: todayEvents.slice(-20).reverse(),
    };
  },
});

/**
 * Get task completion rates over time
 */
export const getTaskCompletionRates = query({
  args: {
    days: v.optional(v.number()), // Last N days (default 7)
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const now = Date.now();

    // Generate date buckets
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
    }

    // Get metrics for date range
    const allMetrics = await ctx.db
      .query("performanceMetrics")
      .collect();

    // Filter by date range and optionally by agent
    const filteredMetrics = allMetrics.filter(m => {
      if (!dates.includes(m.date)) return false;
      if (args.agentName && m.agentName !== args.agentName) return false;
      return true;
    });

    // Aggregate by date
    const byDate: Record<string, {
      date: string;
      completed: number;
      failed: number;
      started: number;
      completionRate: number;
    }> = {};

    for (const date of dates) {
      byDate[date] = {
        date,
        completed: 0,
        failed: 0,
        started: 0,
        completionRate: 0,
      };
    }

    for (const m of filteredMetrics) {
      if (byDate[m.date]) {
        byDate[m.date].completed += m.tasksCompleted;
        byDate[m.date].failed += m.tasksFailed;
        byDate[m.date].started += m.tasksStarted;
      }
    }

    // Calculate completion rates
    for (const date of dates) {
      const d = byDate[date];
      const total = d.completed + d.failed;
      d.completionRate = total > 0 ? (d.completed / total) * 100 : 0;
    }

    return {
      days,
      agentName: args.agentName,
      trend: Object.values(byDate),
      totals: {
        completed: Object.values(byDate).reduce((sum, d) => sum + d.completed, 0),
        failed: Object.values(byDate).reduce((sum, d) => sum + d.failed, 0),
        avgCompletionRate: Object.values(byDate).reduce((sum, d) => sum + d.completionRate, 0) / days,
      },
    };
  },
});

/**
 * Get agent activity summary
 */
export const getAgentActivitySummary = query({
  args: {
    agentName: v.optional(v.string()),
    hours: v.optional(v.number()), // Last N hours (default 24)
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;

    // Get recent activity events
    const events = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Filter by agent if specified
    const filteredEvents = args.agentName
      ? events.filter(e => e.agentName === args.agentName)
      : events;

    // Group by category
    const byCategory: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    const byEventType: Record<string, number> = {};

    for (const e of filteredEvents) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
      byAgent[e.agentName] = (byAgent[e.agentName] || 0) + 1;
      byEventType[e.eventType] = (byEventType[e.eventType] || 0) + 1;
    }

    // Get hourly distribution
    const hourlyDistribution: Record<string, number> = {};
    for (const e of filteredEvents) {
      const d = new Date(e.timestamp);
      const hourKey = `${String(d.getUTCHours()).padStart(2, '0')}:00`;
      hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;
    }

    return {
      hours,
      agentName: args.agentName,
      totalEvents: filteredEvents.length,
      byCategory,
      byAgent,
      byEventType,
      hourlyDistribution,
      recentEvents: filteredEvents.slice(-10).reverse(),
    };
  },
});

/**
 * Get real-time metrics snapshot
 * Lightweight query for frequent polling
 */
export const getRealTimeMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Get agents
    const agents = await ctx.db.query("agents").collect();

    // Get recent dispatches
    const pendingDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const runningDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    // Get recent events count
    const recentEvents = await ctx.db
      .query("activityEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), fiveMinutesAgo))
      .collect();

    return {
      timestamp: now,
      agents: agents.map(a => ({
        name: a.name,
        status: a.status,
        lastSeen: a.lastSeen,
        isActive: now - a.lastSeen < 5 * 60 * 1000,
      })),
      dispatches: {
        pending: pendingDispatches.length,
        running: runningDispatches.length,
      },
      recentActivityCount: recentEvents.length,
    };
  },
});

/**
 * Get cost summary for dashboard
 */
export const getCostSummary = query({
  args: {
    days: v.optional(v.number()), // Last N days (default 7)
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Get cost logs
    const costLogs = await ctx.db
      .query("costLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Aggregate by agent
    const byAgent: Record<string, {
      agentName: string;
      totalCost: number;
      totalTokens: number;
      taskCount: number;
    }> = {};

    for (const log of costLogs) {
      if (!byAgent[log.agentName]) {
        byAgent[log.agentName] = {
          agentName: log.agentName,
          totalCost: 0,
          totalTokens: 0,
          taskCount: 0,
        };
      }
      byAgent[log.agentName].totalCost += log.cost;
      byAgent[log.agentName].totalTokens += log.inputTokens + log.outputTokens;
      byAgent[log.agentName].taskCount += 1;
    }

    // Daily trend
    const dailyTrend: Record<string, number> = {};
    for (const log of costLogs) {
      const date = new Date(log.timestamp).toISOString().split("T")[0];
      dailyTrend[date] = (dailyTrend[date] || 0) + log.cost;
    }

    const totalCost = costLogs.reduce((sum, l) => sum + l.cost, 0);
    const totalTokens = costLogs.reduce((sum, l) => sum + l.inputTokens + l.outputTokens, 0);

    return {
      days,
      totalCost,
      totalTokens,
      avgCostPerDay: totalCost / days,
      byAgent: Object.values(byAgent).sort((a, b) => b.totalCost - a.totalCost),
      dailyTrend: Object.entries(dailyTrend).map(([date, cost]) => ({ date, cost })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
});
