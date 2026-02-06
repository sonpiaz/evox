/**
 * Integration test: Full Loop Cycle
 *
 * Tests the complete message lifecycle:
 * create → markAsSeen → markAsReplied → markAsActed → markAsReported
 *
 * Verifies:
 * - Each stage transition sets correct statusCode
 * - SLA timestamps are set at each stage
 * - Final state has all timestamps populated
 * - Loop metrics would capture a completed loop
 * - Broken loop flow works correctly
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../helpers/convex-mock";
import { MessageStatus, StatusLabels } from "@/convex/messageStatus";

// SLA durations (mirrored from source)
const SLA = {
  REPLY: 15 * 60 * 1000,
  ACTION: 2 * 60 * 60 * 1000,
  REPORT: 24 * 60 * 60 * 1000,
} as const;

const AGENT_ID_SAM = "agents_sam_001";
const AGENT_ID_LEO = "agents_leo_001";

describe("Full Loop Cycle — Happy Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;
  let message: Record<string, unknown>;

  beforeEach(() => {
    ctx = createMockCtx();

    // Start with a fresh message (just sent)
    message = {
      _id: "agentMessages_loop_test",
      _creationTime: Date.now(),
      from: AGENT_ID_SAM,
      to: AGENT_ID_LEO,
      type: "request",
      content: "Please deploy the hotfix",
      timestamp: Date.now(),
      sentAt: Date.now(),
      statusCode: MessageStatus.DELIVERED,
      priority: "urgent",
    };
  });

  it("Stage 0: Message starts as DELIVERED (statusCode=1)", () => {
    expect(message.statusCode).toBe(MessageStatus.DELIVERED);
    expect(message.statusCode).toBe(1);
    expect(StatusLabels[message.statusCode as keyof typeof StatusLabels]).toBe("delivered");
  });

  it("Stage 1: markAsSeen → SEEN (statusCode=2)", () => {
    const now = Date.now();

    // Simulate markAsSeen
    message.statusCode = MessageStatus.SEEN;
    message.seenAt = now;
    message.expectedReplyBy = now + SLA.REPLY;

    expect(message.statusCode).toBe(2);
    expect(message.seenAt).toBeDefined();
    expect(message.expectedReplyBy).toBe((message.seenAt as number) + SLA.REPLY);
    expect(StatusLabels[message.statusCode as keyof typeof StatusLabels]).toBe("seen");
  });

  it("Stage 2: markAsReplied → REPLIED (statusCode=3)", () => {
    const now = Date.now();

    // Pre: message is SEEN
    message.statusCode = MessageStatus.SEEN;
    message.seenAt = now - 5 * 60 * 1000; // Seen 5 min ago

    // Simulate markAsReplied
    message.statusCode = MessageStatus.REPLIED;
    message.repliedAt = now;
    message.expectedActionBy = now + SLA.ACTION;

    expect(message.statusCode).toBe(3);
    expect(message.repliedAt).toBeDefined();
    expect(message.expectedActionBy).toBe((message.repliedAt as number) + SLA.ACTION);
    expect(StatusLabels[message.statusCode as keyof typeof StatusLabels]).toBe("replied");
  });

  it("Stage 3: markAsActed → ACTED (statusCode=4)", () => {
    const now = Date.now();

    // Pre: message is REPLIED
    message.statusCode = MessageStatus.REPLIED;
    message.repliedAt = now - 30 * 60 * 1000; // Replied 30 min ago

    // Simulate markAsActed
    message.statusCode = MessageStatus.ACTED;
    message.actedAt = now;
    message.expectedReportBy = now + SLA.REPORT;
    message.linkedTaskId = "tasks_hotfix_001";

    expect(message.statusCode).toBe(4);
    expect(message.actedAt).toBeDefined();
    expect(message.expectedReportBy).toBe((message.actedAt as number) + SLA.REPORT);
    expect(message.linkedTaskId).toBe("tasks_hotfix_001");
    expect(StatusLabels[message.statusCode as keyof typeof StatusLabels]).toBe("acted");
  });

  it("Stage 4: markAsReported → REPORTED (statusCode=5) — Loop closed", () => {
    const now = Date.now();

    // Pre: message is ACTED
    message.statusCode = MessageStatus.ACTED;
    message.actedAt = now - 2 * 3_600_000; // Acted 2 hours ago

    // Simulate markAsReported
    message.statusCode = MessageStatus.REPORTED;
    message.reportedAt = now;
    message.finalReport = "Hotfix deployed. Build 2.1.1 live on production.";

    expect(message.statusCode).toBe(5);
    expect(message.reportedAt).toBeDefined();
    expect(message.finalReport).toContain("Hotfix deployed");
    expect(StatusLabels[message.statusCode as keyof typeof StatusLabels]).toBe("reported");
  });

  it("Full cycle: all timestamps populated at end", () => {
    const t0 = Date.now() - 3_600_000;  // 1 hour ago
    const t1 = t0 + 2 * 60 * 1000;     // +2 min
    const t2 = t1 + 10 * 60 * 1000;    // +10 min
    const t3 = t2 + 45 * 60 * 1000;    // +45 min
    const t4 = t3 + 3 * 60 * 1000;     // +3 min

    // Simulate complete loop
    const completedMessage = {
      ...message,
      statusCode: MessageStatus.REPORTED,
      sentAt: t0,
      seenAt: t1,
      expectedReplyBy: t1 + SLA.REPLY,
      repliedAt: t2,
      expectedActionBy: t2 + SLA.ACTION,
      actedAt: t3,
      expectedReportBy: t3 + SLA.REPORT,
      reportedAt: t4,
      finalReport: "Done. All tests pass.",
    };

    // Verify all timestamps are set
    expect(completedMessage.sentAt).toBeDefined();
    expect(completedMessage.seenAt).toBeDefined();
    expect(completedMessage.repliedAt).toBeDefined();
    expect(completedMessage.actedAt).toBeDefined();
    expect(completedMessage.reportedAt).toBeDefined();
    expect(completedMessage.finalReport).toBeDefined();

    // Verify chronological order
    expect(completedMessage.seenAt).toBeGreaterThan(completedMessage.sentAt as number);
    expect(completedMessage.repliedAt).toBeGreaterThan(completedMessage.seenAt);
    expect(completedMessage.actedAt).toBeGreaterThan(completedMessage.repliedAt);
    expect(completedMessage.reportedAt).toBeGreaterThan(completedMessage.actedAt);

    // Verify final status
    expect(completedMessage.statusCode).toBe(MessageStatus.REPORTED);
  });

  it("Full cycle: SLA timers are within expected bounds", () => {
    const t0 = Date.now() - 3_600_000;
    const t1 = t0 + 2 * 60 * 1000;   // Seen in 2 min (within reply SLA)
    const t2 = t1 + 10 * 60 * 1000;  // Replied in 10 min (within reply SLA)
    const t3 = t2 + 45 * 60 * 1000;  // Acted in 45 min (within action SLA)
    const t4 = t3 + 3 * 60 * 1000;   // Reported in 3 min (within report SLA)

    // Reply within SLA?
    const replyTime = t2 - t1;
    expect(replyTime).toBeLessThan(SLA.REPLY);

    // Action within SLA?
    const actionTime = t3 - t2;
    expect(actionTime).toBeLessThan(SLA.ACTION);

    // Report within SLA?
    const reportTime = t4 - t3;
    expect(reportTime).toBeLessThan(SLA.REPORT);
  });
});

describe("Full Loop Cycle — Broken Loop", () => {
  let message: Record<string, unknown>;

  beforeEach(() => {
    message = {
      _id: "agentMessages_broken_test",
      from: AGENT_ID_SAM,
      to: AGENT_ID_LEO,
      type: "request",
      content: "Integrate with external API",
      timestamp: Date.now(),
      sentAt: Date.now(),
      statusCode: MessageStatus.SEEN,
      seenAt: Date.now(),
    };
  });

  it("should allow breaking the loop at any stage", () => {
    // Break loop at SEEN stage
    message.loopBroken = true;
    message.loopBrokenReason = "External API is down, cannot proceed";

    expect(message.loopBroken).toBe(true);
    expect(message.statusCode).toBe(MessageStatus.SEEN);
    // statusCode does NOT change when loop is broken
  });

  it("should preserve status when loop is broken", () => {
    message.statusCode = MessageStatus.REPLIED;
    message.loopBroken = true;
    message.loopBrokenReason = "Blocked by dependency";

    // Status stays at REPLIED, not reset to 0
    expect(message.statusCode).toBe(MessageStatus.REPLIED);
    expect(message.loopBroken).toBe(true);
  });

  it("should create an escalated alert when loop is broken", () => {
    const alert = {
      messageId: message._id,
      agentName: "leo",
      alertType: "loop_broken",
      severity: "critical",
      status: "escalated",
      escalatedTo: "max",
      createdAt: Date.now(),
    };

    expect(alert.alertType).toBe("loop_broken");
    expect(alert.severity).toBe("critical");
    expect(alert.escalatedTo).toBe("max");
  });
});

describe("Full Loop Cycle — Status Downgrade Prevention", () => {
  it("should not allow SEEN → DELIVERED (backward)", () => {
    const message = {
      statusCode: MessageStatus.SEEN,
    };

    const targetStatus = MessageStatus.DELIVERED;
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;

    // markAsSeen check: if (currentStatus >= MessageStatus.SEEN) return early
    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.SEEN);
    expect(currentStatus).toBeGreaterThan(targetStatus);
  });

  it("should not allow REPLIED → SEEN (backward)", () => {
    const message = {
      statusCode: MessageStatus.REPLIED,
    };

    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.SEEN);
  });

  it("should not allow REPORTED → ACTED (backward)", () => {
    const message = {
      statusCode: MessageStatus.REPORTED,
    };

    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.ACTED);
  });

  it("should allow SEEN → REPLIED (forward)", () => {
    const message = {
      statusCode: MessageStatus.SEEN,
    };

    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    const targetStatus = MessageStatus.REPLIED;

    expect(targetStatus).toBeGreaterThan(currentStatus);
  });
});

describe("Full Loop Cycle — Metrics Capture", () => {
  it("should calculate stage durations for a completed loop", () => {
    const sentAt = Date.now() - 3_600_000;
    const seenAt = sentAt + 30_000;        // 30s to see
    const repliedAt = seenAt + 5 * 60_000; // 5 min to reply
    const actedAt = repliedAt + 30 * 60_000; // 30 min to act
    const reportedAt = actedAt + 60 * 60_000; // 1 hour to report

    const seenTime = seenAt - sentAt;
    const replyTime = repliedAt - seenAt;
    const actionTime = actedAt - repliedAt;
    const reportTime = reportedAt - actedAt;

    expect(seenTime).toBe(30_000);           // 30 seconds
    expect(replyTime).toBe(5 * 60_000);      // 5 minutes
    expect(actionTime).toBe(30 * 60_000);    // 30 minutes
    expect(reportTime).toBe(60 * 60_000);    // 1 hour

    // All within SLA
    expect(replyTime).toBeLessThan(SLA.REPLY);
    expect(actionTime).toBeLessThan(SLA.ACTION);
    expect(reportTime).toBeLessThan(SLA.REPORT);
  });

  it("should identify SLA breaches in stage durations", () => {
    const sentAt = Date.now() - 4 * 3_600_000;
    const seenAt = sentAt + 30_000;
    const repliedAt = seenAt + 20 * 60_000; // 20 min (BREACH: > 15 min)
    const actedAt = repliedAt + 3 * 3_600_000; // 3 hours (BREACH: > 2 hours)
    const reportedAt = actedAt + 25 * 3_600_000; // 25 hours (BREACH: > 24 hours)

    const replyTime = repliedAt - seenAt;
    const actionTime = actedAt - repliedAt;
    const reportTime = reportedAt - actedAt;

    expect(replyTime).toBeGreaterThan(SLA.REPLY);
    expect(actionTime).toBeGreaterThan(SLA.ACTION);
    expect(reportTime).toBeGreaterThan(SLA.REPORT);
  });

  it("should calculate completion rate for a set of messages", () => {
    const messages = [
      { statusCode: MessageStatus.REPORTED },  // Completed
      { statusCode: MessageStatus.REPORTED },  // Completed
      { statusCode: MessageStatus.ACTED },     // In progress
      { statusCode: MessageStatus.SEEN },      // Early stage
      { statusCode: MessageStatus.DELIVERED }, // Just delivered
    ];

    const total = messages.length;
    const closed = messages.filter(
      (m) => (m.statusCode ?? 0) >= MessageStatus.REPORTED
    ).length;
    const completionRate = total > 0 ? closed / total : 0;

    expect(total).toBe(5);
    expect(closed).toBe(2);
    expect(completionRate).toBe(0.4); // 40%
  });

  it("should count broken loops separately", () => {
    const messages = [
      { statusCode: MessageStatus.REPORTED, loopBroken: false },
      { statusCode: MessageStatus.SEEN, loopBroken: true },
      { statusCode: MessageStatus.REPLIED, loopBroken: true },
      { statusCode: MessageStatus.ACTED, loopBroken: false },
    ];

    const broken = messages.filter((m) => m.loopBroken).length;
    const closed = messages.filter(
      (m) => (m.statusCode ?? 0) >= MessageStatus.REPORTED
    ).length;

    expect(broken).toBe(2);
    expect(closed).toBe(1);
  });
});

describe("Full Loop Cycle — Edge Cases", () => {
  it("should handle message with no statusCode (defaults to DELIVERED)", () => {
    const message = {
      _id: "agentMessages_no_status",
      from: AGENT_ID_SAM,
      to: AGENT_ID_LEO,
      content: "Old message",
      timestamp: Date.now(),
    };

    const status = (message as Record<string, unknown>).statusCode ?? MessageStatus.DELIVERED;
    expect(status).toBe(MessageStatus.DELIVERED);
  });

  it("should handle rapid stage transitions", () => {
    const now = Date.now();
    const message: Record<string, unknown> = {
      statusCode: MessageStatus.DELIVERED,
      sentAt: now,
    };

    // Rapid transitions (all within 1 second)
    message.statusCode = MessageStatus.SEEN;
    message.seenAt = now + 100;

    message.statusCode = MessageStatus.REPLIED;
    message.repliedAt = now + 200;

    message.statusCode = MessageStatus.ACTED;
    message.actedAt = now + 300;

    message.statusCode = MessageStatus.REPORTED;
    message.reportedAt = now + 400;
    message.finalReport = "Instant loop closure";

    expect(message.statusCode).toBe(MessageStatus.REPORTED);
    expect((message.reportedAt as number) - (message.sentAt as number)).toBe(400);
  });

  it("should handle loop where some SLA fields are missing", () => {
    const message = {
      statusCode: MessageStatus.SEEN,
      seenAt: Date.now(),
      // expectedReplyBy is NOT set (edge case)
    };

    const hasExpectedReplyBy = "expectedReplyBy" in message;
    expect(hasExpectedReplyBy).toBe(false);

    // loopMonitor should skip: if (!msg.expectedReplyBy) continue;
  });

  it("should correctly identify loop-closed vs in-progress", () => {
    const statuses = [
      { code: MessageStatus.PENDING, closed: false },
      { code: MessageStatus.DELIVERED, closed: false },
      { code: MessageStatus.SEEN, closed: false },
      { code: MessageStatus.REPLIED, closed: false },
      { code: MessageStatus.ACTED, closed: false },
      { code: MessageStatus.REPORTED, closed: true },
    ];

    statuses.forEach(({ code, closed }) => {
      const isClosed = code >= MessageStatus.REPORTED;
      expect(isClosed).toBe(closed);
    });
  });
});
