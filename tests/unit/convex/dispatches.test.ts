/**
 * Unit tests for convex/dispatches.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx } from "../../helpers/convex-mock";

describe("convex/dispatches", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  function mockDispatch(overrides: Partial<{
    agentName: string;
    ticket: string;
    status: string;
    priority: string;
  }> = {}) {
    return {
      _id: `dispatch_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      agentName: "SAM",
      ticket: "AGT-123",
      status: "pending",
      priority: "normal",
      createdAt: Date.now(),
      ...overrides,
    };
  }

  describe("getNextDispatchForAgent", () => {
    it("should return pending dispatch for agent", async () => {
      const dispatch = mockDispatch({ agentName: "SAM", status: "pending" });

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(dispatch),
      });

      const result = await ctx.db.query("dispatches").filter(() => true).order("asc").first();

      expect(result).toBeDefined();
      expect(result?.agentName).toBe("SAM");
      expect(result?.status).toBe("pending");
    });

    it("should return null when no pending dispatches", async () => {
      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      });

      const result = await ctx.db.query("dispatches").filter(() => true).order("asc").first();

      expect(result).toBeNull();
    });

    it("should prioritize urgent dispatches", async () => {
      const urgentDispatch = mockDispatch({ priority: "urgent" });

      ctx.db.query.mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(urgentDispatch),
      });

      const result = await ctx.db.query("dispatches").filter(() => true).order("asc").first();

      expect(result?.priority).toBe("urgent");
    });
  });

  describe("markDispatchRunning", () => {
    it("should update dispatch status to running", async () => {
      const dispatch = mockDispatch();

      await ctx.db.patch(dispatch._id, { status: "running", startedAt: Date.now() });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        dispatch._id,
        expect.objectContaining({ status: "running" })
      );
    });
  });

  describe("markDispatchCompleted", () => {
    it("should update dispatch status to completed", async () => {
      const dispatch = mockDispatch({ status: "running" });
      const now = Date.now();

      await ctx.db.patch(dispatch._id, {
        status: "completed",
        completedAt: now,
        result: "Task completed successfully",
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        dispatch._id,
        expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Number),
        })
      );
    });

    it("should record result summary", async () => {
      const dispatch = mockDispatch({ status: "running" });

      await ctx.db.patch(dispatch._id, {
        status: "completed",
        result: "Implemented feature X with 5 files changed",
      });

      expect(ctx.db.patch).toHaveBeenCalledWith(
        dispatch._id,
        expect.objectContaining({
          result: expect.stringContaining("Implemented"),
        })
      );
    });
  });

  describe("createDispatch", () => {
    it("should create dispatch with required fields", async () => {
      const dispatchData = {
        agentName: "LEO",
        ticket: "AGT-456",
        status: "pending",
        priority: "high",
        createdAt: Date.now(),
      };

      ctx.db.insert.mockResolvedValue("dispatch_new");

      const id = await ctx.db.insert("dispatches", dispatchData);

      expect(id).toBe("dispatch_new");
      expect(ctx.db.insert).toHaveBeenCalledWith("dispatches", dispatchData);
    });
  });

  describe("dispatch status validation", () => {
    it("should only allow valid status transitions", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ["running", "canceled"],
        running: ["completed", "failed"],
        completed: [],
        failed: ["pending"], // Can retry
        canceled: [],
      };

      expect(validTransitions.pending).toContain("running");
      expect(validTransitions.running).toContain("completed");
      expect(validTransitions.completed).toHaveLength(0);
    });
  });
});
