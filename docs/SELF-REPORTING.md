# SELF-REPORTING.md — Agent Output Standards

> **Tất cả agents PHẢI tự report progress và completions.**

---

## 🚨 Rules (BẮT BUỘC)

### 1. Khi BẮT ĐẦU task
```bash
# Use GET with query params (currently deployed)
curl -s "https://gregarious-elk-556.convex.site/markDispatchRunning?dispatchId=<your-dispatch-id>"
```

### 2. Khi HOÀN THÀNH task
```bash
# Use GET with query params (currently deployed)
curl -s "https://gregarious-elk-556.convex.site/markDispatchCompleted?dispatchId=<your-dispatch-id>&result=Brief+summary"
```

### 3. Khi BỊ BLOCK
```bash
curl -X POST "https://gregarious-elk-556.convex.site/v2/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"from": "SAM", "to": "CEO", "message": "Blocked on X. Need Y.", "priority": "high"}'
```

---

## ❌ Anti-Patterns

| Wrong | Right |
|-------|-------|
| Say "TASK_COMPLETE" in terminal | Call `/markDispatchCompleted` API |
| Silent completion | Post to #dev channel + mark done |
| Wait for someone to check | Proactively report status |

---

## ✅ Correct Workflow

```
1. Get dispatch → /getNextDispatchForAgent
2. Start work → /markDispatchRunning
3. Do the work
4. Commit code
5. Mark done → /markDispatchCompleted
6. Post update → /postToChannel (dev)
```

---

## Example: SAM completes AGT-268

```bash
# 1. Mark complete (GET with query params)
curl -s "https://gregarious-elk-556.convex.site/markDispatchCompleted?dispatchId=jx7bz4vw1smqssfz664f&result=AGT-268+implemented"

# 2. Post to channel (POST with JSON body)
curl -X POST "https://gregarious-elk-556.convex.site/postToChannel" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "dev",
    "from": "SAM",
    "message": "✅ AGT-268 complete: agentStats endpoints ready. Needs deploy."
  }'
```

---

## Why This Matters

- **CEO Dashboard** tracks completions via API
- **Analytics** count done tasks per agent  
- **Team visibility** — everyone sees who's doing what
- **No invisible work** — if it's not in the system, it didn't happen

---

## Quick Reference

| Action | Endpoint |
|--------|----------|
| Start task | `GET /markDispatchRunning?dispatchId=ID` |
| Complete task | `GET /markDispatchCompleted?dispatchId=ID&result=summary` |
| Post update | `POST /postToChannel` |
| Report blocker | `POST /v2/sendMessage` (to CEO) |
| Get next task | `GET /getNextDispatchForAgent?agent=NAME` |

---

_If you say "done" but don't call the API, it's NOT done._
