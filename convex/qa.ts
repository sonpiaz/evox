import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// AGT-225: QA Agent Integration — Automated Test Gate
// Integrates Quinn (QA agent) into CI/CD for automated quality gates

type TestStatus = "pending" | "running" | "passed" | "failed" | "skipped";
type RunStatus = "pending" | "running" | "passed" | "failed" | "cancelled";

interface TestResult {
  name: string;
  status: TestStatus;
  duration?: number;
  output?: string;
  startedAt?: number;
  finishedAt?: number;
}

/**
 * Trigger a new QA run
 */
export const triggerRun = mutation({
  args: {
    triggeredBy: v.union(
      v.literal("github"),
      v.literal("vercel"),
      v.literal("manual"),
      v.literal("agent")
    ),
    commitHash: v.optional(v.string()),
    prNumber: v.optional(v.number()),
  },
  handler: async (ctx, { triggeredBy, commitHash, prNumber }) => {
    const now = Date.now();
    const runId = `qa-${now}`;

    // Standard test suite
    const tests: TestResult[] = [
      { name: "next-build", status: "pending" },
      { name: "tsc", status: "pending" },
      { name: "eslint", status: "pending" },
      { name: "e2e", status: "pending" },
    ];

    const id = await ctx.db.insert("qaRuns", {
      runId,
      triggeredBy,
      commitHash,
      prNumber,
      status: "pending",
      tests,
      totalTests: tests.length,
      passedTests: 0,
      failedTests: 0,
      startedAt: now,
    });

    return { success: true, runId, id };
  },
});

/**
 * Start executing a QA run
 */
export const startRun = mutation({
  args: {
    runId: v.string(),
  },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db
      .query("qaRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .first();

    if (!run) throw new Error(`QA run ${runId} not found`);

    await ctx.db.patch(run._id, {
      status: "running",
    });

    return { success: true, runId };
  },
});

/**
 * Update a specific test result
 */
export const updateTest = mutation({
  args: {
    runId: v.string(),
    testName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    duration: v.optional(v.number()),
    output: v.optional(v.string()),
  },
  handler: async (ctx, { runId, testName, status, duration, output }) => {
    const run = await ctx.db
      .query("qaRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .first();

    if (!run) throw new Error(`QA run ${runId} not found`);

    const now = Date.now();
    const tests = run.tests.map((t) =>
      t.name === testName
        ? {
            ...t,
            status,
            duration,
            output: output ? output.slice(0, 1000) : undefined, // Truncate output
            startedAt: t.startedAt ?? (status === "running" ? now : undefined),
            finishedAt:
              status === "passed" || status === "failed" ? now : undefined,
          }
        : t
    );

    await ctx.db.patch(run._id, { tests });

    return { success: true, runId, testName, status };
  },
});

/**
 * Complete a QA run
 */
export const completeRun = mutation({
  args: {
    runId: v.string(),
    cancelled: v.optional(v.boolean()),
  },
  handler: async (ctx, { runId, cancelled }) => {
    const run = await ctx.db
      .query("qaRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .first();

    if (!run) throw new Error(`QA run ${runId} not found`);

    const now = Date.now();
    const passedTests = run.tests.filter((t) => t.status === "passed").length;
    const failedTests = run.tests.filter((t) => t.status === "failed").length;
    const status: RunStatus = cancelled
      ? "cancelled"
      : failedTests > 0
        ? "failed"
        : "passed";

    await ctx.db.patch(run._id, {
      status,
      passedTests,
      failedTests,
      duration: now - run.startedAt,
      finishedAt: now,
    });

    // If failed, trigger alert and potentially create bug ticket
    if (status === "failed") {
      const failedTestNames = run.tests
        .filter((t) => t.status === "failed")
        .map((t) => t.name)
        .join(", ");

      await ctx.scheduler.runAfter(0, internal.qa.handleFailure, {
        runId: run._id,
        failedTests: failedTestNames,
        commitHash: run.commitHash,
      });
    }

    return {
      success: true,
      runId,
      status,
      passedTests,
      failedTests,
      totalTests: run.totalTests,
    };
  },
});

/**
 * Handle QA failure - alert and create bug ticket
 */
export const handleFailure = internalMutation({
  args: {
    runId: v.id("qaRuns"),
    failedTests: v.string(),
    commitHash: v.optional(v.string()),
  },
  handler: async (ctx, { runId, failedTests, commitHash }) => {
    const now = Date.now();

    // Create alert
    await ctx.db.insert("alerts", {
      type: "agent_failed",
      severity: "critical",
      channel: "telegram",
      title: "QA Failed: Deploy Blocked",
      message: `QA run failed. Tests: ${failedTests}${commitHash ? `. Commit: ${commitHash.slice(0, 7)}` : ""}`,
      status: "pending",
      createdAt: now,
    });

    // Update run with alert sent
    await ctx.db.patch(runId, {
      alertSent: true,
      deployBlocked: true,
    });

    // Trigger telegram alert
    await ctx.scheduler.runAfter(0, internal.alerts.sendTelegramAlert, {
      title: "🚨 QA Failed: Deploy Blocked",
      message: `Failed tests: ${failedTests}\n${commitHash ? `Commit: ${commitHash.slice(0, 7)}` : ""}`,
    });
  },
});

/**
 * Get QA run status
 */
export const getStatus = query({
  args: {
    runId: v.string(),
  },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db
      .query("qaRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .first();

    if (!run) return null;

    return {
      runId: run.runId,
      status: run.status,
      triggeredBy: run.triggeredBy,
      commitHash: run.commitHash,
      tests: run.tests,
      totalTests: run.totalTests,
      passedTests: run.passedTests,
      failedTests: run.failedTests,
      duration: run.duration,
      deployBlocked: run.deployBlocked,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    };
  },
});

/**
 * Get recent QA runs
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("passed"),
        v.literal("failed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, { limit, status }) => {
    let runs;

    if (status) {
      runs = await ctx.db
        .query("qaRuns")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(limit ?? 20);
    } else {
      runs = await ctx.db.query("qaRuns").order("desc").take(limit ?? 20);
    }

    return runs.map((run) => ({
      runId: run.runId,
      status: run.status,
      triggeredBy: run.triggeredBy,
      commitHash: run.commitHash,
      totalTests: run.totalTests,
      passedTests: run.passedTests,
      failedTests: run.failedTests,
      duration: run.duration,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    }));
  },
});

/**
 * Get QA stats summary
 */
export const getStats = query({
  args: {
    since: v.optional(v.number()),
  },
  handler: async (ctx, { since }) => {
    const runs = await ctx.db.query("qaRuns").order("desc").take(100);

    const filteredRuns = since
      ? runs.filter((r) => r.startedAt >= since)
      : runs;

    const passed = filteredRuns.filter((r) => r.status === "passed").length;
    const failed = filteredRuns.filter((r) => r.status === "failed").length;
    const total = filteredRuns.length;

    const avgDuration =
      filteredRuns
        .filter((r) => r.duration)
        .reduce((sum, r) => sum + (r.duration ?? 0), 0) /
      (filteredRuns.filter((r) => r.duration).length || 1);

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgDuration: Math.round(avgDuration),
      deploysBlocked: filteredRuns.filter((r) => r.deployBlocked).length,
    };
  },
});

/**
 * Cancel a running QA run
 */
export const cancelRun = mutation({
  args: {
    runId: v.string(),
  },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db
      .query("qaRuns")
      .withIndex("by_runId", (q) => q.eq("runId", runId))
      .first();

    if (!run) throw new Error(`QA run ${runId} not found`);

    if (run.status !== "pending" && run.status !== "running") {
      throw new Error(`Cannot cancel run with status: ${run.status}`);
    }

    const now = Date.now();

    await ctx.db.patch(run._id, {
      status: "cancelled",
      finishedAt: now,
      duration: now - run.startedAt,
    });

    return { success: true, runId };
  },
});
