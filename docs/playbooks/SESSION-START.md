# Playbook: Session Start

**When:** Every new Claude Code / Cursor session
**Who:** All agents (Sam, Leo, Quinn, Max, Maya, Ella)
**Time:** ~30 seconds

## Boot Sequence

```
1. Read CLAUDE.md         → Project rules, territories, quality gates
2. Read DISPATCH.md       → Current task queue
3. Read your SOUL.md      → "Who am I? What am I good at?"
4. Read your WORKING.md   → "What was I doing last session?"
5. Process Inbox (Loop)   → "Any messages I need to act on?"
6. Check @mentions        → "Did anyone need me?"
7. Check task assignments → "What tasks are mine?"
8. Act — or report HEARTBEAT_OK
```

## Convex Memory Reads

```bash
# Read your SOUL.md (identity)
npx convex run agentMemory:get '{"agent":"sam","type":"soul"}'

# Read your WORKING.md (last session context)
npx convex run agentMemory:get '{"agent":"sam","type":"working"}'

# Read today's daily note
npx convex run agentMemory:getToday '{"agent":"sam"}'
```

## Process Inbox (The Loop — AGT-335)

Check for unread messages and process them through the Loop stages:

```bash
# 1. Get unread messages (inbox overview)
curl -s 'https://gregarious-elk-556.convex.site/v2/getMessages?agent=AGENT_NAME&limit=10'

# 2. Mark messages as SEEN (status 2)
npx convex run messageStatus:markAsSeen '{"messageId":"MSG_ID","agentName":"AGENT_NAME"}'

# 3. Reply to messages (status 3 — auto-set when you send reply)
curl -X POST 'https://gregarious-elk-556.convex.site/v2/sendMessage' \
  -H 'Content-Type: application/json' \
  -d '{"from":"AGENT_NAME","to":"SENDER","message":"Got it, working on AGT-XXX now"}'

# 4. If message requires work, create task and link it
npx convex run agentActions:linkMessageToTask '{"taskId":"TASK_ID","messageId":"MSG_ID"}'

# 5. Mark as ACTED (status 4)
npx convex run messageStatus:markAsActed '{"messageId":"MSG_ID","agentName":"AGENT_NAME"}'
```

### Reply Templates

Use standard replies from [docs/templates/LOOP-REPLIES.md](../templates/LOOP-REPLIES.md):
- **Acknowledge**: "Got it, working on AGT-XXX now"
- **Action started**: "Started AGT-XXX, ETA 2 hours"
- **Blocked**: "Blocked on [X], need help from @AGENT"
- **Completed**: "Done. [summary]. Files: [list]."

### SLA Reminders

| Stage | SLA Timer | What Happens |
|-------|-----------|--------------|
| SEEN → REPLIED | 15 min | Warning alert after 15 min |
| REPLIED → ACTED | 2 hours | Critical alert, escalate to MAX |
| ACTED → REPORTED | 24 hours | Critical alert, escalate to CEO |

## Heartbeat (if no work)

If no tasks assigned and no @mentions, report idle status:

```bash
curl -X POST https://gregarious-elk-556.convex.site/api/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"agentId":"sam","status":"idle"}'
```

## References
- ADR-001: External Persistent State
- ADR-002: Hierarchical Memory Architecture
- ADR-004: Scheduler-Driven Agent Activation
