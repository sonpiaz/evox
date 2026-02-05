# Task Delegation Protocol

## Ownership

- **COO (EVOX):** Owns this document, coordinates execution
- **PM (MAX):** Co-owns, manages Linear tickets

## Delegation Rules

### Rule 1: No Task > 30 Minutes

Every task assigned to an agent must be completable in 30 minutes or less.

**If task is bigger:**
```
EPIC (2+ hours)
├── Subtask 1 (30 min) → Agent A
├── Subtask 2 (30 min) → Agent B
├── Subtask 3 (30 min) → Agent A
└── Subtask 4 (30 min) → Agent C
```

### Rule 2: Clear Success Criteria

Every task must have:
- [ ] **Deliverable:** What file/feature to ship
- [ ] **Acceptance:** How to verify it's done
- [ ] **Deadline:** When it should be complete

**Example:**
```
Task: Fix Activity feed noise
Deliverable: Updated ActivityFeed.tsx
Acceptance: No heartbeat messages shown, commits show line counts
Deadline: 20 minutes
```

### Rule 3: Right Agent for Right Task

| Task Type | Assign To |
|-----------|-----------|
| Backend/API | SAM, KIRA |
| Frontend/UI | LEO, FINN |
| Design | MAYA |
| Testing | QUINN |
| Documentation | ALEX, ELLA |
| Research | COLE |
| Analytics | IRIS, DREW |
| Security | NOVA |
| Coordination | MAX |

### Rule 4: No Idle Agents

If agent completes task:
1. Check if more tasks in their queue
2. If not, assign from backlog
3. If no backlog, assign maintenance/improvement tasks

### Rule 5: Document Everything

Every delegation must be logged:
```
[TIME] COO → AGENT: Task description
[TIME] AGENT → #dev: Completion report
```

## Delegation Methods

### Method 1: Direct tmux (Immediate)
```bash
tmux send-keys -t evox-<agent> "<task>" Enter
```
Use for: Urgent tasks, simple instructions

### Method 2: DM via API (Tracked)
```bash
curl -X POST ".../v2/sendMessage" \
  -d '{"from":"EVOX","to":"<agent>","text":"<task>"}'
```
Use for: Tasks that need tracking, multi-step work

### Method 3: Linear Ticket (Formal)
```
MAX creates ticket → Auto-dispatch → Agent picks up
```
Use for: Features, bugs, planned work

## Delegation Template

```markdown
## Task: [Title]

**Agent:** [NAME]
**Priority:** P0/P1/P2
**Deadline:** [X] minutes

### What to do
[Clear instructions]

### Deliverables
- [ ] File: [path]
- [ ] Feature: [description]

### Success criteria
[How to verify completion]

### Report when done
Post to #dev with:
- What you shipped
- File paths and line counts
- Any blockers for next task
```

## Coordination Flow

```
CEO Request
    ↓
COO receives → Analyzes scope
    ↓
If EPIC: COO + MAX break down together
    ↓
COO assigns subtasks to agents
    ↓
Agents execute, report to #dev
    ↓
COO monitors, unblocks, reports to CEO
```

---

*COO (EVOX) + PM (MAX) — 2026-02-05*
