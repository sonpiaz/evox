# Agent Orchestration Best Practices

> **Created by:** COLE | **Date:** 2026-02-05 | **Purpose:** Research supporting AGT-251 "100x Autonomy"

---

## TL;DR — Key Patterns for EVOX

| Pattern | What It Solves | Implementation Priority |
|---------|----------------|------------------------|
| **Exponential Backoff + Jitter** | API failures, rate limits | P0 - Critical |
| **Circuit Breaker** | Cascading failures | P0 - Critical |
| **Hierarchical Memory** | Context loss, repeated mistakes | P1 - High |
| **Handoff Protocol** | Agent-to-agent task transfer | P1 - High |
| **Heartbeat Monitoring** | Silent failures, zombies | P0 - Already have |
| **Self-Assignment Queue** | Idle agents, wasted capacity | P1 - High |

---

## 1. Self-Healing Patterns

### 1.1 Exponential Backoff with Jitter

**Problem:** API calls fail, agents retry immediately, create thundering herd.

**Solution:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const exponentialDelay = baseDelay * Math.pow(2, attempt);

      // Add jitter: random 0-100% of delay to prevent thundering herd
      const jitter = Math.random() * exponentialDelay;
      const totalDelay = exponentialDelay + jitter;

      console.log(`Attempt ${attempt + 1} failed. Retrying in ${totalDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  throw lastError!;
}
```

**EVOX Application:**
- Use in `agent-work-loop.sh` for API calls
- Apply to Linear API, Convex mutations, external services
- Log retry attempts to `performanceMetrics` for visibility

### 1.2 Circuit Breaker Pattern

**Problem:** External service is down, agents keep retrying, waste resources.

**Solution:**
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,      // Open after 5 failures
    private resetTimeout: number = 30000 // Try again after 30s
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
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
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log('Circuit breaker OPENED - external service unhealthy');
    }
  }
}
```

**EVOX Application:**
- Create circuit breakers for: Linear API, GitHub API, Vercel API
- When open, agents should:
  1. Log the issue
  2. Work on tasks that don't need that service
  3. Alert in #dev channel

### 1.3 Health Check and Recovery

**Pattern:** Agents self-diagnose and auto-recover.

```bash
# health-check.sh - Run every 5 minutes
#!/bin/bash

check_convex() {
  curl -s --max-time 5 "$CONVEX_URL/health" > /dev/null
  return $?
}

check_linear() {
  curl -s --max-time 5 -H "Authorization: $LINEAR_API_KEY" \
    "https://api.linear.app/graphql" -d '{"query":"{ viewer { id } }"}' > /dev/null
  return $?
}

recover_agent() {
  local agent=$1
  echo "Attempting recovery for $agent..."

  # Kill zombie processes
  pkill -f "agent-work-loop.*$agent" 2>/dev/null

  # Wait for cleanup
  sleep 2

  # Restart
  ./scripts/agent-work-loop.sh "$agent" &
}

# Main health check loop
main() {
  if ! check_convex; then
    echo "ALERT: Convex unhealthy"
    # Don't recover - wait for Convex
    exit 1
  fi

  if ! check_linear; then
    echo "WARNING: Linear API unhealthy - continuing with cached data"
  fi

  # Check each agent is responsive
  for agent in SAM LEO QUINN MAX; do
    last_heartbeat=$(get_last_heartbeat "$agent")
    if [ $(($(date +%s) - last_heartbeat)) -gt 300 ]; then
      echo "Agent $agent unresponsive - recovering"
      recover_agent "$agent"
    fi
  done
}
```

---

## 2. Multi-Agent Coordination

### 2.1 Task Handoff Protocol

**Problem:** Agent A finishes work, Agent B needs to continue. Information lost.

**Solution: Structured Handoff Document**

```typescript
interface TaskHandoff {
  from: string;           // "SAM"
  to: string;             // "LEO"
  ticket: string;         // "AGT-275"

  context: {
    summary: string;      // "API endpoint created for user profiles"
    filesChanged: string[];  // ["convex/users.ts", "convex/schema.ts"]
    decisions: string[];  // ["Used Zod for validation", "Added rate limiting"]
    openQuestions: string[]; // ["Should cache expire in 1h or 24h?"]
  };

  nextSteps: {
    action: string;       // "Create UI component for profile page"
    acceptanceCriteria: string[]; // ["Shows user name", "Has edit button"]
    blockers: string[];   // ["Waiting for design mockup"]
  };

  artifacts: {
    prUrl?: string;       // "https://github.com/..."
    docsUrl?: string;     // "https://linear.app/..."
    testResults?: string; // "All 12 tests passing"
  };
}
```

**Implementation:**
```typescript
// convex/handoffs.ts
export const createHandoff = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    ticket: v.string(),
    context: v.object({
      summary: v.string(),
      filesChanged: v.array(v.string()),
      decisions: v.array(v.string()),
      openQuestions: v.array(v.string()),
    }),
    nextSteps: v.object({
      action: v.string(),
      acceptanceCriteria: v.array(v.string()),
      blockers: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Create handoff record
    const handoffId = await ctx.db.insert("handoffs", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });

    // Create dispatch for receiving agent
    await ctx.db.insert("dispatches", {
      to: args.to,
      ticket: args.ticket,
      action: `Continue: ${args.nextSteps.action}`,
      priority: "normal",
      status: "pending",
      handoffId,
    });

    // Notify in channel
    await ctx.db.insert("messages", {
      channel: "dev",
      from: args.from,
      content: `Handing off ${args.ticket} to @${args.to}: ${args.nextSteps.action}`,
    });

    return handoffId;
  },
});
```

### 2.2 Dependency Graph Resolution

**Problem:** Tasks have dependencies. Agents work on blocked tasks.

**Solution:**
```typescript
interface TaskNode {
  id: string;
  agent: string;
  blockedBy: string[];  // Task IDs this depends on
  blocks: string[];     // Task IDs that depend on this
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

function getNextAvailableTask(
  tasks: TaskNode[],
  agentSkills: string[]
): TaskNode | null {
  // Find tasks that:
  // 1. Are pending (not started, not blocked)
  // 2. Have no unfinished dependencies
  // 3. Match agent's skills

  const availableTasks = tasks.filter(task => {
    if (task.status !== 'pending') return false;

    // Check all dependencies are completed
    const dependencies = task.blockedBy.map(id =>
      tasks.find(t => t.id === id)
    );
    const allDepsComplete = dependencies.every(
      dep => dep?.status === 'completed'
    );

    return allDepsComplete;
  });

  // Sort by: priority > number of blocked tasks > creation time
  return availableTasks.sort((a, b) => {
    // Tasks that unblock more work should be prioritized
    return b.blocks.length - a.blocks.length;
  })[0] || null;
}
```

### 2.3 Parallel Execution with Sync Points

**Pattern:** Multiple agents work in parallel, sync at checkpoints.

```
┌─────────────────────────────────────────────────────────────┐
│                      PARALLEL PHASE                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│     SAM      │     LEO      │    QUINN     │      MAX       │
│   Backend    │   Frontend   │     QA       │      PM        │
│     API      │     UI       │    Tests     │     Docs       │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                   ▼ SYNC POINT ▼                            │
│            All agents must complete before merge             │
├─────────────────────────────────────────────────────────────┤
│                    INTEGRATION PHASE                         │
│              SAM merges all PRs to main                      │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// convex/syncPoints.ts
export const createSyncPoint = mutation({
  args: {
    name: v.string(),
    requiredAgents: v.array(v.string()),
    nextPhase: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("syncPoints", {
      ...args,
      completedAgents: [],
      status: "waiting",
      createdAt: Date.now(),
    });
  },
});

export const checkIn = mutation({
  args: {
    syncPointId: v.id("syncPoints"),
    agent: v.string(),
    status: v.string(), // "ready" | "blocked"
    blockerReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const syncPoint = await ctx.db.get(args.syncPointId);
    if (!syncPoint) throw new Error("Sync point not found");

    // Add agent to completed list
    const completedAgents = [...syncPoint.completedAgents, args.agent];

    // Check if all required agents are ready
    const allReady = syncPoint.requiredAgents.every(
      agent => completedAgents.includes(agent)
    );

    await ctx.db.patch(args.syncPointId, {
      completedAgents,
      status: allReady ? "ready" : "waiting",
    });

    if (allReady) {
      // Trigger next phase
      await ctx.db.insert("dispatches", {
        to: "SAM", // Integration lead
        action: syncPoint.nextPhase,
        priority: "high",
      });
    }
  },
});
```

---

## 3. Memory Architecture

### 3.1 Hierarchical Memory (CrewAI-inspired)

**Layers:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SOUL (Permanent)                          │
│   Identity, values, core capabilities                        │
│   agents/sam.md, agents/leo.md, etc.                        │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│                   WORKING (Session)                          │
│   Current task context, decisions made this session         │
│   .context/WORKING.md                                        │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│                  SHORT-TERM (Recent)                         │
│   Last N tasks, recent learnings                             │
│   Convex: agentMemory table (last 7 days)                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
┌─────────────────────────────────────────────────────────────┐
│                  LONG-TERM (Searchable)                      │
│   All past learnings, indexed by topic                       │
│   Vector embeddings for semantic search                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Learning Loop

**Pattern:** Agents learn from mistakes and successes.

```typescript
interface Learning {
  agent: string;
  type: 'success' | 'failure' | 'insight';
  context: string;      // What was the task?
  observation: string;  // What happened?
  lesson: string;       // What to do differently?
  tags: string[];       // ["api", "convex", "error-handling"]
}

// After each task completion
async function recordLearning(task: Task, outcome: 'success' | 'failure') {
  if (outcome === 'failure') {
    await ctx.db.insert("learnings", {
      agent: task.agent,
      type: 'failure',
      context: task.description,
      observation: task.errorMessage,
      lesson: await generateLesson(task), // LLM extracts lesson
      tags: extractTags(task),
    });
  }

  // Every 10 tasks, review and consolidate learnings
  const recentLearnings = await getRecentLearnings(task.agent, 10);
  if (recentLearnings.length >= 10) {
    await consolidateLearnings(task.agent, recentLearnings);
  }
}
```

### 3.3 Context Window Management

**Problem:** Long conversations exceed context limits.

**Solution: Progressive Summarization**

```typescript
// When context approaches limit
async function summarizeAndContinue(conversation: Message[]) {
  // Keep: System prompt + last 10 messages
  const keepMessages = conversation.slice(-10);

  // Summarize: Everything else
  const toSummarize = conversation.slice(0, -10);
  const summary = await llm.summarize(toSummarize);

  // Create continuation context
  return [
    { role: 'system', content: originalSystemPrompt },
    { role: 'assistant', content: `Previous context summary:\n${summary}` },
    ...keepMessages,
  ];
}
```

---

## 4. Autonomous Work Loop

### 4.1 Decision Tree for Self-Assignment

```
Agent finishes task
        │
        ▼
┌───────────────────┐
│ Check dispatch    │
│ queue for me      │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │Has task?  │
    └─────┬─────┘
      Yes │ No
          │    │
          ▼    ▼
    ┌─────────────────┐
    │ Work on task    │
    └─────────────────┘
          │
          │ No task in queue
          ▼
┌───────────────────┐
│ Check Linear      │
│ backlog (my role) │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │Has ticket?│
    └─────┬─────┘
      Yes │ No
          │    │
          ▼    ▼
    ┌─────────────────┐
    │ Self-assign &   │
    │ work on ticket  │
    └─────────────────┘
          │
          │ No tickets
          ▼
┌───────────────────┐
│ Check ROADMAP.md  │
│ for unstarted     │
│ items in my area  │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │Has item?  │
    └─────┬─────┘
      Yes │ No
          │    │
          ▼    ▼
    ┌─────────────────┐
    │ Create ticket & │
    │ work on item    │
    └─────────────────┘
          │
          │ Nothing to do
          ▼
┌───────────────────┐
│ IMPROVEMENT MODE  │
│ - Refactor code   │
│ - Add tests       │
│ - Update docs     │
│ - Review PRs      │
└───────────────────┘
```

### 4.2 Implementation

```bash
#!/bin/bash
# autonomous-loop.sh

AGENT=$1
IDLE_THRESHOLD=300  # 5 minutes

while true; do
  # 1. Check dispatch queue
  dispatch=$(curl -s "$CONVEX_URL/getNextDispatchForAgent?agent=$AGENT")

  if [ -n "$dispatch" ]; then
    work_on_dispatch "$dispatch"
    continue
  fi

  # 2. Check Linear backlog
  ticket=$(check_linear_backlog "$AGENT")

  if [ -n "$ticket" ]; then
    self_assign_and_work "$ticket"
    continue
  fi

  # 3. Check roadmap
  roadmap_item=$(check_roadmap "$AGENT")

  if [ -n "$roadmap_item" ]; then
    create_ticket_and_work "$roadmap_item"
    continue
  fi

  # 4. Improvement mode
  improvement_task=$(find_improvement_opportunity "$AGENT")
  work_on_improvement "$improvement_task"

  # Brief pause to avoid spinning
  sleep 10
done
```

---

## 5. Error Handling and Recovery

### 5.1 Error Categories and Responses

| Error Type | Example | Response |
|------------|---------|----------|
| **Transient** | Network timeout | Retry with backoff |
| **Recoverable** | Invalid input | Fix input, retry |
| **Blocking** | Missing dependency | Escalate, work on other task |
| **Fatal** | Auth failure | Alert, stop agent |

### 5.2 Escalation Protocol

```typescript
enum EscalationLevel {
  SELF_HEAL = 1,    // Agent handles alone
  PEER_ASSIST = 2,  // Ask another agent
  HUMAN_ALERT = 3,  // Notify in #dev
  EMERGENCY = 4,    // Page on-call
}

function determineEscalation(error: Error, retryCount: number): EscalationLevel {
  // After 3 retries, escalate
  if (retryCount >= 3) {
    return EscalationLevel.PEER_ASSIST;
  }

  // Auth failures are immediate human alert
  if (error.message.includes('401') || error.message.includes('403')) {
    return EscalationLevel.HUMAN_ALERT;
  }

  // Production issues are emergencies
  if (error.message.includes('production') && error.message.includes('down')) {
    return EscalationLevel.EMERGENCY;
  }

  return EscalationLevel.SELF_HEAL;
}
```

---

## 6. Monitoring and Observability

### 6.1 Key Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| **Task Throughput** | tasks_completed / hour | 2+ per agent |
| **Success Rate** | successful_tasks / total_tasks | > 95% |
| **Mean Time to Complete** | avg(completion_time - start_time) | < 30 min |
| **Idle Time** | time_without_task / total_time | < 5% |
| **Retry Rate** | retries / api_calls | < 10% |
| **Escalation Rate** | escalations / tasks | < 5% |

### 6.2 Dashboard Metrics (for CEO)

```typescript
// convex/metrics.ts
export const getDashboardMetrics = query({
  handler: async (ctx) => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("tasks")
      .filter(q => q.gte(q.field("completedAt"), dayAgo))
      .collect();

    return {
      tasksToday: tasks.length,
      avgCompletionTime: calculateAvg(tasks, 'duration'),
      successRate: tasks.filter(t => t.status === 'completed').length / tasks.length,
      agentUtilization: await calculateUtilization(ctx, dayAgo),
      costToday: await calculateCost(ctx, dayAgo),
    };
  },
});
```

---

## Summary: EVOX Implementation Priorities

### P0 (This Week)

1. **Add retry with backoff to agent-work-loop.sh**
   - Exponential backoff + jitter
   - Circuit breaker for Linear API

2. **Implement self-assignment logic**
   - Check dispatch → Linear backlog → Roadmap → Improvement mode
   - "KHÔNG BAO GIỜ IDLE"

### P1 (This Month)

3. **Create handoff protocol**
   - Structured handoff documents
   - Automatic dispatch creation on handoff

4. **Add learning loop**
   - Record learnings after each task
   - Consolidate weekly

### P2 (This Quarter)

5. **Vector memory for semantic search**
   - ChromaDB or Convex vector search
   - Query past learnings by similarity

6. **Dependency graph resolution**
   - Track task dependencies
   - Auto-assign unblocked tasks

---

## Related Documents

- [docs/COMPETITIVE-ANALYSIS.md](COMPETITIVE-ANALYSIS.md) — Framework comparison
- [docs/DASHBOARD-RESEARCH.md](DASHBOARD-RESEARCH.md) — Dashboard patterns
- [docs/NORTH-STAR.md](NORTH-STAR.md) — North Star goals
- [docs/AGENT-AUTONOMY.md](AGENT-AUTONOMY.md) — Autonomy guidelines

---

*Created: 2026-02-05 by COLE*
*Supporting: AGT-251 "100x Autonomy — Delete All Human Bottlenecks"*
