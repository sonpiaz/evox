/**
 * AGT-215: Alert System — Push Notifications for Agent Events
 *
 * Alert triggers:
 * - agent_failed: Agent execution failed
 * - agent_stuck: Agent stuck >30 min on task
 * - needs_approval: Task requires human approval
 * - task_blocked: Task blocked by dependency
 * - rate_limit_hit: Agent hit rate limit
 * - kill_switch: System paused
 *
 * Channels: Telegram (P1), Slack, Email (P2), Browser (P3)
 */
import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Alert type definitions
const ALERT_TYPES = [
  "agent_failed",
  "agent_stuck",
  "needs_approval",
  "task_blocked",
  "rate_limit_hit",
  "kill_switch",
] as const;

const SEVERITY_LEVELS = ["info", "warning", "critical"] as const;
const CHANNELS = ["telegram", "email", "browser", "slack"] as const;

type AlertType = (typeof ALERT_TYPES)[number];
type Severity = (typeof SEVERITY_LEVELS)[number];
type Channel = (typeof CHANNELS)[number];

// Default severity for each alert type
const DEFAULT_SEVERITIES: Record<AlertType, Severity> = {
  agent_failed: "critical",
  agent_stuck: "warning",
  needs_approval: "warning",
  task_blocked: "info",
  rate_limit_hit: "warning",
  kill_switch: "critical",
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List recent alerts
 */
export const listAlerts = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.string()),
    severity: v.optional(v.string()),
    status: v.optional(v.string()),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let alertsQuery = ctx.db.query("alerts").withIndex("by_created");

    // Apply filters
    if (args.type) {
      alertsQuery = ctx.db
        .query("alerts")
        .withIndex("by_type", (q) => q.eq("type", args.type as AlertType));
    } else if (args.severity) {
      alertsQuery = ctx.db
        .query("alerts")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity as Severity));
    } else if (args.status) {
      alertsQuery = ctx.db
        .query("alerts")
        .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "sent" | "failed" | "snoozed"));
    } else if (args.agentName) {
      alertsQuery = ctx.db
        .query("alerts")
        .withIndex("by_agent", (q) => q.eq("agentName", args.agentName));
    }

    const alerts = await alertsQuery.order("desc").take(args.limit ?? 50);
    return alerts;
  },
});

/**
 * Get alert by ID
 */
export const getAlert = query({
  args: { id: v.id("alerts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get alert stats (counts by type, severity, status)
 */
export const getAlertStats = query({
  args: {
    since: v.optional(v.number()), // Timestamp, default 24 hours
  },
  handler: async (ctx, args) => {
    const since = args.since ?? Date.now() - 24 * 60 * 60 * 1000;

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    // Count by type
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const alert of alerts) {
      byType[alert.type] = (byType[alert.type] ?? 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
      byStatus[alert.status] = (byStatus[alert.status] ?? 0) + 1;
    }

    return {
      total: alerts.length,
      byType,
      bySeverity,
      byStatus,
      since,
    };
  },
});

/**
 * Get unacknowledged critical alerts
 */
export const getUnacknowledgedCritical = query({
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_severity", (q) => q.eq("severity", "critical"))
      .order("desc")
      .filter((q) => q.neq(q.field("acknowledged"), true))
      .take(10);

    return alerts;
  },
});

// ============================================================================
// PREFERENCES
// ============================================================================

/**
 * Get alert preferences for a target
 */
export const getPreferences = query({
  args: { target: v.string() },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("alertPreferences")
      .withIndex("by_target", (q) => q.eq("target", args.target))
      .first();

    // Return defaults if not configured
    if (!prefs) {
      return {
        target: args.target,
        enabledTypes: ALERT_TYPES,
        channels: ["telegram"] as Channel[],
        stuckThresholdMinutes: 30,
        enabled: true,
        isDefault: true,
      };
    }

    return { ...prefs, isDefault: false };
  },
});

/**
 * Update alert preferences
 */
export const updatePreferences = mutation({
  args: {
    target: v.string(),
    enabledTypes: v.optional(v.array(v.string())),
    channels: v.optional(v.array(v.string())),
    telegramChatId: v.optional(v.string()),
    email: v.optional(v.string()),
    stuckThresholdMinutes: v.optional(v.number()),
    quietHoursStart: v.optional(v.number()),
    quietHoursEnd: v.optional(v.number()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("alertPreferences")
      .withIndex("by_target", (q) => q.eq("target", args.target))
      .first();

    const updates: Partial<{
      enabledTypes: AlertType[];
      channels: Channel[];
      telegramChatId: string;
      email: string;
      stuckThresholdMinutes: number;
      quietHoursStart: number;
      quietHoursEnd: number;
      enabled: boolean;
      updatedAt: number;
    }> = { updatedAt: now };

    if (args.enabledTypes) updates.enabledTypes = args.enabledTypes as AlertType[];
    if (args.channels) updates.channels = args.channels as Channel[];
    if (args.telegramChatId !== undefined) updates.telegramChatId = args.telegramChatId;
    if (args.email !== undefined) updates.email = args.email;
    if (args.stuckThresholdMinutes !== undefined) updates.stuckThresholdMinutes = args.stuckThresholdMinutes;
    if (args.quietHoursStart !== undefined) updates.quietHoursStart = args.quietHoursStart;
    if (args.quietHoursEnd !== undefined) updates.quietHoursEnd = args.quietHoursEnd;
    if (args.enabled !== undefined) updates.enabled = args.enabled;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return { success: true, id: existing._id, action: "updated" };
    } else {
      const id = await ctx.db.insert("alertPreferences", {
        target: args.target,
        enabledTypes: (args.enabledTypes as AlertType[]) ?? [...ALERT_TYPES],
        channels: (args.channels as Channel[]) ?? ["telegram"],
        telegramChatId: args.telegramChatId,
        email: args.email,
        stuckThresholdMinutes: args.stuckThresholdMinutes ?? 30,
        quietHoursStart: args.quietHoursStart,
        quietHoursEnd: args.quietHoursEnd,
        enabled: args.enabled ?? true,
        updatedAt: now,
      });
      return { success: true, id, action: "created" };
    }
  },
});

/**
 * Snooze alerts for a target
 */
export const snoozeAlerts = mutation({
  args: {
    target: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const snoozedUntil = now + args.durationMinutes * 60 * 1000;

    const existing = await ctx.db
      .query("alertPreferences")
      .withIndex("by_target", (q) => q.eq("target", args.target))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { snoozedUntil, updatedAt: now });
    } else {
      await ctx.db.insert("alertPreferences", {
        target: args.target,
        enabledTypes: [...ALERT_TYPES],
        channels: ["telegram"],
        snoozedUntil,
        enabled: true,
        updatedAt: now,
      });
    }

    return { success: true, snoozedUntil };
  },
});

// ============================================================================
// ALERT CREATION
// ============================================================================

/**
 * Internal mutation to create an alert record
 */
export const createAlert = internalMutation({
  args: {
    type: v.string(),
    severity: v.optional(v.string()),
    channel: v.string(),
    title: v.string(),
    message: v.string(),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const severity = (args.severity as Severity) ?? DEFAULT_SEVERITIES[args.type as AlertType] ?? "info";

    const alertId = await ctx.db.insert("alerts", {
      type: args.type as AlertType,
      severity,
      channel: args.channel as Channel,
      title: args.title,
      message: args.message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
      status: "pending",
      createdAt: now,
    });

    return { alertId, severity };
  },
});

/**
 * Mark alert as sent
 */
export const markAlertSent = internalMutation({
  args: {
    alertId: v.id("alerts"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.alertId, {
      status: args.success ? "sent" : "failed",
      sentAt: args.success ? now : undefined,
      deliveryError: args.error,
    });
  },
});

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("alerts"),
    acknowledgedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.alertId, {
      acknowledged: true,
      acknowledgedBy: args.acknowledgedBy,
      acknowledgedAt: now,
    });
    return { success: true };
  },
});

// ============================================================================
// TELEGRAM INTEGRATION
// ============================================================================

/**
 * Send alert via Telegram
 */
export const sendTelegramAlert = internalAction({
  args: {
    alertId: v.id("alerts"),
    chatId: v.string(),
    title: v.string(),
    message: v.string(),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn("[Alert] TELEGRAM_BOT_TOKEN not configured");
      await ctx.runMutation(internal.alerts.markAlertSent, {
        alertId: args.alertId,
        success: false,
        error: "TELEGRAM_BOT_TOKEN not configured",
      });
      return { success: false, reason: "bot_token_not_configured" };
    }

    // Emoji based on severity
    const emoji: Record<string, string> = {
      critical: "🚨",
      warning: "⚠️",
      info: "ℹ️",
    };

    const severityEmoji = emoji[args.severity] ?? "📢";

    // Format message for Telegram (Markdown)
    const text = `${severityEmoji} *${args.title}*\n\n${args.message}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.chatId,
            text,
            parse_mode: "Markdown",
          }),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        console.error("[Alert] Telegram send failed:", result);
        await ctx.runMutation(internal.alerts.markAlertSent, {
          alertId: args.alertId,
          success: false,
          error: result.description ?? "Telegram API error",
        });
        return { success: false, reason: result.description };
      }

      await ctx.runMutation(internal.alerts.markAlertSent, {
        alertId: args.alertId,
        success: true,
      });

      console.log(`[Alert] Telegram alert sent: ${args.title}`);
      return { success: true, messageId: result.result?.message_id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Alert] Telegram send error:", error);
      await ctx.runMutation(internal.alerts.markAlertSent, {
        alertId: args.alertId,
        success: false,
        error: errorMessage,
      });
      return { success: false, reason: errorMessage };
    }
  },
});

// ============================================================================
// ALERT TRIGGERS
// ============================================================================

/**
 * Trigger alert for agent failure
 */
export const triggerAgentFailed = internalAction({
  args: {
    agentName: v.string(),
    taskId: v.optional(v.id("tasks")),
    linearIdentifier: v.optional(v.string()),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const title = `Agent ${args.agentName.toUpperCase()} Failed`;
    const message = `Task: ${args.linearIdentifier ?? "Unknown"}\nError: ${args.error}`;

    return await triggerAlert(ctx, {
      type: "agent_failed",
      title,
      message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
    });
  },
});

/**
 * Trigger alert for stuck agent (>30 min on task)
 */
export const triggerAgentStuck = internalAction({
  args: {
    agentName: v.string(),
    taskId: v.id("tasks"),
    linearIdentifier: v.optional(v.string()),
    stuckMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const title = `Agent ${args.agentName.toUpperCase()} Stuck`;
    const message = `Task: ${args.linearIdentifier ?? "Unknown"}\nStuck for: ${args.stuckMinutes} minutes`;

    return await triggerAlert(ctx, {
      type: "agent_stuck",
      title,
      message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
    });
  },
});

/**
 * Trigger alert for task needing approval
 */
export const triggerNeedsApproval = internalAction({
  args: {
    taskId: v.id("tasks"),
    linearIdentifier: v.optional(v.string()),
    taskTitle: v.string(),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = "Task Needs Approval";
    const message = `Task: ${args.linearIdentifier ?? "Unknown"}\nTitle: ${args.taskTitle}${args.agentName ? `\nAgent: ${args.agentName.toUpperCase()}` : ""}`;

    return await triggerAlert(ctx, {
      type: "needs_approval",
      title,
      message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
    });
  },
});

/**
 * Trigger alert for blocked task
 */
export const triggerTaskBlocked = internalAction({
  args: {
    taskId: v.id("tasks"),
    linearIdentifier: v.optional(v.string()),
    taskTitle: v.string(),
    blockedBy: v.optional(v.string()),
    agentName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const title = "Task Blocked";
    const message = `Task: ${args.linearIdentifier ?? "Unknown"}\nTitle: ${args.taskTitle}${args.blockedBy ? `\nBlocked by: ${args.blockedBy}` : ""}`;

    return await triggerAlert(ctx, {
      type: "task_blocked",
      title,
      message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
    });
  },
});

/**
 * Trigger alert for rate limit hit
 */
export const triggerRateLimitHit = internalAction({
  args: {
    agentName: v.string(),
    limitType: v.string(), // "hourly" | "daily" | "tokens"
    currentUsage: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const title = `Rate Limit: ${args.agentName.toUpperCase()}`;
    const message = `Limit type: ${args.limitType}\nUsage: ${args.currentUsage}/${args.limit}`;

    return await triggerAlert(ctx, {
      type: "rate_limit_hit",
      title,
      message,
      agentName: args.agentName,
    });
  },
});

/**
 * Trigger alert for kill switch activation
 */
export const triggerKillSwitch = internalAction({
  args: {
    reason: v.string(),
    triggeredBy: v.string(),
  },
  handler: async (ctx, args) => {
    const title = "🛑 KILL SWITCH ACTIVATED";
    const message = `Reason: ${args.reason}\nTriggered by: ${args.triggeredBy}`;

    return await triggerAlert(ctx, {
      type: "kill_switch",
      title,
      message,
    });
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Core alert trigger logic — checks preferences and sends via configured channels
 */
async function triggerAlert(
  ctx: { runMutation: typeof internalAction.prototype; runAction: typeof internalAction.prototype; runQuery: typeof internalAction.prototype },
  args: {
    type: AlertType;
    title: string;
    message: string;
    agentName?: string;
    taskId?: Id<"tasks">;
    linearIdentifier?: string;
  }
) {
  // Get global preferences
  const globalPrefs = await ctx.runQuery(internal.alerts.getPreferencesInternal, {
    target: "global",
  });

  // Check if alert type is enabled
  if (globalPrefs && !globalPrefs.enabledTypes.includes(args.type)) {
    console.log(`[Alert] Type ${args.type} disabled, skipping`);
    return { success: false, reason: "alert_type_disabled" };
  }

  // Check if snoozed
  if (globalPrefs?.snoozedUntil && globalPrefs.snoozedUntil > Date.now()) {
    console.log(`[Alert] Alerts snoozed until ${new Date(globalPrefs.snoozedUntil).toISOString()}`);
    return { success: false, reason: "snoozed" };
  }

  // Determine channels
  const channels = globalPrefs?.channels ?? ["telegram"];
  const results: { channel: string; success: boolean; reason?: string }[] = [];

  for (const channel of channels) {
    // Create alert record
    const { alertId, severity } = await ctx.runMutation(internal.alerts.createAlert, {
      type: args.type,
      channel,
      title: args.title,
      message: args.message,
      agentName: args.agentName,
      taskId: args.taskId,
      linearIdentifier: args.linearIdentifier,
    });

    // Send via channel
    if (channel === "telegram" && globalPrefs?.telegramChatId) {
      const result = await ctx.runAction(internal.alerts.sendTelegramAlert, {
        alertId,
        chatId: globalPrefs.telegramChatId,
        title: args.title,
        message: args.message,
        severity,
      });
      results.push({ channel, ...result });
    } else if (channel === "slack") {
      // Use existing Slack integration
      await ctx.runAction(internal.slackNotify.sendSlackNotification, {
        event: args.type === "agent_failed" ? "agent_blocked" : "task_completed",
        title: args.title,
        message: args.message,
      });
      await ctx.runMutation(internal.alerts.markAlertSent, {
        alertId,
        success: true,
      });
      results.push({ channel, success: true });
    } else {
      // Channel not configured
      await ctx.runMutation(internal.alerts.markAlertSent, {
        alertId,
        success: false,
        error: `Channel ${channel} not configured`,
      });
      results.push({ channel, success: false, reason: `${channel}_not_configured` });
    }
  }

  const anySuccess = results.some((r) => r.success);
  return { success: anySuccess, results };
}

/**
 * Internal query for preferences (used in actions)
 */
export const getPreferencesInternal = query({
  args: { target: v.string() },
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("alertPreferences")
      .withIndex("by_target", (q) => q.eq("target", args.target))
      .first();

    if (!prefs) {
      return {
        target: args.target,
        enabledTypes: [...ALERT_TYPES] as AlertType[],
        channels: ["telegram"] as Channel[],
        stuckThresholdMinutes: 30,
        enabled: true,
      };
    }

    return prefs;
  },
});

// ============================================================================
// CRON: CHECK FOR STUCK AGENTS
// ============================================================================

/**
 * Check for agents stuck on tasks for too long
 * Called by cron every 5 minutes
 */
export const checkStuckAgents = internalAction({
  handler: async (ctx) => {
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes default

    // Get all agents with in_progress tasks
    const agents = await ctx.runQuery(internal.alerts.getAgentsWithInProgressTasks);

    const alerts: string[] = [];

    for (const agent of agents) {
      if (!agent.task) continue;

      const taskDuration = now - (agent.task.updatedAt ?? agent.task.createdAt);

      if (taskDuration > STUCK_THRESHOLD_MS) {
        const stuckMinutes = Math.round(taskDuration / 60000);

        await ctx.runAction(internal.alerts.triggerAgentStuck, {
          agentName: agent.name.toLowerCase(),
          taskId: agent.task._id,
          linearIdentifier: agent.task.linearIdentifier,
          stuckMinutes,
        });

        alerts.push(`${agent.name}: stuck ${stuckMinutes}min on ${agent.task.linearIdentifier}`);
      }
    }

    console.log(`[Alert] Stuck agent check: ${alerts.length} alerts triggered`);
    return { checked: agents.length, alerts };
  },
});

/**
 * Query to get agents with in-progress tasks (for stuck detection)
 */
export const getAgentsWithInProgressTasks = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const result: {
      name: string;
      task: {
        _id: Id<"tasks">;
        linearIdentifier?: string;
        updatedAt: number;
        createdAt: number;
      } | null;
    }[] = [];

    for (const agent of agents) {
      if (!agent.currentTask) {
        result.push({ name: agent.name, task: null });
        continue;
      }

      const task = await ctx.db.get(agent.currentTask);
      if (task && task.status === "in_progress") {
        result.push({
          name: agent.name,
          task: {
            _id: task._id,
            linearIdentifier: task.linearIdentifier,
            updatedAt: task.updatedAt,
            createdAt: task.createdAt,
          },
        });
      } else {
        result.push({ name: agent.name, task: null });
      }
    }

    return result;
  },
});
