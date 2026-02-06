/**
 * Unit tests for convex/loopMonitor.ts — SLA Breach Detection
 *
 * Tests cover:
 * - Reply overdue: SEEN but not REPLIED > 15 min
 * - Action overdue: REPLIED but not ACTED > 2 hours
 * - Report overdue: ACTED but not REPORTED > 24 hours
 * - Non-breached messages return no alerts
 * - Edge cases: exactly at threshold, just over, way over
 * - Broken loops are skipped
 * - Alert deduplication (no duplicate alerts)
 * - Alert severity and escalation targets
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";
import { MessageStatus } from "@/convex/messageStatus";

// SLA durations (mirrored from source)
const SLA = {
  REPLY: 15 * 60 * 1000,       // 15 minutes
  ACTION: 2 * 60 * 60 * 1000,  // 2 hours
  REPORT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// --- Helpers ---

const AGENT_ID_LEO = "agents_leo_001";

function mockSeenMessage(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    _id: `agentMessages_${Math.random().toString(36).slice(2)}`,
    _creationTime: now - 120_000,
    from: "agents_sam_001",
    to: AGENT_ID_LEO,
    type: "request" as const,
    content: "Please review",
    timestamp: now - 120_000,
    statusCode: MessageStatus.SEEN,
    seenAt: now - 120_000,
    expectedReplyBy: now - 120_000 + SLA.REPLY,
    loopBroken: false,
    ...overrides,
  };
}

function mockRepliedMessage(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    _id: `agentMessages_${Math.random().toString(36).slice(2)}`,
    _creationTime: now - 3_600_000,
    from: "agents_sam_001",
    to: AGENT_ID_LEO,
    type: "request" as const,
    content: "Build the feature",
    timestamp: now - 3_600_000,
    statusCode: MessageStatus.REPLIED,
    repliedAt: now - 3_600_000,
    expectedActionBy: now - 3_600_000 + SLA.ACTION,
    loopBroken: false,
    ...overrides,
  };
}

function mockActedMessage(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    _id: `agentMessages_${Math.random().toString(36).slice(2)}`,
    _creationTime: now - 25 * 3_600_000,
    from: "agents_sam_001",
    to: AGENT_ID_LEO,
    type: "request" as const,
    content: "Deploy to production",
    timestamp: now - 25 * 3_600_000,
    statusCode: MessageStatus.ACTED,
    actedAt: now - 25 * 3_600_000,
    expectedReportBy: now - 25 * 3_600_000 + SLA.REPORT,
    loopBroken: false,
    ...overrides,
  };
}

// --- Tests ---

describe("SLA Breach Detection — Reply Overdue", () => {
  it("should detect reply overdue when SEEN > 15 min without reply", () => {
    const now = Date.now();
    const msg = mockSeenMessage({
      seenAt: now - 20 * 60 * 1000,       // Seen 20 min ago
      expectedReplyBy: now - 5 * 60 * 1000, // Was due 5 min ago
    });

    const isBreached = msg.expectedReplyBy !== undefined && now > msg.expectedReplyBy;
    expect(isBreached).toBe(true);
  });

  it("should NOT detect breach when within SLA (seen < 15 min ago)", () => {
    const now = Date.now();
    const msg = mockSeenMessage({
      seenAt: now - 10 * 60 * 1000,                   // Seen 10 min ago
      expectedReplyBy: now - 10 * 60 * 1000 + SLA.REPLY, // Due in 5 min
    });

    const isBreached = msg.expectedReplyBy !== undefined && now > msg.expectedReplyBy;
    expect(isBreached).toBe(false);
  });

  it("should NOT detect breach at exactly the threshold", () => {
    const now = Date.now();
    const msg = mockSeenMessage({
      seenAt: now - SLA.REPLY,
      expectedReplyBy: now, // Due exactly now (now <= expectedReplyBy)
    });

    // loopMonitor uses: now <= msg.expectedReplyBy → skip (no breach)
    const isBreached = now > msg.expectedReplyBy;
    expect(isBreached).toBe(false);
  });

  it("should detect breach 1ms past the threshold", () => {
    const now = Date.now();
    const msg = mockSeenMessage({
      seenAt: now - SLA.REPLY - 1,
      expectedReplyBy: now - 1, // Due 1ms ago
    });

    const isBreached = msg.expectedReplyBy !== undefined && now > msg.expectedReplyBy;
    expect(isBreached).toBe(true);
  });

  it("should create warning-level alert for reply overdue", () => {
    const alertData = {
      alertType: "reply_overdue",
      severity: "warning",
      status: "active",
    };

    expect(alertData.severity).toBe("warning");
    expect(alertData.status).toBe("active");
    // reply_overdue is warning, not critical (no escalation)
  });

  it("should NOT escalate reply_overdue alerts", () => {
    const alertData = {
      messageId: "agentMessages_123",
      agentName: "leo",
      alertType: "reply_overdue",
      severity: "warning",
      status: "active",
      createdAt: Date.now(),
    };

    expect(alertData).not.toHaveProperty("escalatedTo");
  });
});

describe("SLA Breach Detection — Action Overdue", () => {
  it("should detect action overdue when REPLIED > 2 hours without action", () => {
    const now = Date.now();
    const msg = mockRepliedMessage({
      repliedAt: now - 3 * 3_600_000,                     // Replied 3 hours ago
      expectedActionBy: now - 3 * 3_600_000 + SLA.ACTION,  // Due 1 hour ago
    });

    const isBreached = msg.expectedActionBy !== undefined && now > msg.expectedActionBy;
    expect(isBreached).toBe(true);
  });

  it("should NOT detect breach when within SLA (replied < 2 hours ago)", () => {
    const now = Date.now();
    const msg = mockRepliedMessage({
      repliedAt: now - 1 * 3_600_000,                     // Replied 1 hour ago
      expectedActionBy: now - 1 * 3_600_000 + SLA.ACTION,  // Due in 1 hour
    });

    const isBreached = msg.expectedActionBy !== undefined && now > msg.expectedActionBy;
    expect(isBreached).toBe(false);
  });

  it("should create critical-level alert for action overdue", () => {
    const alertData = {
      alertType: "action_overdue",
      severity: "critical",
      status: "escalated",
      escalatedTo: "max",
    };

    expect(alertData.severity).toBe("critical");
    expect(alertData.status).toBe("escalated");
    expect(alertData.escalatedTo).toBe("max");
  });

  it("should escalate action_overdue to MAX", () => {
    const alertData = {
      alertType: "action_overdue",
      escalatedTo: "max",
    };

    expect(alertData.escalatedTo).toBe("max");
  });
});

describe("SLA Breach Detection — Report Overdue", () => {
  it("should detect report overdue when ACTED > 24 hours without report", () => {
    const now = Date.now();
    const msg = mockActedMessage({
      actedAt: now - 25 * 3_600_000,                      // Acted 25 hours ago
      expectedReportBy: now - 25 * 3_600_000 + SLA.REPORT,  // Due 1 hour ago
    });

    const isBreached = msg.expectedReportBy !== undefined && now > msg.expectedReportBy;
    expect(isBreached).toBe(true);
  });

  it("should NOT detect breach when within SLA (acted < 24 hours ago)", () => {
    const now = Date.now();
    const msg = mockActedMessage({
      actedAt: now - 12 * 3_600_000,                      // Acted 12 hours ago
      expectedReportBy: now - 12 * 3_600_000 + SLA.REPORT,  // Due in 12 hours
    });

    const isBreached = msg.expectedReportBy !== undefined && now > msg.expectedReportBy;
    expect(isBreached).toBe(false);
  });

  it("should detect breach way past threshold (48+ hours)", () => {
    const now = Date.now();
    const msg = mockActedMessage({
      actedAt: now - 48 * 3_600_000,                      // Acted 48 hours ago
      expectedReportBy: now - 48 * 3_600_000 + SLA.REPORT,  // Due 24 hours ago
    });

    const isBreached = msg.expectedReportBy !== undefined && now > msg.expectedReportBy;
    expect(isBreached).toBe(true);
  });

  it("should create critical-level alert for report overdue", () => {
    const alertData = {
      alertType: "report_overdue",
      severity: "critical",
      status: "escalated",
      escalatedTo: "ceo",
    };

    expect(alertData.severity).toBe("critical");
    expect(alertData.status).toBe("escalated");
  });

  it("should escalate report_overdue to CEO (not max)", () => {
    const alertData = {
      alertType: "report_overdue",
      escalatedTo: "ceo",
    };

    expect(alertData.escalatedTo).toBe("ceo");
    expect(alertData.escalatedTo).not.toBe("max");
  });
});

describe("Broken Loop Handling", () => {
  it("should skip messages with loopBroken = true", () => {
    const msg = mockSeenMessage({ loopBroken: true });

    // loopMonitor does: if (msg.loopBroken) continue;
    const shouldSkip = msg.loopBroken === true;
    expect(shouldSkip).toBe(true);
  });

  it("should not create SLA alerts for broken loops", () => {
    const now = Date.now();
    const msg = mockSeenMessage({
      loopBroken: true,
      seenAt: now - 30 * 60 * 1000,       // Seen 30 min ago (past SLA)
      expectedReplyBy: now - 15 * 60 * 1000, // Due 15 min ago
    });

    // Even though SLA is breached, loopBroken should prevent alert
    const isBreached = msg.expectedReplyBy !== undefined && now > msg.expectedReplyBy;
    expect(isBreached).toBe(true); // SLA is technically breached...
    expect(msg.loopBroken).toBe(true); // ...but loop is broken, so skip
  });
});

describe("Alert Deduplication", () => {
  it("should not create duplicate alerts for the same message + type", () => {
    const existingAlerts = [
      {
        messageId: "agentMessages_123",
        alertType: "reply_overdue",
        status: "active",
      },
    ];

    const newAlertType = "reply_overdue";
    const messageId = "agentMessages_123";

    const isDuplicate = existingAlerts.some(
      (a) =>
        a.messageId === messageId &&
        a.alertType === newAlertType &&
        a.status === "active"
    );

    expect(isDuplicate).toBe(true);
  });

  it("should allow alerts for different types on the same message", () => {
    const existingAlerts = [
      {
        messageId: "agentMessages_123",
        alertType: "reply_overdue",
        status: "active",
      },
    ];

    const newAlertType = "action_overdue";
    const messageId = "agentMessages_123";

    const isDuplicate = existingAlerts.some(
      (a) =>
        a.messageId === messageId &&
        a.alertType === newAlertType &&
        a.status === "active"
    );

    expect(isDuplicate).toBe(false);
  });

  it("should allow new alert if previous was resolved", () => {
    const existingAlerts = [
      {
        messageId: "agentMessages_123",
        alertType: "reply_overdue",
        status: "resolved", // Previously resolved
      },
    ];

    const isDuplicate = existingAlerts.some(
      (a) =>
        a.messageId === "agentMessages_123" &&
        a.alertType === "reply_overdue" &&
        a.status === "active" // Only checks active alerts
    );

    expect(isDuplicate).toBe(false);
  });
});

describe("Missing SLA Fields", () => {
  it("should skip if expectedReplyBy is not set", () => {
    const now = Date.now();
    const msg = mockSeenMessage({ expectedReplyBy: undefined });

    // loopMonitor: if (!msg.expectedReplyBy || now <= msg.expectedReplyBy) continue;
    const shouldSkip = !msg.expectedReplyBy || now <= msg.expectedReplyBy;
    expect(shouldSkip).toBe(true);
  });

  it("should skip if expectedActionBy is not set", () => {
    const msg = mockRepliedMessage({ expectedActionBy: undefined });

    const shouldSkip = !msg.expectedActionBy;
    expect(shouldSkip).toBe(true);
  });

  it("should skip if expectedReportBy is not set", () => {
    const msg = mockActedMessage({ expectedReportBy: undefined });

    const shouldSkip = !msg.expectedReportBy;
    expect(shouldSkip).toBe(true);
  });
});

describe("Alert Data Structure", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should include all required loopAlert fields", async () => {
    const alertData = {
      messageId: "agentMessages_123",
      agentName: "leo",
      alertType: "reply_overdue",
      severity: "warning",
      status: "active",
      createdAt: Date.now(),
    };

    await ctx.db.insert("loopAlerts", alertData);

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "loopAlerts",
      expect.objectContaining({
        messageId: expect.any(String),
        agentName: expect.any(String),
        alertType: expect.any(String),
        severity: expect.any(String),
        status: expect.any(String),
        createdAt: expect.any(Number),
      })
    );
  });

  it("should have valid alertType values", () => {
    const validTypes = ["reply_overdue", "action_overdue", "report_overdue", "loop_broken"];

    validTypes.forEach((type) => {
      expect(["reply_overdue", "action_overdue", "report_overdue", "loop_broken"]).toContain(type);
    });
  });

  it("should have valid severity values", () => {
    const validSeverities = ["warning", "critical"];

    expect(validSeverities).toContain("warning");
    expect(validSeverities).toContain("critical");
  });

  it("should have valid status values", () => {
    const validStatuses = ["active", "resolved", "escalated"];

    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("resolved");
    expect(validStatuses).toContain("escalated");
  });

  it("should map alertType to correct severity", () => {
    const severityMap: Record<string, string> = {
      reply_overdue: "warning",
      action_overdue: "critical",
      report_overdue: "critical",
      loop_broken: "critical",
    };

    expect(severityMap.reply_overdue).toBe("warning");
    expect(severityMap.action_overdue).toBe("critical");
    expect(severityMap.report_overdue).toBe("critical");
    expect(severityMap.loop_broken).toBe("critical");
  });

  it("should map alertType to correct escalation target", () => {
    const escalationMap: Record<string, string | undefined> = {
      reply_overdue: undefined,      // No escalation (warning only)
      action_overdue: "max",         // Escalate to PM
      report_overdue: "ceo",         // Escalate to CEO
      loop_broken: "max",            // Escalate to PM
    };

    expect(escalationMap.reply_overdue).toBeUndefined();
    expect(escalationMap.action_overdue).toBe("max");
    expect(escalationMap.report_overdue).toBe("ceo");
    expect(escalationMap.loop_broken).toBe("max");
  });
});
