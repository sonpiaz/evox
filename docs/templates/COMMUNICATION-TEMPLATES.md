# Agent Communication Templates

> Standard formats for agent-to-agent and agent-to-channel communication.

---

## Session Start

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "{NAME} online. Checking dispatch queue."}'
```

---

## Task Started

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "Starting {AGT-XXX}: {brief description}"}'
```

**Example:**
> SAM: Starting AGT-281: Add System Health Widget to dashboard

---

## Progress Update

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "{AGT-XXX} progress: {what done} | Next: {what next}"}'
```

**Example:**
> LEO: AGT-272 progress: Git activity feed component done | Next: Wire up to dashboard

---

## Task Complete

```bash
# 1. Mark dispatch complete (REQUIRED)
curl -X POST 'https://gregarious-elk-556.convex.site/markDispatchCompleted' \
  -H 'Content-Type: application/json' \
  -d '{"dispatchId": "{id}", "result": "{brief summary}"}'

# 2. Post to channel
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "{AGT-XXX} complete. {summary}. Files: {list}. Commit: {hash}"}'
```

**Example:**
> SAM: AGT-281 complete. Added SystemHealthWidget with heartbeat monitoring. Files: SystemHealthWidget.tsx, health.ts. Commit: f382e0e

---

## Blocked

```bash
# Post to channel
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "BLOCKED on {AGT-XXX}: {reason}. Need: {what you need}. @{WHO_CAN_HELP}"}'

# DM relevant agent
curl -X POST 'https://gregarious-elk-556.convex.site/v2/sendMessage' \
  -H 'Content-Type: application/json' \
  -d '{"from": "{NAME}", "to": "{HELPER}", "message": "Need help with {issue}. Context: {details}"}'
```

**Example:**
> QUINN: BLOCKED on AGT-279: Tests failing on auth flow. Need: SAM to check token validation. @SAM

---

## Handoff

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "Handoff {AGT-XXX} to @{AGENT}: {context}. Files: {list}"}'
```

**Example:**
> SAM: Handoff AGT-272 to @LEO: Backend endpoints ready. Need UI component. Files: convex/gitActivity.ts

---

## Request Review

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "Review needed: {AGT-XXX}. @QUINN please check {what to review}"}'
```

**Example:**
> LEO: Review needed: AGT-269. @QUINN please check mobile responsiveness on CEODashboard

---

## Session End / Idle

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "HEARTBEAT_OK - No pending dispatch. Session summary: {what you did}. Ready for next task."}'
```

**Example:**
> ELLA: HEARTBEAT_OK - No pending dispatch. Session summary: Fixed 4 doc files, improved 2 UI components. Ready for next task.

---

## Escalate to CEO

```bash
curl -X POST 'https://gregarious-elk-556.convex.site/v2/sendMessage' \
  -H 'Content-Type: application/json' \
  -d '{"from": "{NAME}", "to": "CEO", "message": "{issue}. Options: {A or B}. Recommendation: {your pick}.", "priority": "high"}'
```

**Example:**
> SAM → CEO: Architecture decision needed for caching. Options: Redis vs in-memory. Recommendation: In-memory for MVP.

---

## Quick Reference

| Situation | Template | Required? |
|-----------|----------|-----------|
| Session start | `{NAME} online. Checking dispatch.` | Yes |
| Task started | `Starting {AGT-XXX}: {desc}` | Yes |
| Progress (hourly) | `{AGT-XXX} progress: {done} \| Next: {next}` | Recommended |
| Task complete | `{AGT-XXX} complete. {summary}. Commit: {hash}` | Yes |
| Blocked | `BLOCKED on {AGT-XXX}: {reason}. @{WHO}` | Yes |
| Handoff | `Handoff {AGT-XXX} to @{AGENT}: {context}` | Yes |
| Review request | `Review needed: {AGT-XXX}. @QUINN` | Yes |
| Session end | `HEARTBEAT_OK - {summary}` | Yes |

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `Done.` | `AGT-281 complete. Added widget. Commit: abc123` |
| `Working on stuff` | `AGT-272 progress: API done \| Next: UI` |
| Silent for hours | Update every 1-2 hours or on milestone |
| `Help!` | `BLOCKED on AGT-279: {specific issue}. @SAM` |
| Long paragraphs | Short, scannable updates |

---

## Message Field Reminder

**Always use `message`, NOT `content`:**
```json
{"channel": "dev", "from": "SAM", "message": "..."}  // Correct
{"channel": "dev", "from": "SAM", "content": "..."}  // Wrong!
```
