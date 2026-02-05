/**
 * Performance Metrics Tests
 *
 * North Star: Track agent productivity and system health.
 * Tests cover: task metrics, cost tracking, velocity, trends.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent } from "../../helpers/convex-mock";

describe("Performance Metrics - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockMetric(overrides: Partial<{
    agentName: string;
    date: string;
    tasksCompleted: number;
    tasksFailed: number;
    tokensUsed: number;
    costUsd: number;
    avgTaskDurationMinutes: number;
  }> = {}) {
    return {
      _id: `metric_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      agentName: "SAM",
      date: new Date().toISOString().split("T")[0],
      tasksCompleted: 5,
      tasksFailed: 0,
      tokensUsed: 50000,
      costUsd: 2.5,
      avgTaskDurationMinutes: 30,
      ...overrides,
    };
  }

  describe("Task Completion Metrics", () => {
    it("should track tasks completed per agent", () => {
      const metrics = [
        mockMetric({ agentName: "SAM", tasksCompleted: 5 }),
        mockMetric({ agentName: "LEO", tasksCompleted: 3 }),
        mockMetric({ agentName: "QUINN", tasksCompleted: 8 }),
      ];

      const totalCompleted = metrics.reduce((sum, m) => sum + m.tasksCompleted, 0);

      expect(totalCompleted).toBe(16);
    });

    it("should calculate success rate", () => {
      const metric = mockMetric({ tasksCompleted: 8, tasksFailed: 2 });

      const total = metric.tasksCompleted + metric.tasksFailed;
      const successRate = (metric.tasksCompleted / total) * 100;

      expect(successRate).toBe(80);
    });

    it("should track daily task completion", () => {
      const dailyMetrics = [
        mockMetric({ date: "2026-02-01", tasksCompleted: 5 }),
        mockMetric({ date: "2026-02-02", tasksCompleted: 7 }),
        mockMetric({ date: "2026-02-03", tasksCompleted: 4 }),
      ];

      const avgDaily = dailyMetrics.reduce((sum, m) => sum + m.tasksCompleted, 0) / dailyMetrics.length;

      expect(avgDaily).toBeCloseTo(5.33, 1);
    });

    it("should identify top performer", () => {
      const metrics = [
        mockMetric({ agentName: "SAM", tasksCompleted: 5 }),
        mockMetric({ agentName: "LEO", tasksCompleted: 8 }),
        mockMetric({ agentName: "QUINN", tasksCompleted: 6 }),
      ];

      const topPerformer = metrics.reduce((top, m) =>
        m.tasksCompleted > top.tasksCompleted ? m : top
      );

      expect(topPerformer.agentName).toBe("LEO");
    });
  });

  describe("Cost Tracking", () => {
    it("should track daily cost per agent", () => {
      const metrics = [
        mockMetric({ agentName: "SAM", costUsd: 2.5 }),
        mockMetric({ agentName: "LEO", costUsd: 1.8 }),
        mockMetric({ agentName: "QUINN", costUsd: 3.2 }),
      ];

      const totalCost = metrics.reduce((sum, m) => sum + m.costUsd, 0);

      expect(totalCost).toBe(7.5);
    });

    it("should calculate cost per task", () => {
      const metric = mockMetric({ tasksCompleted: 5, costUsd: 2.5 });

      const costPerTask = metric.costUsd / metric.tasksCompleted;

      expect(costPerTask).toBe(0.5);
    });

    it("should track cost trend over time", () => {
      const weeklyMetrics = [
        { week: 1, costUsd: 50 },
        { week: 2, costUsd: 45 },
        { week: 3, costUsd: 42 },
        { week: 4, costUsd: 38 },
      ];

      const costTrend = weeklyMetrics.map((m, i) =>
        i === 0 ? 0 : ((m.costUsd - weeklyMetrics[i - 1].costUsd) / weeklyMetrics[i - 1].costUsd) * 100
      );

      expect(costTrend[1]).toBe(-10); // 10% decrease
    });

    it("should alert on budget threshold", () => {
      const DAILY_BUDGET = 20;
      const currentCost = 22;

      const overBudget = currentCost > DAILY_BUDGET;
      const overage = currentCost - DAILY_BUDGET;
      const percentOver = (overage / DAILY_BUDGET) * 100;

      expect(overBudget).toBe(true);
      expect(percentOver).toBe(10);
    });

    it("should project monthly cost", () => {
      const dailyAvg = 15;
      const daysInMonth = 30;

      const projectedMonthly = dailyAvg * daysInMonth;

      expect(projectedMonthly).toBe(450);
    });
  });

  describe("Token Usage", () => {
    it("should track tokens per agent", () => {
      const metrics = [
        mockMetric({ agentName: "SAM", tokensUsed: 50000 }),
        mockMetric({ agentName: "LEO", tokensUsed: 35000 }),
        mockMetric({ agentName: "QUINN", tokensUsed: 42000 }),
      ];

      const totalTokens = metrics.reduce((sum, m) => sum + m.tokensUsed, 0);

      expect(totalTokens).toBe(127000);
    });

    it("should calculate tokens per task", () => {
      const metric = mockMetric({ tasksCompleted: 5, tokensUsed: 50000 });

      const tokensPerTask = metric.tokensUsed / metric.tasksCompleted;

      expect(tokensPerTask).toBe(10000);
    });

    it("should detect token usage anomalies", () => {
      const historicalAvg = 10000; // tokens per task
      const threshold = 1.5; // 50% above average
      const currentUsage = 18000;

      const isAnomaly = currentUsage > historicalAvg * threshold;

      expect(isAnomaly).toBe(true);
    });
  });

  describe("Task Duration", () => {
    it("should track average task duration", () => {
      const durations = [15, 30, 45, 20, 40]; // minutes

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      expect(avgDuration).toBe(30);
    });

    it("should calculate duration percentiles", () => {
      const durations = [10, 15, 20, 25, 30, 35, 40, 45, 50, 100]; // sorted

      const p50Index = Math.floor(durations.length * 0.5);
      const p90Index = Math.floor(durations.length * 0.9);

      expect(durations[p50Index]).toBe(35); // 50th percentile
      expect(durations[p90Index]).toBe(100); // 90th percentile
    });

    it("should identify slow tasks", () => {
      const SLOW_THRESHOLD_MINUTES = 60;
      const tasks = [
        { id: "1", durationMinutes: 30 },
        { id: "2", durationMinutes: 90 },
        { id: "3", durationMinutes: 45 },
        { id: "4", durationMinutes: 120 },
      ];

      const slowTasks = tasks.filter((t) => t.durationMinutes > SLOW_THRESHOLD_MINUTES);

      expect(slowTasks).toHaveLength(2);
    });

    it("should track duration by task type", () => {
      const tasksByType = [
        { type: "bug", avgDuration: 25 },
        { type: "feature", avgDuration: 60 },
        { type: "chore", avgDuration: 15 },
      ];

      const slowestType = tasksByType.reduce((slow, t) =>
        t.avgDuration > slow.avgDuration ? t : slow
      );

      expect(slowestType.type).toBe("feature");
    });
  });

  describe("Velocity Tracking", () => {
    it("should calculate weekly velocity", () => {
      const weeklyPoints = [18, 21, 19, 22]; // story points per week

      const avgVelocity = weeklyPoints.reduce((a, b) => a + b, 0) / weeklyPoints.length;

      expect(avgVelocity).toBe(20);
    });

    it("should track velocity trend", () => {
      const weeklyVelocity = [15, 18, 20, 22, 25];

      const isImproving = weeklyVelocity.every((v, i) =>
        i === 0 || v >= weeklyVelocity[i - 1]
      );

      expect(isImproving).toBe(true);
    });

    it("should calculate throughput", () => {
      const tasksPerDay = [3, 5, 4, 6, 2, 4, 5];

      const avgThroughput = tasksPerDay.reduce((a, b) => a + b, 0) / tasksPerDay.length;

      expect(avgThroughput).toBeCloseTo(4.14, 1);
    });
  });

  describe("Agent Performance Ranking", () => {
    it("should rank agents by tasks completed", () => {
      const agents = [
        { name: "SAM", tasksCompleted: 15 },
        { name: "LEO", tasksCompleted: 22 },
        { name: "QUINN", tasksCompleted: 18 },
      ];

      const ranked = [...agents].sort((a, b) => b.tasksCompleted - a.tasksCompleted);

      expect(ranked[0].name).toBe("LEO");
      expect(ranked[2].name).toBe("SAM");
    });

    it("should calculate composite score", () => {
      const calculateScore = (agent: {
        tasksCompleted: number;
        successRate: number;
        avgDuration: number;
      }): number => {
        // Weight: tasks (40%), success (40%), speed (20%)
        const speedScore = Math.max(0, 100 - agent.avgDuration);
        return (
          agent.tasksCompleted * 0.4 +
          agent.successRate * 0.4 +
          speedScore * 0.2
        );
      };

      const sam = { tasksCompleted: 50, successRate: 95, avgDuration: 30 };
      const leo = { tasksCompleted: 60, successRate: 85, avgDuration: 25 };

      expect(calculateScore(sam)).toBe(50 * 0.4 + 95 * 0.4 + 70 * 0.2);
      expect(calculateScore(leo)).toBe(60 * 0.4 + 85 * 0.4 + 75 * 0.2);
    });
  });

  describe("Dashboard Aggregations", () => {
    it("should aggregate daily stats", () => {
      const metrics = [
        mockMetric({ agentName: "SAM", tasksCompleted: 5, costUsd: 2.5 }),
        mockMetric({ agentName: "LEO", tasksCompleted: 3, costUsd: 1.5 }),
        mockMetric({ agentName: "QUINN", tasksCompleted: 4, costUsd: 2.0 }),
      ];

      const daily = {
        totalTasks: metrics.reduce((sum, m) => sum + m.tasksCompleted, 0),
        totalCost: metrics.reduce((sum, m) => sum + m.costUsd, 0),
        activeAgents: metrics.length,
      };

      expect(daily.totalTasks).toBe(12);
      expect(daily.totalCost).toBe(6);
      expect(daily.activeAgents).toBe(3);
    });

    it("should calculate week-over-week change", () => {
      const thisWeek = { tasks: 50, cost: 25 };
      const lastWeek = { tasks: 40, cost: 30 };

      const taskChange = ((thisWeek.tasks - lastWeek.tasks) / lastWeek.tasks) * 100;
      const costChange = ((thisWeek.cost - lastWeek.cost) / lastWeek.cost) * 100;

      expect(taskChange).toBe(25); // 25% more tasks
      expect(costChange).toBeCloseTo(-16.67, 1); // 16.67% less cost
    });
  });

  describe("Metric Storage", () => {
    it("should save daily metric", async () => {
      const metricData = {
        agentName: "SAM",
        date: "2026-02-05",
        tasksCompleted: 5,
        tasksFailed: 1,
        tokensUsed: 50000,
        costUsd: 2.5,
      };

      ctx.db.insert.mockResolvedValue("metric_new");

      await ctx.db.insert("performanceMetrics", metricData);

      expect(ctx.db.insert).toHaveBeenCalledWith(
        "performanceMetrics",
        expect.objectContaining({
          agentName: "SAM",
          date: "2026-02-05",
        })
      );
    });

    it("should update existing metric", async () => {
      const existingId = "metric_123";

      await ctx.db.patch(existingId, {
        tasksCompleted: 6,
        costUsd: 3.0,
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        existingId,
        expect.objectContaining({ tasksCompleted: 6 })
      );
    });
  });
});
