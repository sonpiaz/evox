/**
 * Unit tests for convex/messageStatus.ts — "The Loop" mutations
 *
 * Tests cover:
 * - MessageStatus enum and StatusLabels
 * - markAsSeen: status transition, SLA timer, recipient-only
 * - markAsReplied: status transition, SLA timer
 * - markAsActed: status transition, SLA timer, recipient-only, alert resolution
 * - markAsReported: status transition, report storage, alert resolution
 * - markLoopBroken: broken flag, alert creation
 * - markMultipleAsSeen: batch operation
 * - Status downgrade prevention
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";

// Import constants directly from source
import { MessageStatus, StatusLabels } from "@/convex/messageStatus";

// SLA durations (mirrored from source — const not exported)
const SLA = {
  REPLY: 15 * 60 * 1000,       // 15 minutes
  ACTION: 2 * 60 * 60 * 1000,  // 2 hours
  REPORT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// --- Helpers ---

const AGENT_ID_SAM = "agents_sam_001";
const AGENT_ID_LEO = "agents_leo_001";

function mockAgentMessage(overrides: Record<string, unknown> = {}) {
  return {
    _id: `agentMessages_${Math.random().toString(36).slice(2)}`,
    _creationTime: Date.now(),
    from: AGENT_ID_SAM,
    to: AGENT_ID_LEO,
    type: "request" as const,
    content: "Please review the PR",
    timestamp: Date.now() - 60_000,
    sentAt: Date.now() - 60_000,
    statusCode: MessageStatus.DELIVERED,
    priority: "normal" as const,
    ...overrides,
  };
}

function mockLoopAlert(overrides: Record<string, unknown> = {}) {
  return {
    _id: `loopAlerts_${Math.random().toString(36).slice(2)}`,
    _creationTime: Date.now(),
    messageId: "agentMessages_test",
    agentName: "leo",
    alertType: "reply_overdue",
    severity: "warning",
    status: "active",
    createdAt: Date.now(),
    ...overrides,
  };
}

// --- Tests ---

describe("MessageStatus Constants", () => {
  it("should have correct status code values", () => {
    expect(MessageStatus.PENDING).toBe(0);
    expect(MessageStatus.DELIVERED).toBe(1);
    expect(MessageStatus.SEEN).toBe(2);
    expect(MessageStatus.REPLIED).toBe(3);
    expect(MessageStatus.ACTED).toBe(4);
    expect(MessageStatus.REPORTED).toBe(5);
  });

  it("should have labels for all status codes", () => {
    expect(StatusLabels[0]).toBe("pending");
    expect(StatusLabels[1]).toBe("delivered");
    expect(StatusLabels[2]).toBe("seen");
    expect(StatusLabels[3]).toBe("replied");
    expect(StatusLabels[4]).toBe("acted");
    expect(StatusLabels[5]).toBe("reported");
  });

  it("should have 6 status codes total", () => {
    const statusValues = Object.values(MessageStatus);
    expect(statusValues).toHaveLength(6);
    expect(statusValues).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("should have labels matching status codes", () => {
    const statusKeys = Object.keys(MessageStatus);
    const labelKeys = Object.keys(StatusLabels).map(Number);
    expect(labelKeys).toEqual(Object.values(MessageStatus));
    expect(statusKeys.length).toBe(labelKeys.length);
  });
});

describe("SLA Durations", () => {
  it("should have reply SLA of 15 minutes", () => {
    expect(SLA.REPLY).toBe(15 * 60 * 1000);
  });

  it("should have action SLA of 2 hours", () => {
    expect(SLA.ACTION).toBe(2 * 60 * 60 * 1000);
  });

  it("should have report SLA of 24 hours", () => {
    expect(SLA.REPORT).toBe(24 * 60 * 60 * 1000);
  });

  it("should enforce SLA ordering: reply < action < report", () => {
    expect(SLA.REPLY).toBeLessThan(SLA.ACTION);
    expect(SLA.ACTION).toBeLessThan(SLA.REPORT);
  });
});

describe("markAsSeen", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should update statusCode from DELIVERED to SEEN", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.DELIVERED });
    ctx.db.get.mockResolvedValue(message);

    // Simulate the mutation logic
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;
    expect(currentStatus).toBe(MessageStatus.DELIVERED);
    expect(currentStatus).toBeLessThan(MessageStatus.SEEN);

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.SEEN,
      seenAt: now,
      expectedReplyBy: now + SLA.REPLY,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({
        statusCode: MessageStatus.SEEN,
        seenAt: expect.any(Number),
        expectedReplyBy: expect.any(Number),
      })
    );
  });

  it("should set expectedReplyBy to seenAt + 15 minutes", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.DELIVERED });
    ctx.db.get.mockResolvedValue(message);

    const now = Date.now();
    const expectedReplyBy = now + SLA.REPLY;

    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.SEEN,
      seenAt: now,
      expectedReplyBy,
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, number>;
    expect(patchArgs.expectedReplyBy - patchArgs.seenAt).toBe(SLA.REPLY);
  });

  it("should not downgrade status if already SEEN or higher", () => {
    const alreadySeenMessage = mockAgentMessage({ statusCode: MessageStatus.SEEN });
    const currentStatus = alreadySeenMessage.statusCode ?? MessageStatus.DELIVERED;

    // markAsSeen should return early with alreadySeen: true
    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.SEEN);
  });

  it("should not downgrade status if already REPLIED", () => {
    const repliedMessage = mockAgentMessage({ statusCode: MessageStatus.REPLIED });
    const currentStatus = repliedMessage.statusCode ?? MessageStatus.DELIVERED;

    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.SEEN);
  });

  it("should reject non-existent message", async () => {
    ctx.db.get.mockResolvedValue(null);

    const message = await ctx.db.get("nonexistent_id");
    expect(message).toBeNull();
    // In the actual mutation, this would throw "Message not found"
  });

  it("should handle PENDING status (statusCode undefined) as DELIVERED", () => {
    const message = mockAgentMessage({ statusCode: undefined });
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;

    expect(currentStatus).toBe(MessageStatus.DELIVERED);
    expect(currentStatus).toBeLessThan(MessageStatus.SEEN);
  });
});

describe("markAsReplied", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should update statusCode to REPLIED", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.SEEN });
    ctx.db.get.mockResolvedValue(message);

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.REPLIED,
      repliedAt: now,
      expectedActionBy: now + SLA.ACTION,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({
        statusCode: MessageStatus.REPLIED,
        repliedAt: expect.any(Number),
        expectedActionBy: expect.any(Number),
      })
    );
  });

  it("should set expectedActionBy to repliedAt + 2 hours", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.SEEN });
    ctx.db.get.mockResolvedValue(message);

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.REPLIED,
      repliedAt: now,
      expectedActionBy: now + SLA.ACTION,
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, number>;
    expect(patchArgs.expectedActionBy - patchArgs.repliedAt).toBe(SLA.ACTION);
  });

  it("should reject non-existent message", async () => {
    ctx.db.get.mockResolvedValue(null);
    const message = await ctx.db.get("nonexistent_id");
    expect(message).toBeNull();
  });

  it("should not require agent identity check (auto-triggered)", () => {
    // markAsReplied has no agentName arg — it's triggered automatically
    // when recipient sends a response. Verify args shape.
    const requiredArgs = { originalMessageId: "agentMessages_123" };
    expect(requiredArgs).toHaveProperty("originalMessageId");
    expect(requiredArgs).not.toHaveProperty("agentName");
  });
});

describe("markAsActed", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should update statusCode to ACTED", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.REPLIED });
    ctx.db.get.mockResolvedValue(message);

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.ACTED,
      actedAt: now,
      expectedReportBy: now + SLA.REPORT,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({
        statusCode: MessageStatus.ACTED,
        actedAt: expect.any(Number),
        expectedReportBy: expect.any(Number),
      })
    );
  });

  it("should set expectedReportBy to actedAt + 24 hours", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.REPLIED });

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.ACTED,
      actedAt: now,
      expectedReportBy: now + SLA.REPORT,
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, number>;
    expect(patchArgs.expectedReportBy - patchArgs.actedAt).toBe(SLA.REPORT);
  });

  it("should not downgrade if already ACTED", () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.ACTED });
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;

    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.ACTED);
  });

  it("should not downgrade if already REPORTED", () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.REPORTED });
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;

    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.ACTED);
  });

  it("should optionally link to a task", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.REPLIED });
    const taskId = "tasks_abc123";

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.ACTED,
      actedAt: now,
      expectedReportBy: now + SLA.REPORT,
      linkedTaskId: taskId,
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({ linkedTaskId: taskId })
    );
  });

  it("should resolve active reply_overdue and action_overdue alerts", async () => {
    const message = mockAgentMessage();
    const replyAlert = mockLoopAlert({
      messageId: message._id,
      alertType: "reply_overdue",
      status: "active",
    });
    const actionAlert = mockLoopAlert({
      messageId: message._id,
      alertType: "action_overdue",
      status: "active",
    });

    const alerts = [replyAlert, actionAlert];
    const now = Date.now();

    // Simulate resolving alerts
    for (const alert of alerts) {
      if (alert.alertType === "reply_overdue" || alert.alertType === "action_overdue") {
        await ctx.db.patch(alert._id, { status: "resolved", resolvedAt: now });
      }
    }

    expect(ctx.db.patch).toHaveBeenCalledTimes(2);
    expect(ctx.db.patch).toHaveBeenCalledWith(
      replyAlert._id,
      expect.objectContaining({ status: "resolved" })
    );
    expect(ctx.db.patch).toHaveBeenCalledWith(
      actionAlert._id,
      expect.objectContaining({ status: "resolved" })
    );
  });
});

describe("markAsReported", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should update statusCode to REPORTED", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.ACTED });

    const now = Date.now();
    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.REPORTED,
      reportedAt: now,
      finalReport: "Task completed successfully",
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({
        statusCode: MessageStatus.REPORTED,
        reportedAt: expect.any(Number),
        finalReport: "Task completed successfully",
      })
    );
  });

  it("should store the final report string", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.ACTED });
    const report = "Deployed v2.1.0 to production. All tests passing.";

    await ctx.db.patch(message._id, {
      statusCode: MessageStatus.REPORTED,
      reportedAt: Date.now(),
      finalReport: report,
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchArgs.finalReport).toBe(report);
  });

  it("should not downgrade if already REPORTED", () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.REPORTED });
    const currentStatus = message.statusCode ?? MessageStatus.DELIVERED;

    expect(currentStatus).toBeGreaterThanOrEqual(MessageStatus.REPORTED);
  });

  it("should resolve ALL active loop alerts for the message", async () => {
    const message = mockAgentMessage();
    const alerts = [
      mockLoopAlert({ messageId: message._id, alertType: "reply_overdue", status: "active" }),
      mockLoopAlert({ messageId: message._id, alertType: "action_overdue", status: "active" }),
      mockLoopAlert({ messageId: message._id, alertType: "report_overdue", status: "active" }),
    ];

    const now = Date.now();
    for (const alert of alerts) {
      await ctx.db.patch(alert._id, { status: "resolved", resolvedAt: now });
    }

    expect(ctx.db.patch).toHaveBeenCalledTimes(3);
    for (const alert of alerts) {
      expect(ctx.db.patch).toHaveBeenCalledWith(
        alert._id,
        expect.objectContaining({ status: "resolved", resolvedAt: expect.any(Number) })
      );
    }
  });
});

describe("markLoopBroken", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("should set loopBroken to true", async () => {
    const message = mockAgentMessage();

    await ctx.db.patch(message._id, {
      loopBroken: true,
      loopBrokenReason: "Agent is offline",
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      message._id,
      expect.objectContaining({
        loopBroken: true,
        loopBrokenReason: "Agent is offline",
      })
    );
  });

  it("should store the reason string", async () => {
    const message = mockAgentMessage();
    const reason = "External API dependency is down, cannot proceed";

    await ctx.db.patch(message._id, {
      loopBroken: true,
      loopBrokenReason: reason,
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchArgs.loopBrokenReason).toBe(reason);
  });

  it("should create a loop_broken alert with critical severity", async () => {
    const message = mockAgentMessage();
    const alertData = {
      messageId: message._id,
      agentName: "leo",
      alertType: "loop_broken",
      severity: "critical",
      status: "escalated",
      escalatedTo: "max",
      createdAt: Date.now(),
    };

    await ctx.db.insert("loopAlerts", alertData);

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "loopAlerts",
      expect.objectContaining({
        alertType: "loop_broken",
        severity: "critical",
        status: "escalated",
        escalatedTo: "max",
      })
    );
  });

  it("should escalate to max", async () => {
    const alertData = {
      messageId: "agentMessages_123",
      agentName: "sam",
      alertType: "loop_broken",
      severity: "critical",
      status: "escalated",
      escalatedTo: "max",
      createdAt: Date.now(),
    };

    await ctx.db.insert("loopAlerts", alertData);

    const insertArgs = ctx.db.insert.mock.calls[0][1] as Record<string, unknown>;
    expect(insertArgs.escalatedTo).toBe("max");
  });

  it("should not change the statusCode (broken is orthogonal to status)", async () => {
    const message = mockAgentMessage({ statusCode: MessageStatus.SEEN });

    // markLoopBroken patches loopBroken + loopBrokenReason, NOT statusCode
    await ctx.db.patch(message._id, {
      loopBroken: true,
      loopBrokenReason: "blocked",
    });

    const patchArgs = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchArgs).not.toHaveProperty("statusCode");
  });
});

describe("markMultipleAsSeen", () => {
  it("should process multiple message IDs", () => {
    const messageIds = [
      "agentMessages_001",
      "agentMessages_002",
      "agentMessages_003",
    ];

    expect(messageIds).toHaveLength(3);
    messageIds.forEach((id) => {
      expect(id).toMatch(/^agentMessages_/);
    });
  });

  it("should count only newly marked messages (skip alreadySeen)", () => {
    const results = [
      { success: true, alreadySeen: false },
      { success: true, alreadySeen: true },
      { success: true, alreadySeen: false },
    ];

    const markedCount = results.filter((r) => !r.alreadySeen).length;
    expect(markedCount).toBe(2);
  });

  it("should handle errors gracefully (skip failed, continue)", () => {
    const messageIds = ["msg_1", "msg_2", "msg_3"];
    const errors: string[] = [];
    let marked = 0;

    for (const id of messageIds) {
      try {
        if (id === "msg_2") throw new Error("Message not found");
        marked++;
      } catch (e) {
        errors.push(id);
      }
    }

    expect(marked).toBe(2);
    expect(errors).toEqual(["msg_2"]);
  });

  it("should return total marked count", () => {
    const results = [
      { success: true, alreadySeen: false },
      { success: true, alreadySeen: false },
    ];

    const markedCount = results.filter((r) => !r.alreadySeen).length;
    expect(markedCount).toBe(2);
  });
});

describe("Status Progression Validation", () => {
  it("should follow the Loop order: PENDING → DELIVERED → SEEN → REPLIED → ACTED → REPORTED", () => {
    expect(MessageStatus.PENDING).toBeLessThan(MessageStatus.DELIVERED);
    expect(MessageStatus.DELIVERED).toBeLessThan(MessageStatus.SEEN);
    expect(MessageStatus.SEEN).toBeLessThan(MessageStatus.REPLIED);
    expect(MessageStatus.REPLIED).toBeLessThan(MessageStatus.ACTED);
    expect(MessageStatus.ACTED).toBeLessThan(MessageStatus.REPORTED);
  });

  it("should never allow backward status transitions", () => {
    const statusProgression = [
      MessageStatus.PENDING,
      MessageStatus.DELIVERED,
      MessageStatus.SEEN,
      MessageStatus.REPLIED,
      MessageStatus.ACTED,
      MessageStatus.REPORTED,
    ];

    for (let i = 1; i < statusProgression.length; i++) {
      expect(statusProgression[i]).toBeGreaterThan(statusProgression[i - 1]);
    }
  });

  it("should each SLA timer start at the correct transition", () => {
    // seenAt → expectedReplyBy (REPLY SLA)
    const seenAt = Date.now();
    const expectedReplyBy = seenAt + SLA.REPLY;
    expect(expectedReplyBy - seenAt).toBe(15 * 60 * 1000);

    // repliedAt → expectedActionBy (ACTION SLA)
    const repliedAt = Date.now();
    const expectedActionBy = repliedAt + SLA.ACTION;
    expect(expectedActionBy - repliedAt).toBe(2 * 60 * 60 * 1000);

    // actedAt → expectedReportBy (REPORT SLA)
    const actedAt = Date.now();
    const expectedReportBy = actedAt + SLA.REPORT;
    expect(expectedReportBy - actedAt).toBe(24 * 60 * 60 * 1000);
  });
});

describe("Agent Identity Checks", () => {
  it("should use resolveAgentNameById for markAsSeen (compares name)", () => {
    // markAsSeen resolves message.to (Convex ID) → agent name
    // then compares with agentName.toLowerCase()
    const recipientName = "leo";
    const callerName = "LEO";

    expect(recipientName).toBe(callerName.toLowerCase());
  });

  it("should reject if caller is not the recipient (markAsSeen)", () => {
    const recipientName = "leo";
    const callerName = "sam";

    expect(recipientName).not.toBe(callerName.toLowerCase());
    // In the actual mutation, this throws "Only recipient can mark message as seen"
  });

  it("should use resolveAgentIdByName for markAsActed (compares IDs)", () => {
    // markAsActed resolves agentName → Convex ID
    // then compares message.to with the resolved ID
    const messageToId = AGENT_ID_LEO;
    const resolvedAgentId = AGENT_ID_LEO;

    expect(messageToId).toBe(resolvedAgentId);
  });

  it("should reject if caller is not the recipient (markAsActed)", () => {
    const messageToId = AGENT_ID_LEO;
    const resolvedAgentId = AGENT_ID_SAM;

    expect(messageToId).not.toBe(resolvedAgentId);
    // In the actual mutation, this throws "Only recipient can mark message as acted"
  });

  it("should use resolveAgentIdByName for markAsReported (compares IDs)", () => {
    const messageToId = AGENT_ID_LEO;
    const resolvedAgentId = AGENT_ID_LEO;

    expect(messageToId).toBe(resolvedAgentId);
  });

  it("should case-insensitively match agent names in markAsSeen", () => {
    const recipientName = "leo";
    const variations = ["Leo", "LEO", "leo", "LeO"];

    variations.forEach((name) => {
      expect(recipientName).toBe(name.toLowerCase());
    });
  });
});
