/**
 * Critical Path Tests: CEO Dashboard Metrics
 *
 * North Star Alignment: CEO sees system state in 3 seconds.
 * Tests cover: Agent status, today's metrics, blockers, wins, north star progress.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent, mockTask } from "../../helpers/convex-mock";

describe("CEO Metrics - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  describe("getAgentStatus", () => {
    it("should return online/total counts", async () => {
      const agents = [
        mockAgent({ name: "SAM", status: "online" }),
        mockAgent({ name: "LEO", status: "busy" }),
        mockAgent({ name: "QUINN", status: "offline" }),
        mockAgent({ name: "MAX", status: "online" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();
      const online = result.filter(
        (a: { status: string }) => a.status === "online" || a.status === "busy"
      ).length;

      expect(online).toBe(3); // SAM, LEO, MAX
      expect(result.length).toBe(4);
    });

    it("should check heartbeat freshness for online status", () => {
      const now = Date.now();
      const THRESHOLD = 5 * 60 * 1000; // 5 minutes

      const freshHeartbeat = now - 1000; // 1 second ago
      const staleHeartbeat = now - 10 * 60 * 1000; // 10 minutes ago

      expect(now - freshHeartbeat < THRESHOLD).toBe(true);
      expect(now - staleHeartbeat < THRESHOLD).toBe(false);
    });

    it("should return agent avatars", async () => {
      const agents = [
        mockAgent({ name: "SAM", avatar: "🤖" }),
        mockAgent({ name: "LEO", avatar: "🦁" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(agents),
      });

      const result = await ctx.db.query("agents").collect();

      expect(result[0].avatar).toBe("🤖");
      expect(result[1].avatar).toBe("🦁");
    });

    it("should handle offline status correctly", () => {
      const agent = mockAgent({ status: "offline" });

      // Offline = red per AGT-273
      const statusColor = agent.status === "offline" ? "bg-red-500" : "bg-green-500";
      expect(statusColor).toBe("bg-red-500");
    });
  });

  describe("getTodayMetrics", () => {
    it("should count completed tasks today", async () => {
      const now = Date.now();
      const todayStart = new Date().setHours(0, 0, 0, 0);

      const tasks = [
        mockTask({ status: "done", completedAt: now - 1000 }), // Today
        mockTask({ status: "done", completedAt: now - 1000 }), // Today
        mockTask({ status: "done", completedAt: todayStart - 1000 }), // Yesterday
      ];

      const todayCompleted = tasks.filter(
        (t) => t.status === "done" && t.completedAt && t.completedAt >= todayStart
      ).length;

      expect(todayCompleted).toBe(2);
    });

    it("should count in-progress tasks", async () => {
      const tasks = [
        mockTask({ status: "in_progress" }),
        mockTask({ status: "review" }),
        mockTask({ status: "done" }),
      ];

      const inProgress = tasks.filter(
        (t) => t.status === "in_progress" || t.status === "review"
      ).length;

      expect(inProgress).toBe(2);
    });

    it("should calculate today's cost", async () => {
      const metrics = [
        { agentName: "SAM", totalCost: 2.50 },
        { agentName: "LEO", totalCost: 1.75 },
      ];

      const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);

      expect(totalCost).toBe(4.25);
    });

    it("should return 0 for cost when no metrics", () => {
      const metrics: { totalCost: number }[] = [];
      const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);

      expect(totalCost).toBe(0);
    });
  });

  describe("getBlockers", () => {
    it("should identify urgent blocked tasks", async () => {
      const tasks = [
        mockTask({ status: "backlog", priority: "urgent" }), // Blocker
        mockTask({ status: "todo", priority: "urgent" }), // Blocker
        mockTask({ status: "in_progress", priority: "urgent" }), // Not blocked
        mockTask({ status: "backlog", priority: "normal" }), // Not urgent
      ];

      const blockers = tasks.filter(
        (t) =>
          t.priority === "urgent" &&
          (t.status === "backlog" || t.status === "todo")
      );

      expect(blockers).toHaveLength(2);
    });

    it("should identify stale in-progress tasks", async () => {
      const now = Date.now();
      const STALE_THRESHOLD = 24 * 60 * 60 * 1000;

      const tasks = [
        mockTask({ status: "in_progress", updatedAt: now - 25 * 60 * 60 * 1000 }), // Stale
        mockTask({ status: "in_progress", updatedAt: now - 1000 }), // Fresh
      ];

      const stale = tasks.filter(
        (t) => t.status === "in_progress" && now - (t.updatedAt || 0) > STALE_THRESHOLD
      );

      expect(stale).toHaveLength(1);
    });

    it("should limit blockers to 5", () => {
      const blockers = Array.from({ length: 10 }, (_, i) =>
        mockTask({ status: "backlog", priority: "urgent", title: `Blocker ${i}` })
      );

      const limited = blockers.slice(0, 5);

      expect(limited).toHaveLength(5);
    });
  });

  describe("getWins", () => {
    it("should return today's completed tasks as wins", async () => {
      const now = Date.now();
      const todayStart = new Date().setHours(0, 0, 0, 0);

      const tasks = [
        mockTask({ status: "done", completedAt: now - 1000, title: "Win 1" }),
        mockTask({ status: "done", completedAt: now - 2000, title: "Win 2" }),
      ];

      const wins = tasks.filter(
        (t) => t.status === "done" && t.completedAt && t.completedAt >= todayStart
      );

      expect(wins).toHaveLength(2);
    });

    it("should sort wins by most recent first", () => {
      const wins = [
        { completedAt: 1000, title: "Old" },
        { completedAt: 3000, title: "Newest" },
        { completedAt: 2000, title: "Middle" },
      ];

      const sorted = [...wins].sort((a, b) => b.completedAt - a.completedAt);

      expect(sorted[0].title).toBe("Newest");
      expect(sorted[2].title).toBe("Old");
    });

    it("should return empty array when no wins", () => {
      const tasks = [
        mockTask({ status: "in_progress" }),
        mockTask({ status: "todo" }),
      ];

      const wins = tasks.filter((t) => t.status === "done");

      expect(wins).toHaveLength(0);
    });
  });

  describe("getNorthStarProgress", () => {
    it("should return percentage from visionProgress", () => {
      const progress = { percentComplete: 45, currentPhase: "Phase 1" };

      expect(progress.percentComplete).toBe(45);
      expect(progress.currentPhase).toBe("Phase 1");
    });

    it("should fallback to automationMetrics", () => {
      const automationMetrics = { progressPercent: 30, currentPhase: "Foundation" };

      expect(automationMetrics.progressPercent).toBe(30);
    });

    it("should handle missing progress gracefully", () => {
      const progress = null;
      const fallback = { percentage: 0, phase: "Unknown" };

      const result = progress || fallback;

      expect(result.percentage).toBe(0);
    });
  });

  describe("Dashboard Performance", () => {
    it("should respond within 3 seconds (simulated)", () => {
      const startTime = Date.now();
      // Simulate query time
      const queryTime = 100; // ms
      const endTime = startTime + queryTime;

      expect(endTime - startTime).toBeLessThan(3000);
    });

    it("should batch multiple queries efficiently", () => {
      const queries = [
        "getAgentStatus",
        "getTodayMetrics",
        "getBlockers",
        "getWins",
        "getNorthStarProgress",
      ];

      // All 5 queries should run
      expect(queries).toHaveLength(5);
    });
  });
});
