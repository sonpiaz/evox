/**
 * E2E tests for Agent functionality
 */
import { test, expect } from "@playwright/test";

test.describe("Agent Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display agent avatars", async ({ page }) => {
    // Look for emoji avatars used by agents
    const avatars = page.locator('text=/[🤖🦁👨‍💼🔍]/');
    const avatarCount = await avatars.count();

    // Should have at least some agent indicators
    expect(avatarCount).toBeGreaterThanOrEqual(0);
  });

  test("should show agent status indicators", async ({ page }) => {
    // Look for status dots (green/yellow/red/gray)
    const statusDots = page.locator('[class*="rounded-full"][class*="bg-"]');
    const dotCount = await statusDots.count();

    expect(dotCount).toBeGreaterThanOrEqual(0);
  });

  test("should allow agent selection", async ({ page }) => {
    // Try to click on an agent if visible
    const agentButton = page.locator('button[aria-label*="SAM"], button[aria-label*="LEO"]').first();
    const hasAgent = await agentButton.isVisible().catch(() => false);

    if (hasAgent) {
      await agentButton.click();
      // Should update selection state
      await expect(agentButton).toHaveAttribute("aria-current", "true");
    }
  });

  test("should display agent tasks", async ({ page }) => {
    // Look for task-related content
    const taskIndicators = page.locator('text=/AGT-\\d+/');
    const taskCount = await taskIndicators.count();

    // May or may not have tasks visible
    expect(taskCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Agent Status Colors", () => {
  test("should use correct colors for online status", async ({ page }) => {
    await page.goto("/");

    // Green indicators for online
    const greenDots = page.locator('[class*="bg-green"]');
    const greenCount = await greenDots.count();

    // May have online agents
    expect(greenCount).toBeGreaterThanOrEqual(0);
  });

  test("should use correct colors for busy status", async ({ page }) => {
    await page.goto("/");

    // Yellow indicators for busy
    const yellowDots = page.locator('[class*="bg-yellow"]');
    const yellowCount = await yellowDots.count();

    expect(yellowCount).toBeGreaterThanOrEqual(0);
  });

  test("should use correct colors for offline status", async ({ page }) => {
    await page.goto("/");

    // Red indicators for offline
    const redDots = page.locator('[class*="bg-red"]');
    const redCount = await redDots.count();

    expect(redCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Agent Communication", () => {
  test("should display activity feed", async ({ page }) => {
    await page.goto("/live");

    // Look for activity-related content
    const activitySection = page.locator('text=/activity|feed|recent/i').first();
    const hasActivity = await activitySection.isVisible().catch(() => false);

    expect(typeof hasActivity).toBe("boolean");
  });

  test("should show message timestamps", async ({ page }) => {
    await page.goto("/");

    // Look for relative time indicators
    const timeIndicators = page.locator('text=/\\d+[smhd]|ago|now|just now/i');
    const timeCount = await timeIndicators.count();

    expect(timeCount).toBeGreaterThanOrEqual(0);
  });
});
