# ISSUES-LOG.md — Root Cause Analysis

> Mỗi issue phải có: Root Cause → Solution → Status

---

## Active Issues

### Issue #1: Agents Idle Overnight
**Discovered:** 2026-02-05 07:00
**Root Cause:** Old script không có continuous work loop. Claude session ends → 10s sleep → restart, nhưng không có mechanism để check work queue automatically.
**Solution:** Created `agent-loop-v2.sh` với:
- Auto-check messages mỗi cycle
- Auto-check dispatch queue
- Auto-restart sau 30s
- Built-in self-reporting instructions
**Status:** ✅ FIXED - 5 agents running với new loop

### Issue #2: UAT Returning 401
**Discovered:** 2026-02-05 07:00  
**Root Cause:** TBD - Need to check Vercel logs
**Solution:** TBD
**Status:** 🔄 INVESTIGATING

### Issue #3: Agents Not Self-Reporting
**Discovered:** 2026-02-05 03:38
**Root Cause:** Agents nói "TASK_COMPLETE" trong terminal nhưng không call API
**Solution:** 
1. Created docs/SELF-REPORTING.md
2. Added API call instructions to agent loop prompt
**Status:** 🔄 MONITORING - Need to verify agents now call API

---

## Resolved Issues

*(Move issues here when fixed and verified)*

---

## Template

### Issue #X: [Title]
**Discovered:** [Date Time]
**Root Cause:** [Why did this happen?]
**Solution:** [What fixed it?]
**Status:** 🔴 OPEN | 🔄 INVESTIGATING | ✅ FIXED
