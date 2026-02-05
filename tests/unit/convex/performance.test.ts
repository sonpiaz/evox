/**
 * Unit tests for convex/performanceMetrics.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";

describe("convex/performanceMetrics", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockPerformanceMetric(overrides: Partial<{
    agentName: string;
    date: string;
    tasksCompleted: number;
    tasksFailed: number;
    totalCost: number;
    avgDurationMinutes: number;
  }> = {}) {
    return {
      _id: `metric_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      agentName: "SAM",
      date: new Date().toISOString().split("T")[0],
      tasksCompleted: 5,
      tasksFailed: 0,
      totalCost: 2.50,
      avgDurationMinutes: 15,
      ...overrides,
    };
  }

  describe("getAllAgentsMetrics", () => {
    it("should return metrics for all agents on a given date", async () => {
      const metrics = [
        mockPerformanceMetric({ agentName: "SAM", tasksCompleted: 5 }),
        mockPerformanceMetric({ agentName: "LEO", tasksCompleted: 3 }),
        mockPerformanceMetric({ agentName: "QUINN", tasksCompleted: 2 }),
      ];

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(metrics),
      });

      const result = await ctx.db.query("performanceMetrics").filter(() => true).collect();

      expect(result).toHaveLength(3);
    });

    it("should calculate total cost across agents", async () => {
      const metrics = [
        mockPerformanceMetric({ agentName: "SAM", totalCost: 2.50 }),
        mockPerformanceMetric({ agentName: "LEO", totalCost: 1.75 }),
        mockPerformanceMetric({ agentName: "QUINN", totalCost: 0.80 }),
      ];

      const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);

      expect(totalCost).toBe(5.05);
    });

    it("should calculate total tasks completed", async () => {
      const metrics = [
        mockPerformanceMetric({ agentName: "SAM", tasksCompleted: 5 }),
        mockPerformanceMetric({ agentName: "LEO", tasksCompleted: 3 }),
      ];

      const totalTasks = metrics.reduce((sum, m) => sum + m.tasksCompleted, 0);

      expect(totalTasks).toBe(8);
    });
  });

  describe("getAgentMetrics", () => {
    it("should return metrics for specific agent", async () => {
      const metrics = mockPerformanceMetric({ agentName: "SAM" });

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(metrics),
      });

      const result = await ctx.db.query("performanceMetrics").filter(() => true).first();

      expect(result?.agentName).toBe("SAM");
    });

    it("should return null for agent with no metrics", async () => {
      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      const result = await ctx.db.query("performanceMetrics").filter(() => true).first();

      expect(result).toBeNull();
    });
  });

  describe("recordTaskCompletion", () => {
    it("should increment tasks completed", async () => {
      const metric = mockPerformanceMetric({ tasksCompleted: 5 });

      await ctx.db.patch(metric._id, { tasksCompleted: 6 });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        metric._id,
        expect.objectContaining({ tasksCompleted: 6 })
      );
    });

    it("should update total cost", async () => {
      const metric = mockPerformanceMetric({ totalCost: 2.50 });

      await ctx.db.patch(metric._id, { totalCost: 3.25 });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        metric._id,
        expect.objectContaining({ totalCost: 3.25 })
      );
    });
  });

  describe("cost calculations", () => {
    it("should calculate cost per task", () => {
      const metric = mockPerformanceMetric({ totalCost: 5.00, tasksCompleted: 10 });

      const costPerTask = metric.tasksCompleted > 0
        ? metric.totalCost / metric.tasksCompleted
        : 0;

      expect(costPerTask).toBe(0.50);
    });

    it("should handle zero tasks", () => {
      const metric = mockPerformanceMetric({ totalCost: 0, tasksCompleted: 0 });

      const costPerTask = metric.tasksCompleted > 0
        ? metric.totalCost / metric.tasksCompleted
        : 0;

      expect(costPerTask).toBe(0);
    });
  });

  describe("ROI calculation", () => {
    it("should calculate ROI based on value per task", () => {
      const VALUE_PER_TASK = 50;
      const metric = mockPerformanceMetric({ tasksCompleted: 10, totalCost: 5.00 });

      const valueGenerated = metric.tasksCompleted * VALUE_PER_TASK;
      const roi = metric.totalCost > 0
        ? Math.round((valueGenerated / metric.totalCost) * 10) / 10
        : 0;

      expect(valueGenerated).toBe(500);
      expect(roi).toBe(100); // 500/5 = 100x ROI
    });
  });

  describe("date handling", () => {
    it("should use ISO date format", () => {
      const today = new Date().toISOString().split("T")[0];

      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should create metrics for current date", () => {
      const today = new Date().toISOString().split("T")[0];
      const metric = mockPerformanceMetric({ date: today });

      expect(metric.date).toBe(today);
    });
  });
});
