/**
 * CORE-209: The Loop — SLA Monitor
 * AGT-337 P4: Auto-Escalation & Enforcement
 *
 * Runs every 5 minutes. Checks active loops for SLA breaches:
 * - SEEN but not REPLIED > 15 min → escalate to MAX via DM
 * - REPLIED but not ACTED > 2 hours → escalate to MAX (critical)
 * - ACTED but not REPORTED > 24 hours → mark broken + escalate to CEO via dispatch
 */

import { internalMutation } from "./_generated/server";
import { MessageStatus } from "./messageStatus";
import { resolveAgentNameById } from "./agentMappings";

export const checkSLABreaches = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    let alertsCreated = 0;
    let escalationsCreated = 0;

    // 1. SEEN but not REPLIED > 15 min → notify MAX
    const seenMessages = await ctx.db
      .query("agentMessages")
      .withIndex("by_statusCode", (q) => q.eq("statusCode", MessageStatus.SEEN))
      .collect();

    for (const msg of seenMessages) {
      if (msg.loopBroken) continue;
      if (!msg.expectedReplyBy || now <= msg.expectedReplyBy) continue;

      const existing = await ctx.db
        .query("loopAlerts")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("alertType"), "reply_overdue"),
            q.or(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("status"), "escalated")
            )
          )
        )
        .first();

      if (existing) continue;

      const agentName = await resolveAgentNameById(ctx.db, msg.to);
      const overdueMin = Math.round((now - msg.expectedReplyBy) / 60_000);

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName,
        alertType: "reply_overdue",
        severity: "warning",
        status: "escalated",
        escalatedTo: "max",
        createdAt: now,
      });
      alertsCreated++;

      // AGT-337: Auto-escalate — notify MAX
      await ctx.db.insert("unifiedMessages", {
        fromAgent: "system",
        toAgent: "max",
        content: `SLA BREACH: ${agentName.toUpperCase()} has not replied for ${overdueMin} min (SLA: 15 min). Message: ${msg._id}`,
        type: "system",
        priority: "normal",
        read: false,
        createdAt: now,
      });
      escalationsCreated++;
    }

    // 2. REPLIED but not ACTED > 2 hours → critical escalation to MAX
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
            q.or(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("status"), "escalated")
            )
          )
        )
        .first();

      if (existing) continue;

      const agentName = await resolveAgentNameById(ctx.db, msg.to);
      const overdueH = Math.round((now - msg.expectedActionBy) / 3_600_000 * 10) / 10;

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName,
        alertType: "action_overdue",
        severity: "critical",
        status: "escalated",
        escalatedTo: "max",
        createdAt: now,
      });
      alertsCreated++;

      // AGT-337: Auto-escalate — critical DM to MAX
      await ctx.db.insert("unifiedMessages", {
        fromAgent: "system",
        toAgent: "max",
        content: `CRITICAL SLA BREACH: ${agentName.toUpperCase()} replied but has not acted for ${overdueH}h (SLA: 2h). Message: ${msg._id}`,
        type: "system",
        priority: "urgent",
        read: false,
        createdAt: now,
      });
      escalationsCreated++;
    }

    // 3. ACTED but not REPORTED > 24 hours → mark broken + escalate to CEO
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
            q.or(
              q.eq(q.field("status"), "active"),
              q.eq(q.field("status"), "escalated")
            )
          )
        )
        .first();

      if (existing) continue;

      const agentName = await resolveAgentNameById(ctx.db, msg.to);

      // Mark loop as broken
      await ctx.db.patch(msg._id, {
        loopBroken: true,
        loopBrokenReason: "Report SLA breached (>24h). Auto-marked broken by system.",
      });

      await ctx.db.insert("loopAlerts", {
        messageId: msg._id,
        agentName,
        alertType: "report_overdue",
        severity: "critical",
        status: "escalated",
        escalatedTo: "ceo",
        createdAt: now,
      });
      alertsCreated++;

      // AGT-337: Create dispatch for MAX to handle broken loop
      const maxMapping = await ctx.db
        .query("agentMappings")
        .withIndex("by_name", (q) => q.eq("name", "max"))
        .first();

      if (maxMapping) {
        await ctx.db.insert("dispatches", {
          agentId: maxMapping.convexAgentId,
          command: "escalate_broken_loop",
          payload: JSON.stringify({
            messageId: String(msg._id),
            agentName,
            reason: "Report SLA breached (>24h). Loop marked broken.",
          }),
          status: "pending",
          priority: 1,
          createdAt: now,
        });
      }

      // Notify CEO via unified message
      await ctx.db.insert("unifiedMessages", {
        fromAgent: "system",
        toAgent: "son",
        content: `LOOP BROKEN: ${agentName.toUpperCase()} failed to report within 24h. Loop auto-marked broken. Message: ${msg._id}`,
        type: "system",
        priority: "urgent",
        read: false,
        createdAt: now,
      });
      escalationsCreated++;
    }

    return { alertsCreated, escalationsCreated, checkedAt: now };
  },
});
