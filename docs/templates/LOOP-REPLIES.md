# Loop Reply Templates

**Part of:** The Loop — Agent Accountability System (CORE-209, AGT-335)
**When:** Use these templates when responding to messages in the Loop pipeline.

## Standard Reply Templates

### 1. Acknowledgment (SEEN → REPLIED)

Use immediately after reading a message. SLA: **15 minutes** from seen.

```
Got it, working on {TICKET_ID} now.
```

```
Acknowledged. Will start {TICKET_ID} — {brief description}.
```

```
Received. Queuing {TICKET_ID} after current task ({CURRENT_TASK}).
ETA: {time estimate}.
```

### 2. Action Started (REPLIED → ACTED)

Use when you create a task and begin work. SLA: **2 hours** from replied.

```
Started {TICKET_ID}, ETA {time estimate}.
Files: {file list}.
```

```
Working on {TICKET_ID}. Approach: {brief plan}.
Will report when done.
```

```
In progress. Created task {TICKET_ID} for tracking.
Estimated completion: {time}.
```

### 3. Blocked / Need Help

Use when you can't proceed. Triggers attention from other agents.

```
Blocked on {TICKET_ID}. Need help from @{AGENT}.
Reason: {what's blocking}.
```

```
{TICKET_ID} blocked — waiting for {dependency}.
Can't proceed until {condition}. @{AGENT} can you help?
```

```
Stuck on {TICKET_ID}: {error or issue}.
Tried: {what you attempted}.
Need: {what would unblock you}.
```

### 4. Completed (ACTED → REPORTED)

Use when task is done. SLA: **24 hours** from acted. Auto-sent by `completeTask` if task has `linkedMessageId`.

```
Done. {summary}. Files: {file list}. Verified: build passes.
```

```
Completed {TICKET_ID}: {what was done}.
Changed: {file list}.
Tested: {verification method}.
```

```
{TICKET_ID} done.
- {change 1}
- {change 2}
Files: {list}. Build: passing. Ready for review.
```

### 5. Handoff

Use when passing work to another agent.

```
Handing off {TICKET_ID} to @{AGENT}.
Status: {what's done}. Next: {what remains}.
Files touched: {list}.
```

```
@{AGENT} — {TICKET_ID} ready for your part.
Backend done: {summary}. Need frontend: {what's needed}.
```

## Usage in Code

### Automatic Loop Closing

When using `completeTask`, the summary field becomes the final report:

```bash
npx convex run agentActions:completeTask \
  '{"agent":"sam","ticket":"AGT-335","action":"completed","summary":"Task-message linkage implemented. Schema updated, completeTask auto-closes loops."}'
```

If the task has a `linkedMessageId`, this automatically:
1. Sets message status to REPORTED (5)
2. Stores your summary as `finalReport`
3. Resolves all active loop alerts

### Manual Loop Closing

If you need to close a loop without completing a task:

```bash
npx convex run messageStatus:markAsReported \
  '{"messageId":"MSG_ID","agentName":"sam","report":"Done. Summary here."}'
```

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Ignore messages | Mark as SEEN within 15 min |
| Reply without acting | Create task, link it, act |
| Complete task without reporting | Use `completeTask` (auto-reports) |
| Break the loop silently | Use `markLoopBroken` with reason |
| Send vague replies ("ok") | Use specific templates above |

## SLA Reference

| Stage | Timer | Alert Level |
|-------|-------|-------------|
| SEEN → REPLIED | 15 min | Warning |
| REPLIED → ACTED | 2 hours | Critical → MAX |
| ACTED → REPORTED | 24 hours | Critical → CEO |
