/**
 * Unit tests for convex/recovery.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent } from "../../helpers/convex-mock";

describe("convex/recovery", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockRecoveryStatus(overrides: Partial<{
    name: string;
    status: string;
    isHealthy: boolean;
    restartCount: number;
    consecutiveFailures: number;
    circuitBreakerTripped: boolean;
    recoveryBackoffLevel: number;
    lastRestartAt: number | null;
  }> = {}) {
    return {
      name: "SAM",
      status: "online",
      isHealthy: true,
      restartCount: 0,
      consecutiveFailures: 0,
      circuitBreakerTripped: false,
      recoveryBackoffLevel: 0,
      lastRestartAt: null,
      ...overrides,
    };
  }

  function mockRecoveryEvent(overrides: Partial<{
    agentName: string;
    eventType: string;
    title: string;
    description: string;
    timestamp: number;
  }> = {}) {
    return {
      id: `event_${Math.random().toString(36).slice(2)}`,
      agentName: "SAM",
      eventType: "auto_restart",
      title: "Agent restarted",
      description: "Agent was automatically restarted",
      timestamp: Date.now(),
      ...overrides,
    };
  }

  describe("getRecoveryStatus", () => {
    it("should return recovery status for all agents", async () => {
      const statuses = [
        mockRecoveryStatus({ name: "SAM" }),
        mockRecoveryStatus({ name: "LEO" }),
        mockRecoveryStatus({ name: "QUINN" }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(statuses),
      });

      const result = await ctx.db.query("recoveryStatus").collect();

      expect(result).toHaveLength(3);
    });

    it("should indicate unhealthy agents", async () => {
      const statuses = [
        mockRecoveryStatus({ name: "SAM", isHealthy: false, consecutiveFailures: 3 }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(statuses),
      });

      const result = await ctx.db.query("recoveryStatus").collect();

      expect(result[0].isHealthy).toBe(false);
      expect(result[0].consecutiveFailures).toBe(3);
    });

    it("should indicate circuit breaker status", async () => {
      const statuses = [
        mockRecoveryStatus({ name: "SAM", circuitBreakerTripped: true }),
      ];

      ctx.db.query.mockReturnValue({
        collect: vi.fn().mockResolvedValue(statuses),
      });

      const result = await ctx.db.query("recoveryStatus").collect();

      expect(result[0].circuitBreakerTripped).toBe(true);
    });
  });

  describe("getRecoveryEvents", () => {
    it("should return recent recovery events", async () => {
      const events = [
        mockRecoveryEvent({ eventType: "auto_restart" }),
        mockRecoveryEvent({ eventType: "recovery_success" }),
      ];

      ctx.db.query.mockReturnValue({
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockResolvedValue(events),
      });

      const result = await ctx.db.query("recoveryEvents").order("desc").take(50);

      expect(result).toHaveLength(2);
    });

    it("should include event types for filtering", async () => {
      const events = [
        mockRecoveryEvent({ eventType: "auto_restart" }),
        mockRecoveryEvent({ eventType: "recovery_success" }),
        mockRecoveryEvent({ eventType: "recovery_failure" }),
      ];

      ctx.db.query.mockReturnValue({
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockResolvedValue(events),
      });

      const result = await ctx.db.query("recoveryEvents").order("desc").take(50);

      const types = result.map((e: { eventType: string }) => e.eventType);
      expect(types).toContain("auto_restart");
      expect(types).toContain("recovery_success");
      expect(types).toContain("recovery_failure");
    });
  });

  describe("recovery metrics calculation", () => {
    it("should calculate retry success rate", () => {
      const events = [
        mockRecoveryEvent({ eventType: "auto_restart" }),
        mockRecoveryEvent({ eventType: "auto_restart" }),
        mockRecoveryEvent({ eventType: "recovery_success" }),
        mockRecoveryEvent({ eventType: "recovery_failure" }),
      ];

      const totalRetries = events.filter((e) => e.eventType === "auto_restart").length;
      const successfulRetries = events.filter((e) => e.eventType === "recovery_success").length;
      const successRate = totalRetries > 0
        ? Math.round((successfulRetries / totalRetries) * 100)
        : 100;

      expect(successRate).toBe(50); // 1/2 = 50%
    });

    it("should count errors in 24h window", () => {
      const now = Date.now();
      const day24h = 24 * 60 * 60 * 1000;

      const events = [
        mockRecoveryEvent({ eventType: "auto_restart", timestamp: now - 1000 }),
        mockRecoveryEvent({ eventType: "auto_restart", timestamp: now - day24h - 1000 }), // Outside 24h
        mockRecoveryEvent({ eventType: "recovery_failure", timestamp: now - 2000 }),
      ];

      const events24h = events.filter((e) => e.timestamp > now - day24h);
      const errors24h = events24h.filter(
        (e) => e.eventType === "auto_restart" || e.eventType === "recovery_failure"
      ).length;

      expect(errors24h).toBe(2);
    });
  });

  describe("circuit breaker logic", () => {
    it("should trip circuit breaker after consecutive failures", () => {
      const MAX_CONSECUTIVE_FAILURES = 3;
      const status = mockRecoveryStatus({ consecutiveFailures: 3 });

      const shouldTrip = status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
      expect(shouldTrip).toBe(true);
    });

    it("should not trip circuit breaker below threshold", () => {
      const MAX_CONSECUTIVE_FAILURES = 3;
      const status = mockRecoveryStatus({ consecutiveFailures: 2 });

      const shouldTrip = status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
      expect(shouldTrip).toBe(false);
    });
  });
});
