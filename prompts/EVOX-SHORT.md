# CEO → EVOX: The Loop + Opus 4.6 Activation

Priority: P0. Drop everything else.

---

## MISSION 1: The Loop

Implement agent accountability: `sent → seen → reply → act → report`. Zero dropped work.

### Tickets (AGT team, Linear)

| # | Ticket | Phase | Agent | Priority | Status |
|---|--------|-------|-------|----------|--------|
| 1 | AGT-334 | P1: Backend (schema + mutations + crons) | SAM | Urgent | Todo — START NOW |
| 2 | AGT-335 | P2: Agent Protocol (playbooks + task linkage) | SAM | Urgent | Blocked by 334 |
| 3 | AGT-336 | P3: CEO Dashboard (5 widgets + /app/loop) | LEO | High | Blocked by 334 |
| 4 | AGT-337 | P4: Enforcement (auto-nudge + escalation) | SAM | High | Blocked by 335 |
| 5 | AGT-338 | P5: Analytics (charts + insights) | LEO | Medium | Blocked by 336 |

Full spec on GitHub repo `sonpiaz/evox`:
- `prompts/EVOX-THE-LOOP-FULL.md` — full directive with inline code
- `docs/THE-LOOP-IMPLEMENTATION.md` — technical spec with TypeScript schema
- `docs/THE-LOOP.md` — vision + protocol + SLA targets

### Dispatch Orders

1. **SAM → AGT-334 NOW**
   Build: extend agentMessages schema (loop fields), add loopMetrics + loopAlerts tables, create markAsActed/markAsReported/markLoopBroken mutations, SLA monitor cron (5min), metrics cron (hourly).
   Files: convex/schema.ts, convex/messageStatus.ts, convex/loopMonitor.ts (new), convex/loopMetrics.ts (new)

2. **LEO → WAIT** — Do AGT-287 (Tailwind cleanup) until P1 done. Then dispatch AGT-336.

3. **QUINN → Plan tests only** — Unit + integration + E2E test strategy. No implementation.

4. **MAX → Coordinate** — Clear stale AGT-108. Track SAM progress. Report blockers.

5. **Monitor every 2h** — Check SAM. Report to CEO. Escalate if stuck > 30 min.

### Timeline

Week 1: SAM → P1 + P2 | Week 2: LEO → P3, SAM → P4 | Week 3: LEO → P5

---

## MISSION 2: Opus 4.6 Activation

Claude Opus 4.6 is now available. Model ID: `claude-opus-4-6`. This is the most capable model — 5x cost of Sonnet but significantly better reasoning.

### Model Assignment Per Agent

| Agent | Default Model | When to Use Opus 4.6 |
|-------|--------------|---------------------|
| SAM | Sonnet 4.5 | Schema design, architecture decisions, complex debugging |
| LEO | Sonnet 4.5 | Dashboard architecture, complex state management |
| QUINN | Sonnet 4.5 | E2E test strategy, complex bug root cause analysis |
| MAX | Sonnet 4.5 | Multi-phase planning, roadmap, risk assessment |

### How Agents Use Opus 4.6

Agents run via Claude Code CLI. To use Opus:
```bash
claude --model opus "Design the schema for The Loop"     # Opus 4.6
claude "Implement the markAsActed mutation"               # Sonnet 4.5 (default)
claude --model haiku "Format this JSON"                   # Haiku 4.5
```

The agent-loop.sh now supports `AGENT_MODEL` env var:
```bash
AGENT_MODEL=opus ./scripts/agent-loop.sh sam    # SAM runs on Opus
AGENT_MODEL=sonnet ./scripts/agent-loop.sh leo  # LEO runs on Sonnet
```

CEO will activate agents locally via: `./scripts/start-the-loop.sh`
This gives SAM Opus 4.6, others Sonnet 4.5.

### Your Role in Opus 4.6

1. **When dispatching tasks**, specify model in the dispatch payload:
   - Complex/architecture tasks: add `"Use --model opus for this task"`
   - Standard implementation: no model note needed (defaults to Sonnet)
   - Simple formatting: add `"Use --model haiku"`

2. **Track model usage** — Ask agents to report which model they used per subtask.

3. **Cost awareness** — Opus costs ~$15/$75 per 1M tokens in/out. Max $50/week/agent for Opus.

4. **Pilot tasks for this week (Feb 5-12):**
   - SAM: The Loop schema design (AGT-334) — USE OPUS
   - LEO: Dashboard architecture planning (when P1 done) — USE OPUS
   - QUINN: E2E test strategy — USE OPUS
   - MAX: Coordinate & report

5. **Report to CEO** — After Week 1, summarize: which tasks used Opus, was quality better, cost estimate.

### Broadcast to Team

Send this to all agents:
```
Opus 4.6 is live. Model ID: claude-opus-4-6.
Use it for: architecture, schema design, complex debugging, planning.
Use Sonnet for: implementation, bug fixes, daily work.
Use Haiku for: formatting, simple scripts.
CLI: claude --model opus "your prompt"
Cost: 5x Sonnet. Use wisely. Report model used per task.
Pilot week: Feb 5-12. Max $50/week/agent.
```

---

## CONVEX API

Base: `https://gregarious-elk-556.convex.site`

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Send DM | POST | `/v2/sendMessage` | `{"from":"EVOX","to":"SAM","message":"...","priority":"urgent"}` |
| Broadcast | POST | `/postToChannel` | `{"channel":"dev","from":"EVOX","message":"..."}` |
| Create dispatch | POST | `/createDispatch` | `{"agentName":"SAM","command":"...","payload":"...","priority":0}` |
| Check dispatch | GET | `/getNextDispatchForAgent?agent=SAM` | — |
| Mark running | GET | `/markDispatchRunning?dispatchId=XXX` | — |
| Mark complete | GET | `/markDispatchCompleted?dispatchId=XXX&result=Summary` | — |
| Get messages | GET | `/v2/getMessages?agent=EVOX&limit=10` | — |

---

## SUCCESS =

1. The Loop: Full cycle closes end-to-end. SLA alerts work. CEO dashboard live.
2. Opus 4.6: All agents know how to use it. SAM uses it for AGT-334 schema. Pilot data collected.

---

**EVOX: Acknowledge both missions. Dispatch SAM to AGT-334 with Opus 4.6. Broadcast Opus 4.6 announcement to team. Report back.**
