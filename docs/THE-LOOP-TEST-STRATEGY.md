# The Loop: Test Strategy

**Author:** QUINN (QA Agent)
**Date:** Feb 5, 2026
**Status:** QA Plan — No implementation yet
**Model:** Opus 4.6

---

## Scope

Test coverage for The Loop (CORE-209) across three layers:

| Layer | Tool | Target Files | Priority |
|-------|------|-------------|----------|
| Unit | Vitest | `convex/messageStatus.ts`, `convex/loopMonitor.ts`, `convex/loopMetrics.ts` | P0 |
| Integration | Vitest + Convex test helpers | Cross-module flows (message → status → alert → metrics) | P0 |
| E2E | Playwright | CEO Dashboard Loop widgets, Loop Timeline, Agent Accountability Grid | P1 |

**Coverage target:** 80% on all Loop backend files.

---

## 1. Unit Tests

### 1.1 `convex/messageStatus.ts` — Status Mutations

**File:** `tests/convex/messageStatus.test.ts`

#### `markAsSeen`
| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Mark delivered message as seen | `statusCode` → 2, `seenAt` set, `expectedReplyBy` = seenAt + 15min |
| 2 | Only recipient can mark as seen | Throws `"Only recipient can mark message as seen"` |
| 3 | Idempotent — already seen message | Returns `{ alreadySeen: true }`, no DB write |
| 4 | No status downgrade (replied → seen) | Returns `{ alreadySeen: true }`, statusCode stays 3 |
| 5 | Message not found | Throws `"Message not found"` |
| 6 | Message with no statusCode (legacy) | Defaults to `DELIVERED` (1), then upgrades to `SEEN` (2) |

#### `markMultipleAsSeen`
| # | Test Case | Expected |
|---|-----------|----------|
| 7 | Bulk mark 3 messages as seen | `markedCount: 3` |
| 8 | Partial — 1 already seen, 2 new | `markedCount: 2` |
| 9 | Invalid ID in array — graceful skip | Logs error, continues, returns count of successful marks |
| 10 | Empty array | `markedCount: 0` |

#### `markAsReplied`
| # | Test Case | Expected |
|---|-----------|----------|
| 11 | Mark seen message as replied | `statusCode` → 3, `repliedAt` set, `expectedActionBy` = repliedAt + 2hr |
| 12 | Message not found | Throws `"Original message not found"` |
| 13 | **BUG CANDIDATE:** No recipient check | Currently anyone can call `markAsReplied` — no `agentName` validation (spec says "auto-mark") |

#### `markAsActed`
| # | Test Case | Expected |
|---|-----------|----------|
| 14 | Mark replied message as acted | `statusCode` → 4, `actedAt` set, `expectedReportBy` = actedAt + 24hr |
| 15 | With taskId — links task | `linkedTaskId` set on message |
| 16 | Without taskId — still succeeds | `linkedTaskId` remains undefined |
| 17 | Idempotent — already acted | Returns `{ alreadyActed: true }` |
| 18 | Resolves active `reply_overdue` and `action_overdue` alerts | Alert status → `"resolved"`, `resolvedAt` set |
| 19 | **NOTE:** No recipient check in current impl | Unlike `markAsSeen`, `markAsActed` does NOT check `message.to !== args.agentName` — potential security gap |

#### `markAsReported`
| # | Test Case | Expected |
|---|-----------|----------|
| 20 | Mark acted message as reported | `statusCode` → 5, `reportedAt` set, `finalReport` stored |
| 21 | Idempotent — already reported | Returns `{ alreadyReported: true }` |
| 22 | Resolves ALL active alerts for message | All alerts → `"resolved"` |
| 23 | Message not found | Throws `"Message not found"` |

#### `markLoopBroken`
| # | Test Case | Expected |
|---|-----------|----------|
| 24 | Break loop with reason | `loopBroken: true`, `loopBrokenReason` set |
| 25 | Creates `loop_broken` alert | Alert with `severity: "critical"`, `status: "escalated"`, `escalatedTo: "max"` |
| 26 | Message not found | Throws `"Message not found"` |

#### Query Functions
| # | Test Case | Expected |
|---|-----------|----------|
| 27 | `getMessageStatus` — existing message | Returns status, statusLabel, all timestamps |
| 28 | `getMessageStatus` — nonexistent | Returns `null` |
| 29 | `getConversationWithStatus` — returns ordered messages | Desc order, includes status fields |
| 30 | `getSentMessagesWithStatus` — groups by recipient | `byRecipient` array with correct counts |
| 31 | `getInboxOverview` — counts unseen/unreplied | Correct `unseenCount`, `unrepliedCount` |
| 32 | `getAllConversations` — deduplicates conversation keys | `[a, b]` and `[b, a]` → same key |

---

### 1.2 `convex/loopMonitor.ts` — SLA Breach Detection

**File:** `tests/convex/loopMonitor.test.ts`

#### `checkSLABreaches`
| # | Test Case | Expected |
|---|-----------|----------|
| 33 | SEEN msg past `expectedReplyBy` | Creates `reply_overdue` alert, `severity: "warning"` |
| 34 | REPLIED msg past `expectedActionBy` | Creates `action_overdue` alert, `severity: "critical"`, `escalatedTo: "max"` |
| 35 | ACTED msg past `expectedReportBy` | Creates `report_overdue` alert, `severity: "critical"`, `escalatedTo: "ceo"` |
| 36 | SEEN msg within SLA | No alert created |
| 37 | REPLIED msg within SLA | No alert created |
| 38 | ACTED msg within SLA | No alert created |
| 39 | Broken loop skipped | `loopBroken: true` messages → no alerts |
| 40 | No duplicate alerts | If `reply_overdue` alert already exists for message, don't create another |
| 41 | Multiple messages — mixed SLA status | Correct alert count for only breached ones |
| 42 | No messages in system | Returns `{ alertsCreated: 0 }` |
| 43 | Missing `expectedReplyBy` on SEEN msg | No alert (guards against undefined) |

---

### 1.3 `convex/loopMetrics.ts` — Metrics Aggregation

**File:** `tests/convex/loopMetrics.test.ts`

#### `aggregateHourlyMetrics`
| # | Test Case | Expected |
|---|-----------|----------|
| 44 | Single agent, 3 messages in past hour | `totalMessages: 3`, correct `completionRate` |
| 45 | Calculates avg stage times | `avgSeenTimeMs`, `avgReplyTimeMs` etc. correct |
| 46 | SLA breaches counted | Messages past SLA without completion → `slaBreaches` incremented |
| 47 | Upsert — existing metric updated | Same agent+period+key → patch, not insert |
| 48 | No messages in past hour | No metrics written, `metricsWritten: 0` |
| 49 | Broken loops counted | `loopsBroken` reflects messages with `loopBroken: true` |

#### `aggregateDailyMetrics`
| # | Test Case | Expected |
|---|-----------|----------|
| 50 | Rolls up 24hr data | `total`, `closed`, `broken` correct across all agents |
| 51 | Per-agent daily breakdown | Each agent gets own metric row |
| 52 | Upsert for existing day | Updates existing, doesn't duplicate |

#### Query: `getLoopDashboard`
| # | Test Case | Expected |
|---|-----------|----------|
| 53 | Filter by agent name | Only returns that agent's metrics |
| 54 | Filter by period (hourly/daily) | Only returns matching period |
| 55 | No filters — returns all | Returns up to `limit` metrics |
| 56 | Respects limit param | Returns at most N entries |

#### Query: `getActiveAlerts`
| # | Test Case | Expected |
|---|-----------|----------|
| 57 | Filter by agent | Only that agent's active alerts |
| 58 | Returns only active status | Resolved/escalated alerts excluded |
| 59 | No active alerts | Returns empty array |

---

## 2. Integration Tests

### 2.1 Full Loop Lifecycle

**File:** `tests/integration/loop-lifecycle.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 60 | **Happy path: SENT → SEEN → REPLY → ACT → REPORT** | Create message, walk through all 5 stages. Verify each timestamp set, each SLA timer started, final `statusCode: 5`. |
| 61 | **Broken loop: SENT → SEEN → BROKEN** | Message seen, then explicitly broken. Verify `loopBroken: true`, alert created with escalation to MAX. |
| 62 | **SLA breach → alert → resolution** | Create message, mark SEEN, wait past `expectedReplyBy` (mock time), run `checkSLABreaches`, verify alert created. Then mark REPLIED + ACTED, verify alert resolved. |
| 63 | **Task-message linkage** | Create message, mark ACTED with taskId. Verify `linkedTaskId` on message. Verify task completion triggers `markAsReported`. |
| 64 | **Metrics after full loop** | Complete a loop, run `aggregateHourlyMetrics`. Verify `loopsClosed: 1`, `completionRate: 1.0`, stage times present. |

### 2.2 Edge Cases & Concurrency

**File:** `tests/integration/loop-edge-cases.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 65 | **Skip stages** | Mark SEEN then immediately REPORTED (skip REPLIED + ACTED). Verify system handles gracefully — statusCode jumps allowed. |
| 66 | **Rapid stage transitions** | All 5 stages within 1 second. Verify no race conditions on timestamps. |
| 67 | **Multiple SLA breaches on same message** | SEEN, wait past reply SLA. Then REPLIED, wait past action SLA. Verify two separate alerts exist. |
| 68 | **Break already-reported loop** | Call `markLoopBroken` on statusCode=5. Verify it still sets `loopBroken: true` (audit trail). |
| 69 | **Case sensitivity** | Agent names `"SAM"` vs `"sam"` vs `"Sam"`. Verify matching works correctly (current code uses exact match). |
| 70 | **Legacy messages (no statusCode)** | Messages created before The Loop. Default `statusCode` handling via `?? DELIVERED`. |

### 2.3 Cross-Module Integration

**File:** `tests/integration/loop-cross-module.test.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 71 | **Monitor + Metrics pipeline** | Seed messages at various stages, run monitor (`checkSLABreaches`), then metrics (`aggregateHourlyMetrics`). Verify alerts and metrics consistent. |
| 72 | **Bulk seen + monitor** | `markMultipleAsSeen` on 5 messages, advance time past SLA, run monitor. Verify 5 `reply_overdue` alerts. |
| 73 | **Dashboard queries after loop activity** | Complete loops, run aggregation, query `getLoopDashboard`. Verify returned data matches actual state. |

---

## 3. E2E Tests (Playwright)

### 3.1 CEO Dashboard — Loop Status Widget

**File:** `e2e/loop-dashboard.spec.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 74 | Loop health percentage visible | Widget shows "Loop Health: XX%" |
| 75 | Today's loop counts | Shows completed, in-progress, broken counts |
| 76 | Average time display | Shows average closure time |
| 77 | SLA adherence percentage | Shows SLA adherence rate |

### 3.2 CEO Dashboard — Loop Timeline

**File:** `e2e/loop-timeline.spec.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 78 | Timeline renders for a message | Shows SENT → SEEN → REPLY → ACT → REPORT stages |
| 79 | Completed stages show checkmarks | Green checkmarks for completed stages |
| 80 | In-progress stage highlighted | Current stage visually distinct |
| 81 | Timestamps on each stage | Each stage shows time elapsed |
| 82 | Broken loop shows red indicator | Loop broken status visually distinct |

### 3.3 CEO Dashboard — Agent Accountability Grid

**File:** `e2e/loop-accountability.spec.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 83 | Grid shows all agents | MAX, SAM, LEO, QUINN rows present |
| 84 | Per-stage counts correct | SEEN, REPLY, ACT, REPORT columns match data |
| 85 | Broken count column | Shows broken loop count per agent |
| 86 | Complete % column | Shows percentage, color-coded (green >90%, yellow >70%, red <70%) |

### 3.4 Loop Alerts

**File:** `e2e/loop-alerts.spec.ts`

| # | Test Case | Description |
|---|-----------|-------------|
| 87 | Critical alert renders | Red badge, shows agent name and breach type |
| 88 | Warning alert renders | Yellow badge, shows agent name and breach type |
| 89 | Resolved alert hidden | Only active/escalated alerts shown by default |
| 90 | Alert links to message | Clicking alert navigates to message context |

### 3.5 Mobile Responsiveness

**File:** `e2e/loop-mobile.spec.ts` (using `iPhone 14` project)

| # | Test Case | Description |
|---|-----------|-------------|
| 91 | Loop widget stacks vertically | No horizontal overflow on mobile |
| 92 | Accountability grid scrollable | Horizontal scroll on narrow screens |
| 93 | Alerts readable on mobile | Text doesn't truncate to unreadable state |

---

## 4. Test Data Strategy

### Mock Data Factory

Create `tests/factories/loop.ts`:

```typescript
// Message at each loop stage for deterministic tests
export const createMessageAtStage = (stage: 0|1|2|3|4|5) => ({
  from: "max",
  to: "sam",
  content: `Test message at stage ${stage}`,
  type: "request",
  statusCode: stage,
  timestamp: Date.now(),
  sentAt: Date.now(),
  seenAt: stage >= 2 ? Date.now() - 300000 : undefined,
  repliedAt: stage >= 3 ? Date.now() - 240000 : undefined,
  actedAt: stage >= 4 ? Date.now() - 60000 : undefined,
  reportedAt: stage >= 5 ? Date.now() : undefined,
  expectedReplyBy: stage >= 2 ? Date.now() + 900000 : undefined,
  expectedActionBy: stage >= 3 ? Date.now() + 7200000 : undefined,
  expectedReportBy: stage >= 4 ? Date.now() + 86400000 : undefined,
  priority: "normal",
});

// SLA-breached message (for monitor tests)
export const createBreachedMessage = (breachType: "reply"|"action"|"report") => {
  const past = Date.now() - 100000; // 100 seconds ago
  return {
    ...createMessageAtStage(breachType === "reply" ? 2 : breachType === "action" ? 3 : 4),
    [`expected${breachType === "reply" ? "Reply" : breachType === "action" ? "Action" : "Report"}By`]: past,
  };
};
```

### Convex Test Environment

For integration tests, use `convex-test` helper (if available) or mock the Convex `ctx` object:

```typescript
// tests/helpers/convex-mock.ts
export const createMockCtx = () => ({
  db: {
    get: vi.fn(),
    patch: vi.fn(),
    insert: vi.fn(),
    query: vi.fn().mockReturnValue({
      withIndex: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      order: vi.fn().mockReturnThis(),
      take: vi.fn().mockResolvedValue([]),
    }),
  },
  runMutation: vi.fn(),
});
```

---

## 5. Known Issues & Gaps Found During Analysis

| # | Issue | Severity | File:Line | Notes |
|---|-------|----------|-----------|-------|
| 1 | `markAsReplied` has no recipient check | Medium | `messageStatus.ts:117` | Unlike `markAsSeen`, anyone can call this. Spec says auto-mark, but could be exploited. |
| 2 | `markAsActed` has no recipient check in current impl | Medium | `messageStatus.ts:381` | Spec says only recipient should mark. Implementation doesn't validate `args.agentName === message.to`. |
| 3 | `markAsReported` has no recipient check in current impl | Medium | `messageStatus.ts:425` | Same gap as #2. |
| 4 | Spec vs impl mismatch on `loopAlerts` schema | Low | Schema vs THE-LOOP-IMPLEMENTATION.md | Impl uses `alertType: "reply_overdue"` etc. Spec used `alertType: "sla_breach"` + `loopStage`. Different field shape. |
| 5 | Daily metrics don't aggregate `slaBreaches` per-agent | Low | `loopMetrics.ts:170` | `slaBreaches: 0` hardcoded in daily per-agent data. Only counted at aggregate level (line 149-151). |
| 6 | Hourly metrics track by recipient; daily also by recipient | Info | `loopMetrics.ts:43,142` | Both aggregate by `msg.to`. Consistent, but spec mentions "sent by" metrics too. |

---

## 6. Priority & Execution Order

### Phase A: Unit Tests (Week 1)
1. `messageStatus.test.ts` — All 32 test cases (P0)
2. `loopMonitor.test.ts` — 11 test cases (P0)
3. `loopMetrics.test.ts` — 16 test cases (P0)

### Phase B: Integration Tests (Week 1-2)
4. `loop-lifecycle.test.ts` — 5 happy-path tests (P0)
5. `loop-edge-cases.test.ts` — 6 edge case tests (P1)
6. `loop-cross-module.test.ts` — 3 cross-module tests (P1)

### Phase C: E2E Tests (Week 2-3, after LEO builds Phase 3 dashboard)
7. `loop-dashboard.spec.ts` — 4 tests (P1)
8. `loop-timeline.spec.ts` — 5 tests (P1)
9. `loop-accountability.spec.ts` — 4 tests (P1)
10. `loop-alerts.spec.ts` — 4 tests (P2)
11. `loop-mobile.spec.ts` — 3 tests (P2)

**Total: 93 test cases across 11 test files.**

### Estimated Effort

| Phase | Tests | Effort | Depends On |
|-------|-------|--------|------------|
| A: Unit | 59 | 8 hours | Nothing (can start now) |
| B: Integration | 14 | 6 hours | Phase A helpers |
| C: E2E | 20 | 8 hours | LEO's Phase 3 dashboard |
| **Total** | **93** | **22 hours** | |

---

## 7. CI Integration

### Pre-PR Gate (GitHub Actions)
```yaml
# .github/workflows/test-loop.yml
- name: Unit + Integration
  run: npx vitest run tests/convex/messageStatus.test.ts tests/convex/loopMonitor.test.ts tests/convex/loopMetrics.test.ts tests/integration/loop-*.test.ts

- name: E2E (Loop only)
  run: npx playwright test e2e/loop-*.spec.ts
```

### Coverage Gate
- `convex/messageStatus.ts` — 90% branch coverage
- `convex/loopMonitor.ts` — 85% branch coverage
- `convex/loopMetrics.ts` — 80% branch coverage

---

## 8. Open Questions for CEO/MAX

1. **Recipient validation gap (#1-3 above):** Should we add `agentName === message.to` checks to `markAsActed` and `markAsReported` before writing tests? Or test current behavior as-is?
2. **E2E test environment:** Should E2E tests run against Convex dev or a dedicated test deployment?
3. **SLA timer mocking:** Should we use `vi.useFakeTimers()` or seed messages with past timestamps for SLA breach tests?
4. **Cross-browser priority:** Run all E2E in Chromium only, or full matrix (Chrome + Firefox + Safari + Mobile)?

---

**Next step:** Await CEO approval, then begin Phase A unit tests.
