# EVOX Product Roadmap

> **North Star:** Agents that work like senior engineers — proactive, self-sufficient, high-quality output, 24/7.

*Maintained by Max (PM) — Last updated: Feb 5, 2026*

---

## Strategic Direction

**Next North Star: Self-Healing System**
> "Agents detect problems and fix them before humans notice"

Rationale: Self-healing is prerequisite for Agent-Led Development and Revenue-Generating Agents. Build resilience before ambition.

---

## Overview

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| **1** | Foundation | 🟢 Current | Agent communication, visibility, coordination |
| **2** | Self-Healing | 🟡 Next | Auto-retry, rollback, blocker detection, learning |
| **3** | Agent-Led | ⚪ Future | Feature proposals, voting, minimal-oversight shipping |

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

### 🔴 P0 — Final Item

| ID | Feature | Owner | Status | Linear |
|----|---------|-------|--------|--------|
| F1.2 | Agent heartbeat UI (frontend) | Leo | ⏳ Pending | [AGT-273](https://linear.app/affitorai/issue/AGT-273) |

### ✅ Recently Completed

| Feature | Owner | Ticket |
|---------|-------|--------|
| @mention notification alerts | Sam | AGT-271 |
| Terminal UI for Agents | Sam | AGT-274 |
| Git activity on dashboard | Leo | AGT-272 |
| Per-agent completion stats | Sam | AGT-268 |
| Cost tracking per task | Sam | AGT-193, AGT-81 |
| Cost Dashboard Widget | Leo | AGT-200 |
| Agent Performance Tracking | Sam | AGT-242 |
| CEO Dashboard North Star | Leo | AGT-254 |
| Elon Dashboard Metrics | Leo | AGT-238 |

### Success Criteria (7/8 = 87.5%)

- [x] All 4 agents communicating via Convex
- [x] CEO can see all agent activity in <3 seconds
- [x] CEO can see agent terminal output (AGT-274)
- [x] Per-agent stats visible (AGT-268)
- [x] Cost tracking implemented (AGT-193)
- [x] Git activity visible (AGT-272)
- [x] @mentions alert the relevant agent (AGT-271) ✅
- [ ] Heartbeat shows online/offline status (AGT-273) — Backend ✅, Frontend ⏳

---

## Phase 2: Self-Healing System (Mar 2026)

> **Goal:** Agents detect problems, fix them automatically, and learn from mistakes.

### Progress: 4/6 = 66% Complete

| Ticket | Feature | Owner | Status |
|--------|---------|-------|--------|
| [AGT-276](https://linear.app/affitorai/issue/AGT-276) | Auto-Retry Failed Tasks | Sam | ✅ Done |
| [AGT-277](https://linear.app/affitorai/issue/AGT-277) | Git Rollback Mechanism | Sam | ✅ Done |
| [AGT-278](https://linear.app/affitorai/issue/AGT-278) | Auto-Detect Blockers & Escalate | Max | ⏳ Backlog |
| [AGT-279](https://linear.app/affitorai/issue/AGT-279) | Quinn Auto-Review on PR | Quinn | ✅ Done |
| [AGT-280](https://linear.app/affitorai/issue/AGT-280) | Self-Improvement Loop | All | ⏳ Backlog |
| [AGT-281](https://linear.app/affitorai/issue/AGT-281) | Health & Error Dashboard | Leo | ✅ Done |

### Success Criteria

- [ ] Failed tasks auto-retry with 80%+ success rate
- [ ] Breaking commits auto-rollback within 2 min
- [ ] Stuck agents escalated within 30 min
- [ ] Every PR auto-reviewed by Quinn
- [ ] Same mistake not repeated > 2x
- [ ] CEO intervention < 1x per day

---

## Phase 3: Agent-Led Development (May 2026+)

> **Goal:** Agents propose features, prioritize, and ship with minimal human oversight.

### Tickets Created

| Ticket | Feature | Owner | Priority |
|--------|---------|-------|----------|
| [AGT-282](https://linear.app/affitorai/issue/AGT-282) | User Feedback Analysis | Maya | Medium |
| [AGT-283](https://linear.app/affitorai/issue/AGT-283) | Feature Proposal System | All | Medium |
| [AGT-284](https://linear.app/affitorai/issue/AGT-284) | Priority Voting | Max | Low |
| [AGT-288](https://linear.app/affitorai/issue/AGT-288) | Minimal-Oversight Shipping | Sam/Leo | Low |

### Success Criteria

- [ ] Agents analyze user feedback weekly
- [ ] 1+ agent-proposed feature shipped per month
- [ ] Features ship with QA approval only (no PM gate)
- [ ] CEO intervention < 1x per week
- [ ] Zero production incidents from auto-deploys

---

## Current Sprint (Feb 3-9, 2026)

| Priority | Ticket | Task | Owner | Status |
|----------|--------|------|-------|--------|
| P0 | [AGT-273](https://linear.app/affitorai/issue/AGT-273) | Heartbeat UI (frontend) | Leo | ⏳ Pending |
| P0 | [AGT-251](https://linear.app/affitorai/issue/AGT-251) | 100x Autonomy | All | In Progress |
| ✅ | [AGT-274](https://linear.app/affitorai/issue/AGT-274) | Terminal UI | Sam | Done |
| ✅ | [AGT-271](https://linear.app/affitorai/issue/AGT-271) | @mention notifications | Sam | Done |
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
| Feb 5 | Phase 1 at 87.5%, only AGT-273 UI remaining | CEO review confirmed progress |
| Feb 5 | Phase 2 at 66% (4/6 items done) | Self-healing momentum strong |
| Feb 5 | Next North Star: Self-Healing System | Foundation for Agent-Led Development; lower risk |
| Feb 5 | Phase 2 = Self-Healing, Phase 3 = Agent-Led | Logical progression: visibility → resilience → autonomy |
| Feb 5 | Created 10 new tickets (AGT-276 to AGT-288) | Concrete roadmap for next 3 months |
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
