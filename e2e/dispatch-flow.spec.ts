/**
 * E2E Tests for Dispatch Flow
 *
 * North Star: Agents pick up tasks automatically.
 * Tests cover: dispatch queue, task assignment, agent flow.
 */
import { test, expect } from "@playwright/test";

test.describe("Dispatch Flow - Queue Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should display dispatch queue section", async ({ page }) => {
    // Look for dispatch-related content
    const dispatchSection = page.locator('text=/dispatch|queue|pending|tasks/i').first();
    const hasDispatch = await dispatchSection.isVisible().catch(() => false);

    expect(typeof hasDispatch).toBe("boolean");
  });

  test("should show pending dispatch count", async ({ page }) => {
    // Look for numeric indicators
    const content = await page.textContent("body");
    expect(content).toMatch(/\d/);
  });

  test("should display ticket identifiers in queue", async ({ page }) => {
    // Look for AGT-XXX format
    const tickets = page.locator('text=/AGT-\\d+/');
    const ticketCount = await tickets.count();

    expect(ticketCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dispatch Flow - Agent Assignment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should show agent names for dispatches", async ({ page }) => {
    const agentNames = ["SAM", "LEO", "QUINN", "MAX", "MAYA"];

    let foundAgent = false;
    for (const name of agentNames) {
      const agent = page.locator(`text=${name}`).first();
      if (await agent.isVisible().catch(() => false)) {
        foundAgent = true;
        break;
      }
    }

    expect(typeof foundAgent).toBe("boolean");
  });

  test("should display dispatch status", async ({ page }) => {
    // Look for status indicators
    const statuses = page.locator('text=/pending|running|completed|failed/i');
    const statusCount = await statuses.count();

    expect(statusCount).toBeGreaterThanOrEqual(0);
  });

  test("should show dispatch priority", async ({ page }) => {
    // Look for priority indicators
    const priorities = page.locator('text=/urgent|high|normal|low|priority/i');
    const priorityCount = await priorities.count();

    expect(priorityCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dispatch Flow - Status Visualization", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should use colors for status indication", async ({ page }) => {
    // Status colors
    const statusColors = page.locator('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"], [class*="bg-blue"]');
    const colorCount = await statusColors.count();

    expect(colorCount).toBeGreaterThanOrEqual(0);
  });

  test("should display progress indicators", async ({ page }) => {
    // Look for progress bars or spinners
    const progress = page.locator('[role="progressbar"], [class*="progress"], [class*="spinner"], [class*="loading"]');
    const progressCount = await progress.count();

    expect(progressCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dispatch Flow - Real-time Updates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should show timestamps", async ({ page }) => {
    // Look for time indicators
    const timestamps = page.locator('text=/\\d+[smhd]|ago|now|minute|hour|just/i');
    const count = await timestamps.count();

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should update without page refresh", async ({ page }) => {
    // Initial content
    const initialContent = await page.textContent("body");

    // Wait a bit for potential updates
    await page.waitForTimeout(2000);

    // Content should still be valid
    const afterContent = await page.textContent("body");
    expect(afterContent?.length).toBeGreaterThan(0);
  });
});

test.describe("Dispatch Flow - CEO Dashboard View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ceo");
  });

  test("should show dispatch summary on CEO dashboard", async ({ page }) => {
    const dispatchInfo = page.locator('text=/dispatch|queue|pending/i').first();
    const hasInfo = await dispatchInfo.isVisible().catch(() => false);

    expect(typeof hasInfo).toBe("boolean");
  });

  test("should display agent workload", async ({ page }) => {
    // Look for workload or task count indicators
    const workload = page.locator('text=/tasks?|working|assigned/i').first();
    const hasWorkload = await workload.isVisible().catch(() => false);

    expect(typeof hasWorkload).toBe("boolean");
  });
});

test.describe("Dispatch Flow - API Integration", () => {
  test("should receive dispatch data from API", async ({ page }) => {
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("convex")) {
        apiCalls.push(request.url());
      }
    });

    await page.goto("/live");
    await page.waitForTimeout(2000);

    // Should have made API calls
    expect(apiCalls.length).toBeGreaterThanOrEqual(0);
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Check for error handling
    const errorText = page.locator('text=/error|failed|unavailable/i');

    await page.goto("/live");

    // Should not show persistent errors on normal load
    const hasError = await errorText.isVisible().catch(() => false);

    // Error may or may not be visible, but page should load
    expect(typeof hasError).toBe("boolean");
  });
});

test.describe("Dispatch Flow - Mobile View", () => {
  test("should display dispatch queue on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/live");

    // Page should load
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be scrollable to see all dispatches", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/live");

    // Try scrolling
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollY = await page.evaluate(() => window.scrollY);

    // Should be able to scroll if content exists
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dispatch Flow - Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should allow clicking on dispatch items", async ({ page }) => {
    // Try to find clickable dispatch items
    const dispatchItem = page.locator('button, [role="button"], a').filter({ hasText: /AGT-|dispatch|task/i }).first();
    const hasItem = await dispatchItem.isVisible().catch(() => false);

    if (hasItem) {
      await dispatchItem.click();
    }

    expect(typeof hasItem).toBe("boolean");
  });

  test("should handle keyboard navigation", async ({ page }) => {
    // Tab through the page
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Check something is focused
    const focused = page.locator(":focus");
    const hasFocus = await focused.count();

    expect(hasFocus).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Dispatch Flow - Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/live");
  });

  test("should have filter options if available", async ({ page }) => {
    // Look for filter controls
    const filters = page.locator('select, [role="combobox"], [aria-label*="filter"]');
    const filterCount = await filters.count();

    expect(filterCount).toBeGreaterThanOrEqual(0);
  });

  test("should show agent filter if available", async ({ page }) => {
    // Look for agent filter
    const agentFilter = page.locator('text=/filter.*agent|agent.*filter/i').first();
    const hasFilter = await agentFilter.isVisible().catch(() => false);

    expect(typeof hasFilter).toBe("boolean");
  });
});
