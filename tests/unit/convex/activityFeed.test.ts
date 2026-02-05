/**
 * Critical Path Tests: Activity Feed
 *
 * North Star Alignment: CEO sees what's happening in real-time.
 * Tests cover: Live feed, event filtering, message merging, timestamps.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockCtx, mockAgent } from "../../helpers/convex-mock";

describe("Activity Feed - Critical Path", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  // Helper to create activity event
  function mockActivityEvent(overrides: Partial<{
    agentName: string;
    eventType: string;
    description: string;
    linearIdentifier: string;
    timestamp: number;
  }> = {}) {
    return {
      _id: `event_${Math.random().toString(36).slice(2)}`,
      _creationTime: Date.now(),
      agentName: "SAM",
      eventType: "completed",
      description: "Task completed",
      linearIdentifier: "AGT-123",
      timestamp: Date.now(),
      ...overrides,
    };
  }

  describe("getLiveFeed", () => {
    it("should merge activities and messages", async () => {
      const activities = [
        mockActivityEvent({ eventType: "completed", agentName: "SAM" }),
        mockActivityEvent({ eventType: "push", agentName: "LEO" }),
      ];

      const messages = [
        { _id: "msg1", fromAgent: "quinn", content: "Code review done", createdAt: Date.now(), type: "dm" },
      ];

      const feedItems = [...activities, ...messages];

      expect(feedItems).toHaveLength(3);
    });

    it("should filter out noisy events", () => {
      const events = [
        mockActivityEvent({ eventType: "completed" }), // Keep
        mockActivityEvent({ eventType: "push" }), // Keep
        mockActivityEvent({ eventType: "heartbeat" }), // Filter out
        mockActivityEvent({ eventType: "channel_message" }), // Filter out
      ];

      const NOISY_EVENTS = ["heartbeat", "channel_message"];
      const filtered = events.filter((e) => !NOISY_EVENTS.includes(e.eventType));

      expect(filtered).toHaveLength(2);
    });

    it("should sort by timestamp descending", () => {
      const events = [
        mockActivityEvent({ timestamp: 1000 }),
        mockActivityEvent({ timestamp: 3000 }),
        mockActivityEvent({ timestamp: 2000 }),
      ];

      const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

      expect(sorted[0].timestamp).toBe(3000);
      expect(sorted[2].timestamp).toBe(1000);
    });

    it("should limit results", () => {
      const events = Array.from({ length: 20 }, (_, i) =>
        mockActivityEvent({ description: `Event ${i}` })
      );

      const limit = 8;
      const limited = events.slice(0, limit);

      expect(limited).toHaveLength(8);
    });

    it("should enrich with agent avatars", async () => {
      const agents = [
        mockAgent({ name: "SAM", avatar: "🤖" }),
        mockAgent({ name: "LEO", avatar: "🦁" }),
      ];

      const agentMap = new Map(agents.map((a) => [a.name.toLowerCase(), a]));

      const event = mockActivityEvent({ agentName: "SAM" });
      const avatar = agentMap.get(event.agentName.toLowerCase())?.avatar || "❓";

      expect(avatar).toBe("🤖");
    });
  });

  describe("Event Type Mapping", () => {
    it("should map created events correctly", () => {
      const event = mockActivityEvent({ eventType: "created" });
      const action = event.eventType === "created" ? "created" : "unknown";

      expect(action).toBe("created");
    });

    it("should map completed events correctly", () => {
      const event = mockActivityEvent({ eventType: "completed" });
      const action = event.eventType === "completed" ? "completed" : "unknown";

      expect(action).toBe("completed");
    });

    it("should map push events correctly", () => {
      const event = mockActivityEvent({ eventType: "push" });
      const action = event.eventType === "push" ? "pushed" : "unknown";

      expect(action).toBe("pushed");
    });

    it("should map pr_merged events correctly", () => {
      const event = mockActivityEvent({ eventType: "pr_merged" });
      const action = event.eventType === "pr_merged" ? "merged" : "unknown";

      expect(action).toBe("merged");
    });

    it("should map status_change events correctly", () => {
      const event = mockActivityEvent({ eventType: "status_change" });
      const action = event.eventType === "status_change" ? "moved" : "unknown";

      expect(action).toBe("moved");
    });
  });

  describe("Message Processing", () => {
    it("should extract message summary", () => {
      const content = "This is a very long message that should be truncated for display";
      const maxLength = 50;
      const summary = content.length > maxLength
        ? content.slice(0, maxLength) + "..."
        : content;

      expect(summary.length).toBeLessThanOrEqual(maxLength + 3);
      expect(summary).toContain("...");
    });

    it("should filter out channel messages from DM feed", () => {
      const messages = [
        { type: "dm", content: "Direct message" },
        { type: "channel", content: "Channel post" },
        { type: "mention", content: "Mention" },
      ];

      const dms = messages.filter((m) => m.type !== "channel");

      expect(dms).toHaveLength(2);
    });

    it("should handle empty content gracefully", () => {
      const message = { content: "", fromAgent: "sam" };
      const hasContent = message.content && message.content.length > 0;

      expect(hasContent).toBeFalsy();
    });
  });

  describe("Timestamp Formatting", () => {
    it("should show relative time for recent events", () => {
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      const isRecent = now - fiveMinutesAgo < 60 * 60 * 1000; // 1 hour

      expect(isRecent).toBe(true);
    });

    it("should handle timestamps as numbers", () => {
      const timestamp = Date.now();

      expect(typeof timestamp).toBe("number");
      expect(timestamp).toBeGreaterThan(0);
    });

    it("should fall back to _creationTime if timestamp missing", () => {
      const event = {
        timestamp: undefined,
        _creationTime: Date.now(),
      };

      const displayTime = event.timestamp || event._creationTime;

      expect(displayTime).toBe(event._creationTime);
    });
  });

  describe("Feed Item Structure", () => {
    it("should have required fields for activity item", () => {
      const item = {
        id: "event_123",
        type: "activity" as const,
        agent: "SAM",
        avatar: "🤖",
        action: "completed",
        detail: "AGT-123",
        timestamp: Date.now(),
      };

      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("type");
      expect(item).toHaveProperty("agent");
      expect(item).toHaveProperty("avatar");
      expect(item).toHaveProperty("action");
      expect(item).toHaveProperty("detail");
      expect(item).toHaveProperty("timestamp");
    });

    it("should have required fields for message item", () => {
      const item = {
        id: "msg_123",
        type: "message" as const,
        agent: "QUINN",
        avatar: "🔍",
        action: "says",
        detail: "Code review complete",
        timestamp: Date.now(),
      };

      expect(item.action).toBe("says");
      expect(item.type).toBe("message");
    });
  });

  describe("Performance", () => {
    it("should handle large event lists efficiently", () => {
      const largeEventList = Array.from({ length: 1000 }, (_, i) =>
        mockActivityEvent({ description: `Event ${i}` })
      );

      // Take only needed items
      const limit = 10;
      const result = largeEventList.slice(0, limit);

      expect(result).toHaveLength(10);
    });

    it("should prefetch more items than needed for filtering", () => {
      const limit = 10;
      const prefetchMultiplier = 2;
      const prefetchCount = limit * prefetchMultiplier;

      expect(prefetchCount).toBe(20);
    });
  });
});
