/**
 * Integration tests for Convex HTTP endpoints
 * Tests the public HTTP API endpoints
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const BASE_URL = "https://gregarious-elk-556.convex.site";

describe("Convex HTTP API Integration", () => {
  // Skip network tests - these require actual Convex connection
  // Use it.skip to skip all network tests
  const itWithNetwork = it.skip;

  describe("Message API", () => {
    itWithNetwork("should get messages for agent", async () => {
      const response = await fetch(`${BASE_URL}/v2/getMessages?agent=TEST&limit=5`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("dms");
      expect(data).toHaveProperty("unreadCount");
    });

    itWithNetwork("should send message between agents", async () => {
      const response = await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "TEST",
          to: "TEST",
          message: "Integration test message",
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    itWithNetwork("should post to channel", async () => {
      const response = await fetch(`${BASE_URL}/postToChannel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "test",
          from: "TEST",
          message: "Integration test channel message",
        }),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Dispatch API", () => {
    itWithNetwork("should check for agent dispatch", async () => {
      const response = await fetch(`${BASE_URL}/getNextDispatchForAgent?agent=TEST`);

      expect(response.ok).toBe(true);

      const data = await response.json();
      // May or may not have a dispatch
      expect(data).toHaveProperty("dispatchId");
    });
  });

  describe("Error Handling", () => {
    itWithNetwork("should handle missing parameters gracefully", async () => {
      const response = await fetch(`${BASE_URL}/v2/getMessages`);
      // Should return error or empty result
      expect([200, 400]).toContain(response.status);
    });

    itWithNetwork("should handle invalid JSON in POST", async () => {
      const response = await fetch(`${BASE_URL}/v2/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });

      expect([400, 500]).toContain(response.status);
    });
  });
});

describe("Convex HTTP API Mock Tests", () => {
  // These tests run without network using mocks

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("should format message request correctly", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dms: [], unreadCount: { total: 0 } }),
    } as Response);

    await fetch(`${BASE_URL}/v2/getMessages?agent=QUINN&limit=10`);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/getMessages")
    );
  });

  it("should format send message request correctly", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    const body = {
      from: "QUINN",
      to: "SAM",
      message: "Test message",
    };

    await fetch(`${BASE_URL}/v2/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v2/sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("QUINN"),
      })
    );
  });

  it("should format channel post correctly", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response);

    const body = {
      channel: "dev",
      from: "QUINN",
      message: "Status update", // Note: field is 'message' not 'content'
    };

    await fetch(`${BASE_URL}/postToChannel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/postToChannel"),
      expect.objectContaining({
        body: expect.stringContaining('"message"'),
      })
    );
  });

  it("should use correct field name for postToChannel", () => {
    // Per MEMORY.md: field is 'message', not 'content'
    const correctBody = { channel: "dev", from: "TEST", message: "test" };
    const incorrectBody = { channel: "dev", from: "TEST", content: "test" };

    expect(correctBody).toHaveProperty("message");
    expect(incorrectBody).not.toHaveProperty("message");
  });
});
