/**
 * CORE-209: The Loop — SLA Monitor
 *
 * Runs every 5 minutes. Checks active loops for SLA breaches:
 * - SEEN but not REPLIED > 15 min → warning alert
 * - REPLIED but not ACTED > 2 hours → critical alert + escalate to MAX
 * - ACTED but not REPORTED > 24 hours → critical alert + escalate to CEO
 */

import { internalMutation } from "./_generated/server";
import { MessageStatus } from "./messageStatus";

export const checkSLABreaches = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    let alertsCreated = 0;

    // 1. SEEN but not REPLIED > 15 min
    const seenMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_statusCode", (q) => q.eq("statusCode", MessageStatus.SEEN))
      .collect();

    for (const msg of seenMessages) {
      if (msg.loopBroken) continue;
      if (!msg.expectedReplyBy || now <= msg.expectedReplyBy) continue;

      // Check if alert already exists for this message + type
      const existing = await ctx.db
        .query("loopAlerts")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("alertType"), "reply_overdue"),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName: String(msg.to),
        alertType: "reply_overdue",
        severity: "warning",
        status: "active",
        createdAt: now,
      });
      alertsCreated++;
    }

    // 2. REPLIED but not ACTED > 2 hours
    const repliedMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_statusCode", (q) => q.eq("statusCode", MessageStatus.REPLIED))
      .collect();

    for (const msg of repliedMessages) {
      if (msg.loopBroken) continue;
      if (!msg.expectedActionBy || now <= msg.expectedActionBy) continue;

      const existing = await ctx.db
        .query("loopAlerts")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("alertType"), "action_overdue"),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName: String(msg.to),
        alertType: "action_overdue",
        severity: "critical",
        status: "escalated",
        escalatedTo: "max",
        createdAt: now,
      });
      alertsCreated++;
    }

    // 3. ACTED but not REPORTED > 24 hours
    const actedMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_statusCode", (q) => q.eq("statusCode", MessageStatus.ACTED))
      .collect();

    for (const msg of actedMessages) {
      if (msg.loopBroken) continue;
      if (!msg.expectedReportBy || now <= msg.expectedReportBy) continue;

      const existing = await ctx.db
        .query("loopAlerts")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("alertType"), "report_overdue"),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (existing) continue;

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName: String(msg.to),
        alertType: "report_overdue",
        severity: "critical",
        status: "escalated",
        escalatedTo: "ceo",
        createdAt: now,
      });
      alertsCreated++;
    }

    return { alertsCreated, checkedAt: now };
  },
});
