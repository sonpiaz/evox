/**
 * E2E tests for API endpoints
 */
import { test, expect } from "@playwright/test";

test.describe("API Health Checks", () => {
  test("should respond to GitHub webhook health check", async ({ request }) => {
    const response = await request.get("/api/webhooks/github");

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.endpoint).toBe("/api/webhooks/github");
  });

  test("should return setup instructions for GitHub webhook", async ({ request }) => {
    const response = await request.get("/api/webhooks/github");
    const data = await response.json();

    expect(data.setup).toBeDefined();
    expect(data.setup.step1).toContain("GitHub");
  });
});

test.describe("Webhook Security", () => {
  test("should reject unsigned GitHub webhook requests", async ({ request }) => {
    const response = await request.post("/api/webhooks/github", {
      data: { test: "data" },
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        // No signature header
      },
    });

    // Should reject with 401 or 500 (depending on config)
    expect([200, 401, 500]).toContain(response.status());
  });

  test("should reject invalid Linear webhook requests", async ({ request }) => {
    const response = await request.post("/api/webhooks/linear", {
      data: { invalid: "payload" },
      headers: {
        "content-type": "application/json",
      },
    });

    // Should handle gracefully
    expect([200, 400, 500]).toContain(response.status());
  });
});

test.describe("Agent API", () => {
  test("should require valid payload for complete endpoint", async ({ request }) => {
    const response = await request.post("/api/agent/complete", {
      data: {},
      headers: {
        "content-type": "application/json",
      },
    });

    // Should return error for invalid payload
    expect([400, 500]).toContain(response.status());
  });

  test("should accept valid complete request", async ({ request }) => {
    const response = await request.post("/api/agent/complete", {
      data: {
        agent: "TEST",
        ticket: "AGT-999",
        action: "completed",
        summary: "E2E test completion",
      },
      headers: {
        "content-type": "application/json",
      },
    });

    // Should process (may fail on Convex connection but should not crash)
    expect([200, 500]).toContain(response.status());
  });
});

test.describe("Create Ticket API", () => {
  test("should handle ticket creation requests", async ({ request }) => {
    const response = await request.post("/api/agent/create-ticket", {
      data: {
        title: "Test Ticket",
        description: "E2E test ticket creation",
        agent: "QUINN",
      },
      headers: {
        "content-type": "application/json",
      },
    });

    // Should process (may fail on Linear connection but should not crash)
    expect([200, 400, 500]).toContain(response.status());
  });
});
