/**
 * CORE-209: The Loop — Metrics Aggregation
 *
 * Hourly cron: aggregateHourlyMetrics() — per-agent loop stats
 * Daily cron: aggregateDailyMetrics() — CEO dashboard summary
 *
 * Tracks: completion rate, avg stage times, SLA adherence
 */

import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MessageStatus } from "./messageStatus";

/**
 * Hourly aggregation — per-agent loop performance.
 * Collects messages from the last hour and computes stats.
 */
export const aggregateHourlyMetrics = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const hourKey = new Date(now).toISOString().slice(0, 13); // "2026-02-06T14"

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), oneHourAgo))
      .collect();

    // Group by recipient agent
    const agentStats = new Map<string, {
      total: number;
      closed: number;
      broken: number;
      seenTimes: number[];
      replyTimes: number[];
      actionTimes: number[];
      reportTimes: number[];
      slaBreaches: number;
    }>();

    for (const msg of messages) {
      const agent = String(msg.to);
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          total: 0, closed: 0, broken: 0,
          seenTimes: [], replyTimes: [], actionTimes: [], reportTimes: [],
          slaBreaches: 0,
        });
      }
      const stats = agentStats.get(agent)!;
      stats.total++;

      const status = msg.statusCode ?? 0;

      if (status >= MessageStatus.REPORTED) stats.closed++;
      if (msg.loopBroken) stats.broken++;

      // Calculate stage durations
      if (msg.seenAt && msg.sentAt) {
        stats.seenTimes.push(msg.seenAt - msg.sentAt);
      }
      if (msg.repliedAt && msg.seenAt) {
        stats.replyTimes.push(msg.repliedAt - msg.seenAt);
      }
      if (msg.actedAt && msg.repliedAt) {
        stats.actionTimes.push(msg.actedAt - msg.repliedAt);
      }
      if (msg.reportedAt && msg.actedAt) {
        stats.reportTimes.push(msg.reportedAt - msg.actedAt);
      }

      // SLA breaches
      if (msg.expectedReplyBy && !msg.repliedAt && now > msg.expectedReplyBy) stats.slaBreaches++;
      if (msg.expectedActionBy && !msg.actedAt && now > msg.expectedActionBy) stats.slaBreaches++;
      if (msg.expectedReportBy && !msg.reportedAt && now > msg.expectedReportBy) stats.slaBreaches++;
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    let metricsWritten = 0;
    for (const [agent, stats] of agentStats) {
      // Upsert: check if metric already exists for this agent+period+key
      const existing = await ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) =>
          q.eq("agentName", agent).eq("period", "hourly").eq("periodKey", hourKey)
        )
        .first();

      const data = {
        agentName: agent,
        period: "hourly" as const,
        periodKey: hourKey,
        totalMessages: stats.total,
        loopsClosed: stats.closed,
        loopsBroken: stats.broken,
        avgSeenTimeMs: avg(stats.seenTimes),
        avgReplyTimeMs: avg(stats.replyTimes),
        avgActionTimeMs: avg(stats.actionTimes),
        avgReportTimeMs: avg(stats.reportTimes),
        slaBreaches: stats.slaBreaches,
        completionRate: stats.total > 0 ? stats.closed / stats.total : 0,
        timestamp: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("loopMetrics", data);
      }
      metricsWritten++;
    }

    return { metricsWritten, period: hourKey };
  },
});

/**
 * Daily aggregation — CEO dashboard summary.
 * Rolls up all messages from the last 24 hours.
 */
export const aggregateDailyMetrics = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const dayKey = new Date(now).toISOString().slice(0, 10); // "2026-02-06"

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), oneDayAgo))
      .collect();

    // Aggregate across all agents
    let total = 0, closed = 0, broken = 0, slaBreaches = 0;
    const agentTotals = new Map<string, { total: number; closed: number }>();

    for (const msg of messages) {
      total++;
      const agent = String(msg.to);
      if (!agentTotals.has(agent)) agentTotals.set(agent, { total: 0, closed: 0 });
      const at = agentTotals.get(agent)!;
      at.total++;

      const status = msg.statusCode ?? 0;
      if (status >= MessageStatus.REPORTED) { closed++; at.closed++; }
      if (msg.loopBroken) broken++;
      if (msg.expectedReplyBy && !msg.repliedAt && now > msg.expectedReplyBy) slaBreaches++;
      if (msg.expectedActionBy && !msg.actedAt && now > msg.expectedActionBy) slaBreaches++;
      if (msg.expectedReportBy && !msg.reportedAt && now > msg.expectedReportBy) slaBreaches++;
    }

    // Write per-agent daily metrics
    let metricsWritten = 0;
    for (const [agent, stats] of agentTotals) {
      const existing = await ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) =>
          q.eq("agentName", agent).eq("period", "daily").eq("periodKey", dayKey)
        )
        .first();

      const data = {
        agentName: agent,
        period: "daily" as const,
        periodKey: dayKey,
        totalMessages: stats.total,
        loopsClosed: stats.closed,
        loopsBroken: 0,
        slaBreaches: 0,
        completionRate: stats.total > 0 ? stats.closed / stats.total : 0,
        timestamp: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
      } else {
        await ctx.db.insert("loopMetrics", data);
      }
      metricsWritten++;
    }

    return { metricsWritten, dayKey, summary: { total, closed, broken, slaBreaches } };
  },
});

/**
 * Query: Get loop metrics for dashboard.
 */
export const getLoopDashboard = query({
  args: {
    agentName: v.optional(v.string()),
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 24;

    if (args.agentName) {
      return ctx.db
        .query("loopMetrics")
        .withIndex("by_agent_period", (q) => {
          let q2 = q.eq("agentName", args.agentName!);
          if (args.period) q2 = q2.eq("period", args.period);
          return q2;
        })
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("loopMetrics")
      .withIndex("by_period", (q) => {
        if (args.period) return q.eq("period", args.period);
        return q;
      })
      .order("desc")
      .take(limit);
  },
});

/**
 * Query: Get active loop alerts.
 */
export const getActiveAlerts = query({
  args: {
    agentName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    if (args.agentName) {
      return ctx.db
        .query("loopAlerts")
        .withIndex("by_agent", (q) =>
          q.eq("agentName", args.agentName!).eq("status", "active")
        )
        .order("desc")
        .take(limit);
    }

    return ctx.db
      .query("loopAlerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(limit);
  },
});
