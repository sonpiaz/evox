# Agent Heartbeat Protocol

> Standard wake-up routine for all EVOX agents.
> Runs every 15 minutes (staggered: MAX :00, SAM :05, LEO :10, QUINN :12)

---

## On Wake Checklist

### 1. Load Context (5s)

- [ ] Read `CLAUDE.md` — Project rules
- [ ] Read own `SOUL.md` — Identity, role, expertise
- [ ] Read own `WORKING.md` — Current state, last session context

### 2. Check Inbox (5s)

- [ ] Query unread @mentions
- [ ] Query unread DMs
- [ ] Check notifications for updates

### 3. Check Task Queue (5s)

- [ ] Query tasks assigned to me
- [ ] Filter: `status = todo OR status = in_progress`
- [ ] If blocked task — escalate to Max

### 4. Decide Action

| Condition | Action |
|-----------|--------|
| Unread @mention | Respond to mention |
| Assigned task (todo) | Start working on task |
| Assigned task (in_progress) | Continue working |
| Blocked task | Escalate to Max, log blocker |
| Nothing pending | Log `HEARTBEAT_OK` |

### 5. Report

- Update `WORKING.md` with current status
- Log activity to daily notes
- Emit heartbeat event

---

## Heartbeat Output

Either:
1. **Start task execution** — Agent picks up work
2. **Log HEARTBEAT_OK** — No pending work, agent sleeps

```
{agent} HEARTBEAT_OK at {timestamp}
- Checked: mentions (0), tasks (0), blockers (0)
- Status: Idle
- Next heartbeat: {timestamp + 15min}
```

---

## Heartbeat Status Codes

| Status | Meaning |
|--------|---------|
| `ok` | No pending work, agent idle |
| `pending_work` | Has unread mentions or unstarted tasks |
| `working` | Actively working on a task |
| `blocked` | Task blocked, needs escalation |

---

## Implementation

### Cron Schedule (convex/crons.ts)

```
MAX:   0,15,30,45 * * * *  (every 15 min at :00)
SAM:   5,20,35,50 * * * *  (every 15 min at :05)
LEO:   10,25,40,55 * * * * (every 15 min at :10)
QUINN: 12,27,42,57 * * * * (every 15 min at :12)
```

### Backend Functions (convex/heartbeat.ts)

- `checkAgent(agentName)` — Run full heartbeat check
- `updateHeartbeat(agentName, status, details)` — Log result
- `heartbeatMax/Sam/Leo/Quinn()` — Cron entry points

### Queries

- `getHeartbeatContext(agentName)` — Get all context for heartbeat
- `agentMessages.getUnreadMessages(agentName)` — Check mentions
- `tasks.getByAssignee(assignee)` — Check task queue
- `agentMemory.getMemory(agentId, type)` — Get WORKING.md

---

## Health Indicators (Dashboard)

| Indicator | Threshold | Color |
|-----------|-----------|-------|
| Healthy | Last heartbeat < 5 min | Green |
| Warning | Last heartbeat 5-15 min | Yellow |
| Critical | Last heartbeat > 15 min | Red |
| Offline | Last heartbeat > 30 min | Gray |

---

## Escalation Rules

1. **3 consecutive `pending_work`** — Notify PM
2. **Task blocked > 1 hour** — Auto-escalate to Max
3. **No heartbeat > 30 min** — Mark agent offline

---

_Last updated: 2026-02-03_
_Protocol version: 1.0_
