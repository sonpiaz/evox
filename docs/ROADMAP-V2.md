# EVOX ROADMAP V2

> **North Star:** Agents work like Senior Engineers — proactive, self-sufficient, 24/7
>
> **Rule:** Agents tự bốc việc từ roadmap. Không cần CEO giao từng task.

*Owner: MAX (PM) | Updated: Feb 5, 2026*

---

## How This Works

```
1. Đọc ROADMAP-V2.md
2. Tìm task ⬜ của mình
3. Claim → Update 🔄
4. Ship → Update ✅
5. Pick next task
```

**KHÔNG IDLE. KHÔNG CHỜ CEO.**

---

## Phase 1: Foundation (Feb 5-9) — THIS WEEK

> **Goal:** Dashboard v0.2, All agents online, Close Phase 1

| # | Task | Owner | Status | Ticket |
|---|------|-------|--------|--------|
| 1.1 | Dashboard v0.2 - MetricsBar | LEO | ✅ | AGT-314 |
| 1.2 | Dashboard v0.2 - AgentGrid | LEO | ✅ | AGT-314 |
| 1.3 | Dashboard v0.2 - AlertsBanner | LEO | ✅ | AGT-314 |
| 1.4 | Dashboard v0.2 - ActivityFeed | LEO | ✅ | AGT-314 |
| 1.5 | Dashboard v0.2 - DispatchList | LEO | ✅ | AGT-314 |
| 1.6 | Dashboard v0.2 - Assemble & deploy | LEO | ✅ | AGT-314 |
| 1.7 | Heartbeat UI (green/red dots) | LEO | ✅ | AGT-273 |
| 1.8 | Fix markDispatch POST APIs | SAM | ⬜ | AGT-306 |
| 1.9 | Reset circuit breakers (7 agents) | SAM | ⬜ | — |
| 1.10 | Auto-detect blockers & escalate | SAM | ⬜ | AGT-278 |
| 1.11 | Agent work-loop stable | SAM | ✅ | — |
| 1.12 | Auto-restart on crash | SAM | ✅ | — |
| 1.13 | Health monitoring API | SAM | ✅ | — |
| 1.14 | Research CEO dashboard patterns | COLE | ✅ | AGT-309 |
| 1.15 | Design system docs | MAYA | ✅ | AGT-294 |
| 1.16 | Component library audit | MAYA | ✅ | AGT-294 |
| 1.17 | Setup Vitest framework | QUINN | ✅ | AGT-295 |
| 1.18 | Audit all docs - find outdated | ALEX | ⬜ | AGT-296 |
| 1.19 | Coordinate & dispatch agents | MAX | 🔄 | AGT-304 |
| 1.20 | Update roadmap daily | MAX | 🔄 | — |
| 1.21 | API: getChannelMessagesWithKeywords | SAM | ✅ | — |
| 1.22 | AgentCommsWidget (3-5 keywords) | LEO | 🔄 | — |

**Phase 1 Progress: 13/22 = 59%**

---

## Phase 2: Self-Healing & Autonomy (Feb 10-16) — NEXT WEEK

> **Goal:** Agents run 24/7 without human kick

| # | Task | Owner | Status | Ticket |
|---|------|-------|--------|--------|
| 2.1 | Launchd daemon - auto-start agents | SAM | ⬜ | AGT-251 |
| 2.2 | Direct Linear polling (no dispatch) | SAM | ⬜ | AGT-251 |
| 2.3 | Self-improvement loop | SAM | ⬜ | AGT-280 |
| 2.4 | Auto-restart crashed agents | SAM | ⬜ | — |
| 2.5 | Circuit breaker pattern | SAM | ✅ | — |
| 2.6 | Auto-recovery on stuck | SAM | ✅ | — |
| 2.7 | Context auto-compact | SAM | 🔄 | — |
| 2.8 | Rate limit handling | SAM | ✅ | — |
| 2.9 | CEO dashboard v2 wireframes | MAYA | ✅ | AGT-310 |
| 2.10 | Build SystemHealthWidget v2 | LEO | ✅ | AGT-311 |
| 2.11 | Build VelocityWidget v2 | LEO | ✅ | AGT-312 |
| 2.12 | Mobile responsive dashboard | LEO | ✅ | — |
| 2.13 | Dashboard alerts | LEO | ✅ | — |
| 2.14 | E2E tests - dashboard | QUINN | ✅ | AGT-295 |
| 2.15 | E2E tests - dispatch flow | QUINN | ✅ | AGT-295 |
| 2.16 | Integration tests - Convex | QUINN | 🔄 | AGT-295 |
| 2.17 | API documentation update | ALEX | ⬜ | AGT-296 |
| 2.18 | Agent onboarding guide | ELLA | ⬜ | AGT-299 |
| 2.19 | Alert design system | MAYA | ✅ | — |
| 2.20 | Research self-healing patterns | COLE | 🔄 | — |
| 2.21 | Priority voting design | MAX | ⬜ | AGT-284 |

**Phase 2 Progress: 8/21 = 38%**

---

## Phase 3: Agent-Led Development (Feb 17 - Mar 9) — NEXT MONTH

> **Goal:** Agents propose features, ship with minimal oversight

| # | Task | Owner | Status | Ticket |
|---|------|-------|--------|--------|
| 3.1 | User feedback analysis | MAYA | ⬜ | AGT-282 |
| 3.2 | Feature proposal system | ALL | ⬜ | AGT-283 |
| 3.3 | Priority voting mechanism | MAX | ⬜ | AGT-284 |
| 3.4 | Minimal-oversight shipping | SAM/LEO | ⬜ | AGT-288 |
| 3.5 | Multi-project support | SAM | ⬜ | — |
| 3.6 | Agent leveling system | SAM | ⬜ | AGT-121 |
| 3.7 | Cost optimization | SAM | ⬜ | — |
| 3.8 | Task history tracking | SAM | ✅ | — |
| 3.9 | Performance analytics | SAM | ⬜ | — |
| 3.10 | Auto-PR review & merge | QUINN | ⬜ | AGT-279 |
| 3.11 | Regression tests | QUINN | ⬜ | — |
| 3.12 | Load testing | QUINN | ⬜ | — |
| 3.13 | Performance dashboard | LEO | ⬜ | — |
| 3.14 | Historical charts | LEO | ⬜ | — |
| 3.15 | Agent comparison view | LEO | ⬜ | — |
| 3.16 | Security audit OWASP | NOVA | ⬜ | AGT-303 |
| 3.17 | API optimization <100ms | SAM | ⬜ | AGT-302 |
| 3.18 | Competitive analysis | COLE | ⬜ | AGT-297 |
| 3.19 | Weekly metrics automation | IRIS | ⬜ | AGT-301 |
| 3.20 | Data visualization design | MAYA | ⬜ | — |
| 3.21 | Roadmap monthly review | MAX | ⬜ | — |

**Phase 3 Progress: 0/21 = 0%**

---

## Agent Territories

| Agent | Role | Primary Focus |
|-------|------|---------------|
| **MAX** | PM | Coordinate, roadmap, unblock, dispatch |
| **SAM** | Backend | APIs, infrastructure, self-healing |
| **LEO** | Frontend | Dashboard, UI, mobile |
| **QUINN** | QA | Testing, code review |
| **MAYA** | Design | Design system, wireframes |
| **COLE** | Research | Research, prototypes |
| **ALEX** | DevOps | CI/CD, docs |
| **ELLA** | Content | Documentation, onboarding |
| **NOVA** | Security | Security audit |
| **IRIS** | Data | Analytics, metrics |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ⬜ | Available - PICK IT UP |
| 🔄 | In Progress |
| ✅ | Complete |
| ❌ | Blocked |

---

## Metrics Targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| Tasks/day | 10+ | 20+ | 30+ |
| Autonomous hrs | 8h | 24h | 24h |
| CEO interventions | <3/day | <1/day | <1/week |
| Velocity | 0.5/hr | 1.0/hr | 2.0/hr |

---

## Daily Routine

**Every agent, every day:**
1. Read ROADMAP-V2.md
2. Find YOUR ⬜ tasks
3. Claim highest priority
4. Ship it
5. Update status
6. Repeat

**MAX (PM) daily:**
- Check all agent progress
- Update roadmap status
- Unblock stuck agents
- Post #dev summary

---

> **KHÔNG BAO GIỜ IDLE.**
>
> Đọc roadmap → Claim task → Ship → Repeat
