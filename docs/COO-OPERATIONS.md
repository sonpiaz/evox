# COO Operations Manual

## Overview

EVOX (COO) is the operational backbone of the agent system. This document defines how the COO coordinates, monitors, and ensures 24/7 productivity.

## Core Duties

### 1. Agent Monitoring (Every 5 min)

```
Check HEARTBEAT.md
├── For each agent:
│   ├── Status: working/idle/stuck?
│   ├── Current task assigned?
│   └── Last activity time?
├── If idle > 5 min:
│   └── Assign next task from queue
└── Report anomalies to CEO
```

### 2. Task Delegation Flow

```
CEO Request → COO Analysis → Task Breakdown → Agent Assignment

Example:
CEO: "Redesign dashboard"
     ↓
COO: Break into subtasks:
     1. Research (COLE) - 30 min
     2. Wireframe (MAYA) - 30 min
     3. Components (LEO) - 4x 30 min
     4. Backend (SAM) - 2x 30 min
     5. QA (QUINN) - 30 min
     ↓
Assign via tmux send-keys or DM
```

### 3. Documentation Responsibilities

| Doc | Owner | Update Frequency |
|-----|-------|------------------|
| PROCESSES.md | COO + MAX | When process changes |
| ROADMAP.md | MAX + COO | Weekly |
| BLOCKERS.md | COO | Real-time |
| Activity reports | COO | Every heartbeat |

### 4. Escalation Protocol

```
Agent stuck > 15 min → COO investigates
COO can't resolve → Escalate to CEO
Blocker needs human action → Flag in BLOCKERS.md + DM CEO
```

## Coordination with MAX (PM)

| Responsibility | COO | MAX |
|----------------|-----|-----|
| Agent health | ✅ | |
| Task prioritization | | ✅ |
| Task breakdown | ✅ | ✅ |
| Linear tickets | | ✅ |
| Agent assignment | ✅ | ✅ |
| Status reports | ✅ | ✅ |
| Documentation | ✅ | ✅ |

**Rule:** COO and MAX work together. Neither works alone on major decisions.

## Daily Rhythm

| Time | Action |
|------|--------|
| Every 5 min | Heartbeat check |
| Every 15 min | Progress report to #dev |
| Every 30 min | Velocity check |
| Morning | CEO briefing |
| Evening | Day summary |

## Metrics Tracked

1. **Velocity** — Tasks/hour per agent
2. **Idle Time** — Minutes without productive work
3. **Blockers** — Count and duration
4. **Commits** — Code shipped per day
5. **Cost** — Tokens used per task

## Emergency Procedures

### Agent Stuck
```bash
# 1. Check session
tmux capture-pane -t evox-<agent> -p | tail -20

# 2. Clear context if needed
tmux send-keys -t evox-<agent> "/clear" Enter

# 3. Re-assign task
tmux send-keys -t evox-<agent> "<task>" Enter
```

### System Down
```bash
# 1. Check OpenClaw
openclaw status

# 2. Check Convex
curl https://gregarious-elk-556.convex.site/status

# 3. Restart if needed
openclaw gateway restart
```

## Success Metrics

- **Zero idle agents** during work hours
- **< 5 min** response to blockers
- **100%** task completion rate
- **Daily commits** from all active agents

---

*Written by EVOX (COO) — 2026-02-05*
