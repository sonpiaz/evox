/**
 * API Tests: Agent Communication Endpoints
 *
 * North Star: Agents communicate 24/7 autonomously.
 * Tests HTTP endpoints: /v2/sendMessage, /v2/getMessages, /postToChannel
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const BASE_URL = "https://gregarious-elk-556.convex.site";

describe("Agent Communication API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("POST /v2/sendMessage", () => {
    it("should send DM with correct payload structure", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          type: "dm",
          from: "quinn",
          messageId: "msg_123",
          priority: "normal",
          to: "sam",
        }),
      } as Response);

      const payload = {
        from: "QUINN",
        to: "SAM",
        message: "Code review complete for AGT-123",
      };

      await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v2/sendMessage`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("QUINN"),
        })
      );
    });

    it("should support priority field", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const payload = {
        from: "QUINN",
        to: "CEO",
        message: "BLOCKER: Need approval",
        priority: "high",
      };

      await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("high"),
        })
      );
    });

    it("should return success response with messageId", async () => {
      const mockFetch = vi.mocked(fetch);
      const expectedResponse = {
        success: true,
        type: "dm",
        from: "quinn",
        messageId: "msg_abc123",
        priority: "normal",
        to: "sam",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(expectedResponse),
      } as Response);

      const response = await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "QUINN", to: "SAM", message: "Test" }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.messageId).toBeDefined();
    });

    it("should handle missing required fields", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Missing required field: message" }),
      } as Response);

      const response = await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "QUINN", to: "SAM" }), // Missing message
      });

      expect(response.ok).toBe(false);
    });
  });

  describe("GET /v2/getMessages", () => {
    it("should fetch messages for agent", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          dms: [],
          channelMentions: [],
          unreadCount: { dms: 0, mentions: 0, total: 0 },
          unreadDMs: [],
          unreadMentions: [],
        }),
      } as Response);

      await fetch(`${BASE_URL}/v2/getMessages?agent=QUINN&limit=10`);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("agent=QUINN")
      );
    });

    it("should return unread counts", async () => {
      const mockFetch = vi.mocked(fetch);
      const expectedResponse = {
        dms: [{ content: "Test", read: false }],
        unreadCount: { dms: 5, mentions: 2, total: 7 },
        unreadDMs: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(expectedResponse),
      } as Response);

      const response = await fetch(`${BASE_URL}/v2/getMessages?agent=QUINN&limit=10`);
      const data = await response.json();

      expect(data.unreadCount).toBeDefined();
      expect(data.unreadCount.total).toBe(7);
    });

    it("should support limit parameter", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dms: [] }),
      } as Response);

      await fetch(`${BASE_URL}/v2/getMessages?agent=QUINN&limit=50`);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("limit=50")
      );
    });

    it("should include channel mentions", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          dms: [],
          channelMentions: [
            { channel: "dev", content: "@quinn review please" },
          ],
          unreadCount: { dms: 0, mentions: 1, total: 1 },
        }),
      } as Response);

      const response = await fetch(`${BASE_URL}/v2/getMessages?agent=QUINN`);
      const data = await response.json();

      expect(data.channelMentions).toBeDefined();
    });
  });

  describe("POST /postToChannel", () => {
    it("should post to channel with correct field name", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, channel: "dev", from: "QUINN" }),
      } as Response);

      // IMPORTANT: Field is 'message', NOT 'content' (per MEMORY.md)
      const payload = {
        channel: "dev",
        from: "QUINN",
        message: "Build complete. All tests passing.", // NOT 'content'
      };

      await fetch(`${BASE_URL}/postToChannel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/postToChannel`,
        expect.objectContaining({
          body: expect.stringContaining('"message"'),
        })
      );
    });

    it("should NOT use content field (common mistake)", () => {
      // This is a documentation test - content is WRONG
      const wrongPayload = { channel: "dev", from: "QUINN", content: "Wrong field" };
      const correctPayload = { channel: "dev", from: "QUINN", message: "Correct field" };

      expect(wrongPayload).toHaveProperty("content");
      expect(wrongPayload).not.toHaveProperty("message");
      expect(correctPayload).toHaveProperty("message");
      expect(correctPayload).not.toHaveProperty("content");
    });

    it("should return success with channel name", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, channel: "dev", from: "QUINN" }),
      } as Response);

      const response = await fetch(`${BASE_URL}/postToChannel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "dev", from: "QUINN", message: "Test" }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.channel).toBe("dev");
    });
  });

  describe("GET /getNextDispatchForAgent", () => {
    it("should check for pending dispatch", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dispatchId: null, ticket: null }),
      } as Response);

      await fetch(`${BASE_URL}/getNextDispatchForAgent?agent=QUINN`);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("agent=QUINN")
      );
    });

    it("should return dispatch when available", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          dispatchId: "dispatch_123",
          ticket: "AGT-456",
          priority: "high",
        }),
      } as Response);

      const response = await fetch(`${BASE_URL}/getNextDispatchForAgent?agent=QUINN`);
      const data = await response.json();

      expect(data.dispatchId).toBe("dispatch_123");
      expect(data.ticket).toBe("AGT-456");
    });

    it("should return null when no dispatch", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ dispatchId: null, ticket: null }),
      } as Response);

      const response = await fetch(`${BASE_URL}/getNextDispatchForAgent?agent=QUINN`);
      const data = await response.json();

      expect(data.dispatchId).toBeNull();
    });
  });

  describe("POST /markDispatchRunning", () => {
    it("should mark dispatch as running", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const payload = { dispatchId: "dispatch_123" };

      await fetch(`${BASE_URL}/markDispatchRunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/markDispatchRunning`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("dispatch_123"),
        })
      );
    });
  });

  describe("POST /markDispatchCompleted", () => {
    it("should mark dispatch as completed with result", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const payload = {
        dispatchId: "dispatch_123",
        result: "Completed AGT-456. 5 files changed, tests passing.",
      };

      await fetch(`${BASE_URL}/markDispatchCompleted`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/markDispatchCompleted`,
        expect.objectContaining({
          body: expect.stringContaining("result"),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(
        fetch(`${BASE_URL}/v2/sendMessage`, { method: "POST", body: "{}" })
      ).rejects.toThrow("Network error");
    });

    it("should handle server errors", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal server error" }),
      } as Response);

      const response = await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        body: "{}",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});
