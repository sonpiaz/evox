/**
 * EVOX Analytics Client Library
 *
 * Centralized analytics utilities for dashboard tracking:
 * - Page view tracking
 * - Agent activity monitoring
 * - Task completion metrics
 * - Performance data aggregation
 * - Cost tracking helpers
 *
 * Usage:
 *   import { analytics } from '@/lib/analytics';
 *   analytics.trackPageView('/dashboard');
 *   analytics.trackAgentAction('sam', 'task_completed', { taskId: 'AGT-123' });
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// =============================================================================
// TYPES
// =============================================================================

export interface PageViewEvent {
  page: string;
  referrer?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp?: number;
}

export interface AgentMetrics {
  name: string;
  status: string;
  tasksCompleted: number;
  tasksFailed: number;
  totalCost: number;
  avgDuration: number;
  utilization: number;
  lastSeen: number;
}

export interface DashboardAnalytics {
  date: string;
  generatedAt: number;
  totals: {
    totalAgents: number;
    onlineAgents: number;
    totalTasksToday: number;
    totalCostToday: number;
    totalEventsToday: number;
    tasksInProgress: number;
    tasksPending: number;
    tasksCompleted: number;
  };
  agents: AgentMetrics[];
  tasksByStatus: Record<string, number>;
  recentEvents: unknown[];
}

export interface TaskCompletionTrend {
  date: string;
  completed: number;
  failed: number;
  started: number;
  completionRate: number;
}

export interface CostSummary {
  days: number;
  totalCost: number;
  totalTokens: number;
  avgCostPerDay: number;
  byAgent: {
    agentName: string;
    totalCost: number;
    totalTokens: number;
    taskCount: number;
  }[];
  dailyTrend: { date: string; cost: number }[];
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const SESSION_KEY = "evox_analytics_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "server";

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// =============================================================================
// ANALYTICS CLASS
// =============================================================================

class Analytics {
  private convexUrl: string;
  private client: ConvexHttpClient | null = null;
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  constructor() {
    this.convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  }

  private getClient(): ConvexHttpClient {
    if (!this.client && this.convexUrl) {
      this.client = new ConvexHttpClient(this.convexUrl);
    }
    if (!this.client) {
      throw new Error("Convex URL not configured");
    }
    return this.client;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error("[Analytics] Queue task failed:", error);
        }
      }
    }
    this.isProcessing = false;
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processQueue();
  }

  /**
   * Track a page view event
   */
  trackPageView(page: string, options: Partial<PageViewEvent> = {}): void {
    if (typeof window === "undefined") return;

    this.enqueue(async () => {
      try {
        const client = this.getClient();
        await client.mutation(api.analytics.recordPageView, {
          page,
          referrer: options.referrer || document.referrer || undefined,
          userAgent: options.userAgent || navigator.userAgent || undefined,
          sessionId: options.sessionId || getSessionId(),
        });
      } catch (error) {
        console.error("[Analytics] Failed to track page view:", error);
      }
    });
  }

  /**
   * Track an agent action (for external integrations)
   */
  trackAgentAction(
    agentName: string,
    action: string,
    metadata?: Record<string, unknown>
  ): void {
    console.log(`[Analytics] Agent action: ${agentName} - ${action}`, metadata);
    // Agent actions are tracked via Convex mutations directly
    // This is a client-side logging helper
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return getSessionId();
  }
}

// =============================================================================
// METRIC HELPERS
// =============================================================================

/**
 * Calculate completion rate from tasks
 */
export function calculateCompletionRate(
  completed: number,
  failed: number
): number {
  const total = completed + failed;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Calculate velocity (tasks per hour)
 */
export function calculateVelocity(
  tasksCompleted: number,
  hours: number
): number {
  if (hours === 0) return 0;
  return Math.round((tasksCompleted / hours) * 10) / 10;
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

/**
 * Format duration in minutes for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculate utilization percentage
 */
export function calculateUtilization(
  activeMinutes: number,
  idleMinutes: number,
  offlineMinutes: number
): number {
  const total = activeMinutes + idleMinutes;
  if (total === 0) return 0;
  return Math.round((activeMinutes / total) * 100);
}

/**
 * Get status color for agent
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "online":
      return "bg-green-500";
    case "busy":
      return "bg-yellow-500";
    case "idle":
      return "bg-zinc-500";
    case "offline":
      return "bg-red-500";
    default:
      return "bg-zinc-500";
  }
}

/**
 * Get trend indicator
 */
export function getTrendIndicator(
  current: number,
  previous: number
): { direction: "up" | "down" | "stable"; percentage: number } {
  if (previous === 0) {
    return { direction: current > 0 ? "up" : "stable", percentage: 0 };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) {
    return { direction: "stable", percentage: 0 };
  }
  return {
    direction: change > 0 ? "up" : "down",
    percentage: Math.abs(Math.round(change)),
  };
}

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Get date string in YYYY-MM-DD format
 */
export function getDateString(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Get hour bucket string in YYYY-MM-DDTHH format
 */
export function getHourBucket(date: Date = new Date()): string {
  return `${getDateString(date)}T${String(date.getUTCHours()).padStart(2, "0")}`;
}

/**
 * Get date range for last N days
 */
export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return {
    start: getDateString(start),
    end: getDateString(end),
  };
}

/**
 * Parse relative time string to timestamp
 * e.g., "1h" -> timestamp 1 hour ago
 */
export function parseRelativeTime(relative: string): number {
  const now = Date.now();
  const match = relative.match(/^(\d+)([mhd])$/);
  if (!match) return now;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m":
      return now - value * 60 * 1000;
    case "h":
      return now - value * 60 * 60 * 1000;
    case "d":
      return now - value * 24 * 60 * 60 * 1000;
    default:
      return now;
  }
}

// =============================================================================
// AGGREGATION HELPERS
// =============================================================================

/**
 * Aggregate metrics by time bucket
 */
export function aggregateByTimeBucket<T extends { timestamp: number }>(
  items: T[],
  bucketSizeMs: number
): Map<number, T[]> {
  const buckets = new Map<number, T[]>();

  for (const item of items) {
    const bucket = Math.floor(item.timestamp / bucketSizeMs) * bucketSizeMs;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket)!.push(item);
  }

  return buckets;
}

/**
 * Calculate moving average
 */
export function movingAverage(values: number[], windowSize: number): number[] {
  if (values.length < windowSize) return values;

  const result: number[] = [];
  for (let i = windowSize - 1; i < values.length; i++) {
    const window = values.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, v) => sum + v, 0) / windowSize;
    result.push(avg);
  }
  return result;
}

// =============================================================================
// EXPORT SINGLETON
// =============================================================================

export const analytics = new Analytics();

// Default export for convenience
export default analytics;
