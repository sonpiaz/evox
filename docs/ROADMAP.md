# EVOX Product Roadmap

> **North Star:** Agents that work like senior engineers — proactive, self-sufficient, high-quality output, 24/7.

*Maintained by Max (PM) — Last updated: Feb 5, 2026*

---

## Overview

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| **1** | Foundation | 🟢 Current | Agent communication, visibility, coordination |
| **2** | Autonomy | 🟡 Next | Self-directed work, self-healing, auto-dispatch |
| **3** | Scale | ⚪ Future | More agents, integrations, multi-repo |

---

## Phase 1: Foundation (Current)

> **Goal:** Agents can communicate, coordinate, and be observed reliably.

### ✅ Completed

| Feature | Owner | Ticket |
|---------|-------|--------|
| Agent-to-Agent Messaging | Sam | AGT-228 |
| Channel-based Communication (#dev, #ceo) | Sam | AGT-234 |
| Dispatch Queue API | Sam | Done |
| CEO Dashboard v1 | Leo | AGT-269 |
| Long-Running Sessions | All | AGT-226 |
| Real-time Activity Feed | Leo | AGT-264 |
| Agent Status on Dashboard | Leo | AGT-233 |
| v2 Messaging Endpoints | Sam | AGT-236 |
| QA Agent Integration | Quinn | AGT-225 |

### 🔴 P0 — In Progress

| ID | Feature | Owner | Status | Linear |
|----|---------|-------|--------|--------|
| F1.1 | @mention notification alerts | Sam | 📋 To Do | [AGT-271](https://linear.app/affitorai/issue/AGT-271) |
| F1.2 | Agent heartbeat monitoring | Sam | 📋 To Do | [AGT-273](https://linear.app/affitorai/issue/AGT-273) |
| F1.3 | Terminal UI for Agents | Sam | ✅ MVP Done | [AGT-274](https://linear.app/affitorai/issue/AGT-274) |

### ✅ Recently Completed

| Feature | Owner | Ticket |
|---------|-------|--------|
| Git activity on dashboard | Leo | AGT-272 |
| Per-agent completion stats | Sam | AGT-268 |
| Cost tracking per task | Sam | AGT-193, AGT-81 |
| Cost Dashboard Widget | Leo | AGT-200 |
| Agent Performance Tracking | Sam | AGT-242 |
| CEO Dashboard North Star | Leo | AGT-254 |
| Elon Dashboard Metrics | Leo | AGT-238 |

### Success Criteria

- [x] All 4 agents communicating via Convex
- [x] CEO can see all agent activity in <3 seconds
- [x] CEO can see agent terminal output (AGT-274)
- [x] Per-agent stats visible (AGT-268)
- [x] Cost tracking implemented (AGT-193)
- [x] Git activity visible (AGT-272)
- [ ] @mentions alert the relevant agent (AGT-271)
- [ ] Heartbeat shows online/offline status (AGT-273)

---

## Phase 2: Autonomy (Mar 2026)

> **Goal:** Agents find their own work, self-heal when stuck, minimal human intervention.

### Planned Features

| ID | Feature | Owner | Description |
|----|---------|-------|-------------|
| F2.1 | Auto-Dispatch Engine | Sam | Assign tasks based on skills & availability |
| F2.2 | Work Discovery | All | Agents scan backlog for unassigned work |
| F2.3 | Self-Healing | Sam | Retry failed tasks, escalate after N attempts |
| F2.4 | Smart Handoffs | Max | Automatic handoff when task crosses territory |
| F2.5 | Blocker Detection | Max | Identify and escalate blockers automatically |
| F2.6 | Quinn Auto-Review | Quinn | QA triggered automatically on PR creation |
| F2.7 | Context Sharing | All | Agents share learnings automatically |
| F2.8 | Self-Improvement Loop | All | Agents analyze performance, suggest improvements |

### Success Criteria

- [ ] Agents pick up work within 5 min of availability
- [ ] CEO intervention <1x per day
- [ ] Self-heal success rate >80%
- [ ] Zero orphan tasks (always assigned)
- [ ] Cost per task < $1

---

## Phase 3: Scale (May 2026+)

> **Goal:** Expand team, support multiple repos, integrate with external tools.

### Planned Features

| ID | Feature | Description |
|----|---------|-------------|
| F3.1 | New Agent Onboarding | Automated setup for Alex, Ella, Nova |
| F3.2 | Multi-Repo Support | Agents work across multiple repositories |
| F3.3 | Slack Integration | Notifications in Slack |
| F3.4 | GitHub PR Integration | Auto-link PRs to Linear tickets |
| F3.5 | Knowledge Base | Shared learnings searchable by all |
| F3.6 | A/B Testing Approaches | Compare agent strategies |

### Success Criteria

- [ ] 8+ agents operating simultaneously
- [ ] 3+ repos managed
- [ ] External stakeholders receive updates automatically
- [ ] 20+ tasks completed per day

---

## Current Sprint (Feb 3-9, 2026)

| Priority | Ticket | Task | Owner | Status |
|----------|--------|------|-------|--------|
| P0 | [AGT-274](https://linear.app/affitorai/issue/AGT-274) | Terminal UI | Sam | ✅ MVP Done |
| P0 | [AGT-251](https://linear.app/affitorai/issue/AGT-251) | 100x Autonomy | All | In Progress |
| P0 | [AGT-271](https://linear.app/affitorai/issue/AGT-271) | @mention notifications | Sam | To Do |
| P0 | [AGT-273](https://linear.app/affitorai/issue/AGT-273) | Agent heartbeat | Sam | To Do |
| ✅ | [AGT-272](https://linear.app/affitorai/issue/AGT-272) | Git activity feed | Leo | Done |
| ✅ | [AGT-268](https://linear.app/affitorai/issue/AGT-268) | Per-agent stats | Sam | Done |
| ✅ | [AGT-193](https://linear.app/affitorai/issue/AGT-193) | Cost tracking | Sam | Done |

---

## Historical Phases (Completed)

<details>
<summary>Phase 8 — Hands-Off Operation (COMPLETE)</summary>

All goals achieved:
- ✅ AGT-236: Fix v2 Messaging Endpoints
- ✅ AGT-230: Public Demo Mode
- ✅ AGT-223: Max Autonomous Monitor
- ✅ AGT-234: Improved Communication
- ✅ AGT-226: Long-Running Sessions
- ✅ AGT-233: Display Agents on Dashboard
- ✅ AGT-225: QA Agent Integration
- ✅ AGT-228: Peer Communication
- ✅ AGT-229: Priority Override
- ✅ AGT-263: Agent retry with exponential backoff
- ✅ AGT-264: Real-time agent activity feed
- ✅ AGT-265: Auto-spawn sub-agents
</details>

---

## Metrics Dashboard

| Metric | Current | Phase 1 Target | Phase 3 Target |
|--------|---------|----------------|----------------|
| Tasks/day | ~5 | 10+ | 20+ |
| Avg completion time | ~6h | <4h | <2h |
| CEO interventions | ~3/day | <1/day | <1/week |
| Agent uptime | 80% | 95% | 99% |
| Bug escape rate | Unknown | <5% | <2% |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 5 | Restructured roadmap to 3 phases | CEO clarity request |
| Feb 5 | Phase 1 focus: visibility + communication | Foundation before autonomy |
| Feb 4 | Quinn can fix simple bugs | Faster iteration |
| Feb 4 | Long-running sessions | Context preservation |

---

## Review Cadence

- **Daily:** Max reviews dispatch queue
- **Weekly:** Roadmap progress check
- **Bi-weekly:** CEO review, priority adjustment

---

> **Remember:** The goal isn't to complete tickets. The goal is to ship great software.
