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

// =============================================================================
// P1 METRICS: VELOCITY, COMPLETION TIME, COST PER TASK
// =============================================================================

/**
 * P1: Get agent velocity metrics
 * Tasks per hour, per agent, with trend analysis
 */
export const getAgentVelocity = query({
  args: {
    agentName: v.optional(v.string()),
    hours: v.optional(v.number()), // Last N hours (default 24)
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const now = Date.now();
    const startTime = now - hours * 60 * 60 * 1000;

    // Get performance metrics for the period
    const metrics = await ctx.db
      .query("performanceMetrics")
      .collect();

    // Filter by time and optionally by agent
    const filtered = metrics.filter(m => {
      const hourTs = new Date(m.hourBucket + ":00:00Z").getTime();
      if (hourTs < startTime) return false;
      if (args.agentName && m.agentName !== args.agentName) return false;
      return true;
    });

    // Group by agent
    const byAgent: Record<string, {
      agentName: string;
      totalCompleted: number;
      totalFailed: number;
      hoursActive: number;
      velocityPerHour: number;
      peakHour: string;
      peakVelocity: number;
    }> = {};

    for (const m of filtered) {
      if (!byAgent[m.agentName]) {
        byAgent[m.agentName] = {
          agentName: m.agentName,
          totalCompleted: 0,
          totalFailed: 0,
          hoursActive: 0,
          velocityPerHour: 0,
          peakHour: "",
          peakVelocity: 0,
        };
      }
      byAgent[m.agentName].totalCompleted += m.tasksCompleted;
      byAgent[m.agentName].totalFailed += m.tasksFailed;
      byAgent[m.agentName].hoursActive += 1;

      // Track peak hour
      if (m.tasksCompleted > byAgent[m.agentName].peakVelocity) {
        byAgent[m.agentName].peakVelocity = m.tasksCompleted;
        byAgent[m.agentName].peakHour = m.hourBucket;
      }
    }

    // Calculate velocity per hour
    for (const agent of Object.values(byAgent)) {
      agent.velocityPerHour = agent.hoursActive > 0
        ? Math.round((agent.totalCompleted / agent.hoursActive) * 10) / 10
        : 0;
    }

    // Hourly trend (all agents combined or single agent)
    const hourlyTrend: { hour: string; completed: number; failed: number }[] = [];
    const hourBuckets = new Map<string, { completed: number; failed: number }>();

    for (const m of filtered) {
      const existing = hourBuckets.get(m.hourBucket) || { completed: 0, failed: 0 };
      existing.completed += m.tasksCompleted;
      existing.failed += m.tasksFailed;
      hourBuckets.set(m.hourBucket, existing);
    }

    for (const [hour, data] of Array.from(hourBuckets.entries()).sort()) {
      hourlyTrend.push({ hour, ...data });
    }

    const totalCompleted = Object.values(byAgent).reduce((sum, a) => sum + a.totalCompleted, 0);
    const totalHours = Object.values(byAgent).reduce((sum, a) => sum + a.hoursActive, 0);

    return {
      hours,
      agentName: args.agentName,
      totalCompleted,
      overallVelocity: totalHours > 0 ? Math.round((totalCompleted / totalHours) * 10) / 10 : 0,
      byAgent: Object.values(byAgent).sort((a, b) => b.velocityPerHour - a.velocityPerHour),
      hourlyTrend,
    };
  },
});

/**
 * P1: Get task completion time metrics
 * Average time from task start to completion
 */
export const getTaskCompletionTime = query({
  args: {
    agentName: v.optional(v.string()),
    days: v.optional(v.number()), // Last N days (default 7)
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    // Get completed tasks with timing data
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect();

    // Filter by time and agent
    const completedTasks = tasks.filter(t => {
      if (!t.completedAt || t.completedAt < startTime) return false;
      if (args.agentName && t.agentName !== args.agentName) return false;
      return true;
    });

    // Calculate completion times
    const completionTimes: {
      taskId: string;
      agentName: string;
      durationMinutes: number;
      completedAt: number;
    }[] = [];

    for (const task of completedTasks) {
      // Duration = completedAt - updatedAt (when moved to in_progress)
      // Approximation: use createdAt if no better data
      const startTime = task.createdAt;
      const endTime = task.completedAt!;
      const durationMinutes = Math.round((endTime - startTime) / (60 * 1000));

      completionTimes.push({
        taskId: task.linearIdentifier || task._id,
        agentName: task.agentName || "unknown",
        durationMinutes,
        completedAt: endTime,
      });
    }

    // Group by agent
    const byAgent: Record<string, {
      agentName: string;
      taskCount: number;
      totalMinutes: number;
      avgMinutes: number;
      minMinutes: number;
      maxMinutes: number;
    }> = {};

    for (const ct of completionTimes) {
      if (!byAgent[ct.agentName]) {
        byAgent[ct.agentName] = {
          agentName: ct.agentName,
          taskCount: 0,
          totalMinutes: 0,
          avgMinutes: 0,
          minMinutes: Infinity,
          maxMinutes: 0,
        };
      }
      byAgent[ct.agentName].taskCount += 1;
      byAgent[ct.agentName].totalMinutes += ct.durationMinutes;
      byAgent[ct.agentName].minMinutes = Math.min(byAgent[ct.agentName].minMinutes, ct.durationMinutes);
      byAgent[ct.agentName].maxMinutes = Math.max(byAgent[ct.agentName].maxMinutes, ct.durationMinutes);
    }

    // Calculate averages
    for (const agent of Object.values(byAgent)) {
      agent.avgMinutes = agent.taskCount > 0
        ? Math.round(agent.totalMinutes / agent.taskCount)
        : 0;
      if (agent.minMinutes === Infinity) agent.minMinutes = 0;
    }

    // Daily trend
    const dailyTrend: { date: string; avgMinutes: number; taskCount: number }[] = [];
    const byDay = new Map<string, { total: number; count: number }>();

    for (const ct of completionTimes) {
      const date = new Date(ct.completedAt).toISOString().split("T")[0];
      const existing = byDay.get(date) || { total: 0, count: 0 };
      existing.total += ct.durationMinutes;
      existing.count += 1;
      byDay.set(date, existing);
    }

    for (const [date, data] of Array.from(byDay.entries()).sort()) {
      dailyTrend.push({
        date,
        avgMinutes: Math.round(data.total / data.count),
        taskCount: data.count,
      });
    }

    const totalMinutes = completionTimes.reduce((sum, ct) => sum + ct.durationMinutes, 0);
    const avgMinutes = completionTimes.length > 0 ? Math.round(totalMinutes / completionTimes.length) : 0;

    return {
      days,
      agentName: args.agentName,
      totalTasks: completionTimes.length,
      avgCompletionMinutes: avgMinutes,
      byAgent: Object.values(byAgent).sort((a, b) => a.avgMinutes - b.avgMinutes),
      dailyTrend,
      recentCompletions: completionTimes.slice(-10).reverse(),
    };
  },
});

/**
 * P1: Get cost per task metrics
 * Detailed cost breakdown per task and agent
 */
export const getCostPerTask = query({
  args: {
    agentName: v.optional(v.string()),
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

    // Filter by agent if specified
    const filtered = args.agentName
      ? costLogs.filter(l => l.agentName === args.agentName)
      : costLogs;

    // Group by task
    const byTask: Record<string, {
      taskId: string;
      agentName: string;
      totalCost: number;
      totalTokens: number;
      entries: number;
    }> = {};

    for (const log of filtered) {
      const taskKey = log.linearIdentifier || log.taskId?.toString() || "no-task";
      if (!byTask[taskKey]) {
        byTask[taskKey] = {
          taskId: taskKey,
          agentName: log.agentName,
          totalCost: 0,
          totalTokens: 0,
          entries: 0,
        };
      }
      byTask[taskKey].totalCost += log.cost;
      byTask[taskKey].totalTokens += log.inputTokens + log.outputTokens;
      byTask[taskKey].entries += 1;
    }

    // Group by agent
    const byAgent: Record<string, {
      agentName: string;
      totalCost: number;
      taskCount: number;
      avgCostPerTask: number;
      totalTokens: number;
      avgTokensPerTask: number;
    }> = {};

    for (const task of Object.values(byTask)) {
      if (!byAgent[task.agentName]) {
        byAgent[task.agentName] = {
          agentName: task.agentName,
          totalCost: 0,
          taskCount: 0,
          avgCostPerTask: 0,
          totalTokens: 0,
          avgTokensPerTask: 0,
        };
      }
      byAgent[task.agentName].totalCost += task.totalCost;
      byAgent[task.agentName].totalTokens += task.totalTokens;
      byAgent[task.agentName].taskCount += 1;
    }

    // Calculate averages
    for (const agent of Object.values(byAgent)) {
      agent.avgCostPerTask = agent.taskCount > 0
        ? Math.round((agent.totalCost / agent.taskCount) * 10000) / 10000
        : 0;
      agent.avgTokensPerTask = agent.taskCount > 0
        ? Math.round(agent.totalTokens / agent.taskCount)
        : 0;
    }

    // Cost distribution (buckets)
    const costBuckets = {
      under1cent: 0,
      under5cents: 0,
      under10cents: 0,
      under50cents: 0,
      under1dollar: 0,
      over1dollar: 0,
    };

    for (const task of Object.values(byTask)) {
      if (task.totalCost < 0.01) costBuckets.under1cent++;
      else if (task.totalCost < 0.05) costBuckets.under5cents++;
      else if (task.totalCost < 0.10) costBuckets.under10cents++;
      else if (task.totalCost < 0.50) costBuckets.under50cents++;
      else if (task.totalCost < 1.00) costBuckets.under1dollar++;
      else costBuckets.over1dollar++;
    }

    const totalCost = filtered.reduce((sum, l) => sum + l.cost, 0);
    const taskCount = Object.keys(byTask).length;

    return {
      days,
      agentName: args.agentName,
      totalCost,
      totalTasks: taskCount,
      avgCostPerTask: taskCount > 0 ? Math.round((totalCost / taskCount) * 10000) / 10000 : 0,
      byAgent: Object.values(byAgent).sort((a, b) => b.avgCostPerTask - a.avgCostPerTask),
      costDistribution: costBuckets,
      topCostlyTasks: Object.values(byTask).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10),
    };
  },
});

/**
 * P1: Get combined P1 metrics snapshot
 * Single query for all P1 metrics (velocity, completion time, cost per task)
 */
export const getP1Metrics = query({
  args: {
    agentName: v.optional(v.string()),
    hours: v.optional(v.number()), // For velocity (default 24)
    days: v.optional(v.number()),  // For completion time and cost (default 7)
  },
  handler: async (ctx, args) => {
    const hours = args.hours || 24;
    const days = args.days || 7;
    const now = Date.now();

    // Get agents for reference
    const agents = await ctx.db.query("agents").collect();
    const agentFilter = args.agentName;

    // --- VELOCITY ---
    const velocityStartTime = now - hours * 60 * 60 * 1000;
    const perfMetrics = await ctx.db.query("performanceMetrics").collect();
    const velocityMetrics = perfMetrics.filter(m => {
      const hourTs = new Date(m.hourBucket + ":00:00Z").getTime();
      if (hourTs < velocityStartTime) return false;
      if (agentFilter && m.agentName !== agentFilter) return false;
      return true;
    });

    let velocityTotal = 0;
    let velocityHours = 0;
    for (const m of velocityMetrics) {
      velocityTotal += m.tasksCompleted;
      velocityHours += 1;
    }

    // --- COMPLETION TIME ---
    const completionStartTime = now - days * 24 * 60 * 60 * 1000;
    const doneTasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", "done"))
      .collect();

    const completedTasks = doneTasks.filter(t => {
      if (!t.completedAt || t.completedAt < completionStartTime) return false;
      if (agentFilter && t.agentName !== agentFilter) return false;
      return true;
    });

    let totalDuration = 0;
    for (const t of completedTasks) {
      totalDuration += (t.completedAt! - t.createdAt) / (60 * 1000);
    }
    const avgCompletionMinutes = completedTasks.length > 0
      ? Math.round(totalDuration / completedTasks.length)
      : 0;

    // --- COST PER TASK ---
    const costLogs = await ctx.db
      .query("costLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), completionStartTime))
      .collect();

    const filteredCosts = agentFilter
      ? costLogs.filter(l => l.agentName === agentFilter)
      : costLogs;

    const taskCosts = new Map<string, number>();
    for (const log of filteredCosts) {
      const key = log.linearIdentifier || log.taskId?.toString() || "no-task";
      taskCosts.set(key, (taskCosts.get(key) || 0) + log.cost);
    }

    const totalCost = filteredCosts.reduce((sum, l) => sum + l.cost, 0);
    const taskCount = taskCosts.size;
    const avgCostPerTask = taskCount > 0
      ? Math.round((totalCost / taskCount) * 10000) / 10000
      : 0;

    return {
      timestamp: now,
      agentName: agentFilter,
      velocity: {
        hours,
        tasksCompleted: velocityTotal,
        velocityPerHour: velocityHours > 0 ? Math.round((velocityTotal / velocityHours) * 10) / 10 : 0,
      },
      completionTime: {
        days,
        tasksCompleted: completedTasks.length,
        avgMinutes: avgCompletionMinutes,
        avgFormatted: avgCompletionMinutes < 60
          ? `${avgCompletionMinutes}m`
          : `${Math.floor(avgCompletionMinutes / 60)}h ${avgCompletionMinutes % 60}m`,
      },
      costPerTask: {
        days,
        totalCost,
        taskCount,
        avgCostPerTask,
        avgFormatted: avgCostPerTask < 0.01
          ? `$${avgCostPerTask.toFixed(4)}`
          : `$${avgCostPerTask.toFixed(2)}`,
      },
      agents: agents.map(a => ({
        name: a.name,
        status: a.status,
        role: a.role,
      })),
    };
  },
});
