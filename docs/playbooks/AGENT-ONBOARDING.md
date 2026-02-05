# Playbook: Agent Onboarding

**Goal**: New agent productive in 5 minutes
**Who**: Anyone setting up a new agent

---

## Quick Start (5 minutes)

### Step 1: Create Agent File (2 min)

```bash
# Copy template
cp docs/templates/AGENT-TEMPLATE.md agents/{name}.md

# Edit with agent specifics
# Required fields: Name, Role, Avatar, Territory, Strengths
```

### Step 2: Register Agent (1 min)

Update `agents/README.md`:
```markdown
| {NAME} | {Role} | [{name}.md](./{name}.md) | Active |
```

### Step 3: Initialize Memory (1 min)

```bash
# Create SOUL.md (identity - rarely changes)
npx convex run agentMemory:set '{"agent":"{name}","type":"soul","content":"# {NAME} Soul\n\n## Mission\n{mission}\n\n## Values\n- {value1}\n- {value2}"}'

# Create WORKING.md (session context - updates often)
npx convex run agentMemory:set '{"agent":"{name}","type":"working","content":"# {NAME} Working\n\n## Current Focus\nAwaiting first task\n\n## Next Session\nCheck dispatch queue for work"}'
```

### Step 4: Test Boot (1 min)

```bash
# Verify agent can check messages
curl -s 'https://gregarious-elk-556.convex.site/v2/getMessages?agent={NAME}&limit=5'

# Verify agent can check dispatch
curl -s 'https://gregarious-elk-556.convex.site/getNextDispatchForAgent?agent={NAME}'

# Post hello to dev channel
curl -X POST 'https://gregarious-elk-556.convex.site/postToChannel' \
  -H 'Content-Type: application/json' \
  -d '{"channel": "dev", "from": "{NAME}", "message": "{NAME} online. Ready for work."}'
```

---

## Required Files Checklist

| File | Purpose | Location |
|------|---------|----------|
| Agent identity | Who am I? | `agents/{name}.md` |
| SOUL.md | Core values | Convex `agentMemory` |
| WORKING.md | Current context | Convex `agentMemory` |

---

## Boot Sequence (Every Session)

```
1. Read CLAUDE.md         → Project rules
2. Read agents/{name}.md  → Your identity
3. Check messages         → Anyone need you?
4. Check dispatch         → Any assigned work?
5. Act or report idle     → HEARTBEAT_OK
```

---

## Communication Cheat Sheet

| Action | Command |
|--------|---------|
| Check messages | `curl -s '.../v2/getMessages?agent={NAME}'` |
| Check dispatch | `curl -s '.../getNextDispatchForAgent?agent={NAME}'` |
| Post to channel | `curl -X POST '.../postToChannel' -d '{"channel":"dev","from":"{NAME}","message":"..."}'` |
| DM agent | `curl -X POST '.../v2/sendMessage' -d '{"from":"{NAME}","to":"LEO","message":"..."}'` |
| Mark task running | `curl -X POST '.../markDispatchRunning' -d '{"dispatchId":"xxx"}'` |
| Mark task done | `curl -X POST '.../markDispatchCompleted' -d '{"dispatchId":"xxx","result":"..."}'` |

**Base URL**: `https://gregarious-elk-556.convex.site`

---

## Required Reading

Before first task, read these docs:

1. **[CULTURE.md](../CULTURE.md)** — Team values and how we work
2. **[VISION.md](../VISION.md)** — Product direction
3. **[SELF-REPORTING.md](../SELF-REPORTING.md)** — How to report progress
4. **[AGENT-API.md](../AGENT-API.md)** — All available endpoints

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgot to mark dispatch complete | Always call `/markDispatchCompleted` |
| Posted to channel with wrong field | Use `message`, not `content` |
| Didn't read files before editing | Always read first, then edit |
| Worked on unassigned task | Check dispatch queue first |
| Silent when blocked | Report blockers immediately |

---

## Verification

Agent is ready when:
- [ ] `agents/{name}.md` exists with all required fields
- [ ] Agent listed in `agents/README.md`
- [ ] Can retrieve messages via API
- [ ] Can post to dev channel
- [ ] Has read CULTURE.md

---

## Templates

- [Agent File Template](../templates/AGENT-TEMPLATE.md)
- [SOUL.md Template](../templates/SOUL-TEMPLATE.md)
- [WORKING.md Template](../templates/WORKING-TEMPLATE.md)

---

_New agent → 5 minutes → Productive_
