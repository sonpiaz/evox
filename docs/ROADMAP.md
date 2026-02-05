# EVOX Product Roadmap

*Maintained by Max (PM) — Last updated: Feb 5, 2026*

---

## Vision

**EVOX = Autonomous AI Agent Orchestration Platform**

A system where AI agents:
- Work autonomously with minimal human intervention
- Communicate and collaborate with each other
- Self-heal and self-improve
- Demonstrate capabilities via public demo

---

## Current Phase: Phase 9 — Self-Improving System

Phase 8 (Hands-Off Operation) complete. All autonomy infrastructure shipped.

### 🔴 P0 — Blocking

*None — system operational*

### 🟠 P1 — In Progress

| Ticket | Task | Owner | Why Important |
|--------|------|-------|---------------|
| — | Task cost tracking | Sam | Measure efficiency per ticket |
| — | Comment reply threading | Leo | Better collaboration UX |

### 🟡 P2 — Backlog

| Ticket | Task | Owner |
|--------|------|-------|
| — | Dispatch reorder mutation | Sam |
| — | TypeScript cleanup | Leo |
| AGT-244 | Delete the Middleman | All |

---

## Phase 8 — Hands-Off Operation (COMPLETE)

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

---

## Phase 9 Goals (Current)

- Agents analyze their own performance
- Auto-create improvement tickets
- Learning shared across all agents
- Cost optimization per task
- A/B testing of approaches

## Phase 10 — Multi-Project Support (Future)

- EVOX manages multiple projects
- Agents switch contexts
- Resource allocation optimization

---

## Success Metrics

### Autonomy
- [x] Agents work 8+ hours without intervention
- [x] Inter-agent messages working
- [x] Auto-handoff functioning
- [x] Max self-monitors every 15 min
- [x] Error recovery with exponential backoff
- [x] Sub-agent spawning for parallel work

### Quality
- [x] Build always passes
- [x] Quinn catches bugs before deploy
- [x] Zero security vulnerabilities in demo

### Visibility
- [x] Dashboard shows real-time agent status
- [x] Activity feed updates live
- [x] Health metrics accurate

### Phase 9 Metrics (New)
- [ ] Cost per task < $1
- [ ] Agent self-improvement loop
- [ ] Cross-agent learning

---

## Weekly Check-in Template

```markdown
## Week of [Date]

### Completed
- [ ] ...

### In Progress
- [ ] ...

### Blocked
- [ ] ...

### Next Week Priorities
1. ...
2. ...
3. ...

### Learnings
- ...
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 5 | Phase 9 begins | Phase 8 complete, 100% automation |
| Feb 4 | Quinn can fix simple bugs | Faster iteration, clear handoff rules |
| Feb 4 | Long-running sessions over per-task | Context preservation |
| Feb 4 | Shared skills.sh | Reduce duplication |

---

*This roadmap is updated by Max. Agents should read this at session start.*
