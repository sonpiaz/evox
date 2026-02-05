# Self-Healing Patterns for EVOX Agents

> **From:** COLE (Research) | **Date:** 2026-02-05
> **Supporting:** Phase 2 - Self-Healing System

---

## Overview

This document provides implementation-ready patterns for EVOX agents to run 24/7 without human intervention. Based on research from circuit breaker implementations, agent recovery patterns, and timeout handling best practices.

---

## 1. Circuit Breaker Pattern (Reference for SAM)

SAM completed 2.1. This documents the pattern for reference.

### States

```
┌─────────┐    failures >= threshold    ┌─────────┐
│ CLOSED  │ ─────────────────────────► │  OPEN   │
│ (normal)│                             │ (fail)  │
└────┬────┘                             └────┬────┘
     │                                       │
     │ ◄──────────── success ───────────     │
     │                                       │
     │         ┌───────────┐                 │
     └─────────│ HALF-OPEN │ ◄─── timeout ───┘
               │  (test)   │
               └───────────┘
```

### TypeScript Implementation

```typescript
// lib/evox/circuit-breaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;    // Open after N failures
  resetTimeout: number;        // Try again after N ms
  halfOpenRequests: number;    // Test requests before closing
}

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 30000,
      halfOpenRequests: config.halfOpenRequests ?? 3,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.state = 'half-open';
        this.successes = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.halfOpenRequests) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const linearApiBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000,  // 1 minute
});

async function callLinearAPI() {
  return linearApiBreaker.execute(async () => {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LINEAR_API_KEY}` },
      body: JSON.stringify({ query: '...' }),
    });
    if (!response.ok) throw new Error(`Linear API error: ${response.status}`);
    return response.json();
  });
}
```

**Sources:** [Circuit Breaker in TypeScript](https://dev.to/wallacefreitas/circuit-breaker-pattern-in-nodejs-and-typescript-enhancing-resilience-and-stability-bfi), [Martin Fowler's Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## 2. Stuck Task Detection (For SAM 2.2)

### Heartbeat-Based Detection

```typescript
// convex/agentHealth.ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Agent sends heartbeat every 30 seconds
export const heartbeat = mutation({
  args: {
    agentName: v.string(),
    currentTask: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query('agents')
      .filter(q => q.eq(q.field('name'), args.agentName))
      .first();

    if (agent) {
      await ctx.db.patch(agent._id, {
        lastHeartbeat: Date.now(),
        currentTask: args.currentTask,
        status: args.status,
      });
    }
  },
});

// Check for stuck agents (no heartbeat > 5 min)
export const checkStuckAgents = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query('agents').collect();
    const now = Date.now();
    const STUCK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    return agents.filter(agent => {
      const lastSeen = agent.lastHeartbeat || 0;
      return (now - lastSeen) > STUCK_THRESHOLD;
    });
  },
});
```

### Task Timeout Detection

```typescript
// convex/taskMonitor.ts
export const checkStuckTasks = query({
  handler: async (ctx) => {
    const now = Date.now();
    const TASK_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const inProgressTasks = await ctx.db
      .query('tasks')
      .filter(q => q.eq(q.field('status'), 'in_progress'))
      .collect();

    return inProgressTasks.filter(task => {
      const startedAt = task.startedAt || task.updatedAt;
      return (now - startedAt) > TASK_TIMEOUT;
    });
  },
});

// Auto-escalate stuck tasks
export const escalateStuckTask = mutation({
  args: { taskId: v.id('tasks') },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;

    // Mark as blocked
    await ctx.db.patch(taskId, {
      status: 'blocked',
      blockedReason: 'Auto-detected: stuck > 30 min',
      blockedAt: Date.now(),
    });

    // Create alert
    await ctx.db.insert('alerts', {
      type: 'task_stuck',
      severity: 'warning',
      message: `Task ${task.linearIdentifier || taskId} stuck for 30+ minutes`,
      taskId,
      agentName: task.agentName,
      createdAt: Date.now(),
    });

    // Notify in channel
    await ctx.db.insert('messages', {
      channel: 'dev',
      from: 'SYSTEM',
      content: `⚠️ STUCK: ${task.linearIdentifier || 'Task'} has been in progress for 30+ min. Auto-escalated.`,
      createdAt: Date.now(),
    });
  },
});
```

---

## 3. Auto-Recovery Patterns

### Exponential Backoff with Jitter

```typescript
// lib/evox/retry.ts
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    jitterFactor = 0.5,
  } = config;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries - 1) break;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped)
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = exponentialDelay * jitterFactor * Math.random();
      const totalDelay = exponentialDelay + jitter;

      console.log(
        `Attempt ${attempt + 1} failed. Retrying in ${Math.round(totalDelay)}ms`
      );

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}

// Usage
const result = await retryWithBackoff(
  () => callLinearAPI(),
  { maxRetries: 3, baseDelay: 2000 }
);
```

### Checkpoint-Based Recovery

```typescript
// lib/evox/checkpoint.ts
interface TaskCheckpoint {
  taskId: string;
  step: number;
  stepName: string;
  completedAt: number;
  state: Record<string, unknown>;
}

class CheckpointManager {
  private checkpoints: Map<string, TaskCheckpoint[]> = new Map();

  save(taskId: string, stepName: string, state: Record<string, unknown>) {
    const checkpoints = this.checkpoints.get(taskId) || [];
    checkpoints.push({
      taskId,
      step: checkpoints.length,
      stepName,
      completedAt: Date.now(),
      state,
    });
    this.checkpoints.set(taskId, checkpoints);
  }

  getLastCheckpoint(taskId: string): TaskCheckpoint | null {
    const checkpoints = this.checkpoints.get(taskId);
    return checkpoints?.[checkpoints.length - 1] || null;
  }

  async recoverFrom(taskId: string): Promise<TaskCheckpoint | null> {
    const checkpoint = this.getLastCheckpoint(taskId);
    if (checkpoint) {
      console.log(`Recovering task ${taskId} from step ${checkpoint.stepName}`);
      return checkpoint;
    }
    return null;
  }
}

// Usage in task execution
async function executeTask(task: Task) {
  const checkpoint = new CheckpointManager();
  const existingCheckpoint = await checkpoint.recoverFrom(task.id);

  const steps = [
    { name: 'read_files', fn: readRelevantFiles },
    { name: 'analyze', fn: analyzeCode },
    { name: 'implement', fn: implementChanges },
    { name: 'test', fn: runTests },
    { name: 'commit', fn: commitChanges },
  ];

  const startStep = existingCheckpoint?.step || 0;

  for (let i = startStep; i < steps.length; i++) {
    const step = steps[i];
    const result = await step.fn(task, existingCheckpoint?.state);
    checkpoint.save(task.id, step.name, result);
  }
}
```

---

## 4. Rate Limit Handling (For SAM 2.4)

### Token Bucket Algorithm

```typescript
// lib/evox/rate-limiter.ts
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }

  async acquire(tokens = 1): Promise<void> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    // Wait for tokens to be available
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
  }
}

// Rate limiters for external APIs
const rateLimiters = {
  linear: new TokenBucket(100, 10),    // 100 burst, 10/sec
  github: new TokenBucket(5000, 83),   // 5000/hour = ~83/min
  convex: new TokenBucket(1000, 100),  // 1000 burst, 100/sec
};

// Usage
async function rateLimitedLinearCall() {
  await rateLimiters.linear.acquire();
  return callLinearAPI();
}
```

### 429 Response Handling

```typescript
async function handleRateLimitedRequest<T>(
  fn: () => Promise<Response>,
  name: string
): Promise<T> {
  const response = await fn();

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : 60000; // Default 1 minute

    console.log(`Rate limited by ${name}. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Retry once
    const retryResponse = await fn();
    if (!retryResponse.ok) {
      throw new Error(`${name} still rate limiting after retry`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    throw new Error(`${name} error: ${response.status}`);
  }

  return response.json();
}
```

---

## 5. Context Auto-Compact (For SAM 2.3)

### Progressive Summarization

```typescript
// When context approaches limit, summarize older messages
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function compactContext(
  messages: Message[],
  maxTokens: number,
  currentTokens: number
): Message[] {
  if (currentTokens < maxTokens * 0.8) {
    return messages; // Not near limit
  }

  // Keep: System prompt + last 10 messages
  const systemPrompt = messages.find(m => m.role === 'system');
  const recentMessages = messages.slice(-10);
  const oldMessages = messages.slice(1, -10); // Exclude system and recent

  // Summarize old messages
  const summary = summarizeMessages(oldMessages);

  return [
    systemPrompt!,
    {
      role: 'assistant',
      content: `[Previous context summary]\n${summary}`,
      timestamp: Date.now(),
    },
    ...recentMessages,
  ];
}

function summarizeMessages(messages: Message[]): string {
  // Group by topic/task
  const taskGroups = new Map<string, string[]>();

  for (const msg of messages) {
    const taskMatch = msg.content.match(/AGT-\d+/);
    const task = taskMatch ? taskMatch[0] : 'general';
    const existing = taskGroups.get(task) || [];
    existing.push(msg.content.slice(0, 100));
    taskGroups.set(task, existing);
  }

  // Generate summary
  let summary = '';
  for (const [task, contents] of taskGroups) {
    summary += `- ${task}: ${contents.length} messages\n`;
  }

  return summary;
}
```

---

## 6. Health Monitoring Dashboard (For LEO 2.5)

### Alert Data Structure

```typescript
// convex/schema.ts addition
alerts: defineTable({
  type: v.string(),        // 'agent_offline' | 'task_stuck' | 'api_error' | 'build_failed'
  severity: v.string(),    // 'critical' | 'warning' | 'info'
  message: v.string(),
  agentName: v.optional(v.string()),
  taskId: v.optional(v.id('tasks')),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  acknowledgedAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
}),
```

### Alert Query for Dashboard

```typescript
// convex/alerts.ts
export const getActiveAlerts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query('alerts')
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .order('desc')
      .take(20);
  },
});

export const getAlertCounts = query({
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query('alerts')
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .collect();

    return {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    };
  },
});
```

---

## Summary: Implementation Priority

| Pattern | Owner | Status | File |
|---------|-------|--------|------|
| Circuit Breaker | SAM | ✅ Done | lib/evox/circuit-breaker.ts |
| Stuck Detection | SAM | ✅ Done | convex/agentHealth.ts |
| Retry with Backoff | SAM | ✅ Done | lib/evox/retry.ts |
| Rate Limiting | SAM | ⬜ Todo | lib/evox/rate-limiter.ts |
| Context Compact | SAM | 🔄 In Progress | lib/evox/context.ts |
| Alert System | LEO | ⬜ Todo | convex/alerts.ts |

---

## Sources

- [Circuit Breaker in TypeScript](https://dev.to/wallacefreitas/circuit-breaker-pattern-in-nodejs-and-typescript-enhancing-resilience-and-stability-bfi)
- [Martin Fowler's Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Error Recovery Strategies](https://www.gocodeo.com/post/error-recovery-and-fallback-strategies-in-ai-agent-development)
- [Temporal Workflows for Agents](https://www.waylandz.com/ai-agent-book-en/chapter-21-temporal-workflows/)
- [Active Agent Retries](https://docs.activeagents.ai/framework/retries)

---

*Created: 2026-02-05 by COLE*
*Supporting: Phase 2 Self-Healing (Feb 12-18)*
