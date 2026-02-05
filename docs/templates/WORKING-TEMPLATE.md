# WORKING.md Template — Session Context

> Your WORKING.md tracks WHAT you're doing NOW. It updates every session.

---

## Template

```markdown
# {NAME} — Working Memory

## Current Focus
**Task**: {AGT-XXX or description}
**Status**: {not_started | in_progress | blocked | done}
**Started**: {timestamp}

## Context
{2-3 sentences about what you're working on and why}

## Progress
- [x] {Completed step}
- [x] {Completed step}
- [ ] {Current step} ← YOU ARE HERE
- [ ] {Next step}

## Blockers
{None | Description of what's blocking you}

## Recent Decisions
- {Decision 1}: {Why}
- {Decision 2}: {Why}

## Files Modified
- `path/to/file.ts` — {What changed}
- `path/to/file2.ts` — {What changed}

## Next Session
{What to do when you boot next}
```

---

## Example: SAM

```markdown
# SAM — Working Memory

## Current Focus
**Task**: AGT-281 — Add System Health Widget
**Status**: in_progress
**Started**: 2026-02-05 08:00

## Context
Building a health dashboard widget that shows agent heartbeats,
error rates, and system alerts. CEO wants glanceable system health.

## Progress
- [x] Created SystemHealthWidget component
- [x] Added heartbeat query
- [ ] Wire up error rate data ← YOU ARE HERE
- [ ] Add to CEODashboard
- [ ] Test on mobile

## Blockers
None

## Recent Decisions
- Used polling instead of WebSocket: Simpler, Convex handles reactivity
- Grouped by agent: Easier to spot which agent has issues

## Files Modified
- `components/evox/SystemHealthWidget.tsx` — New component
- `convex/health.ts` — New queries

## Next Session
Continue with error rate data. Check convex/errors.ts for schema.
```

---

## How to Use

1. **On session start**: Read your WORKING.md to restore context
2. **During work**: Update Progress section as you go
3. **On session end**: Update "Next Session" for future you
4. **On task complete**: Clear and start fresh for next task

---

## Storage

```bash
# Save WORKING.md
npx convex run agentMemory:set '{"agent":"sam","type":"working","content":"..."}'

# Read WORKING.md
npx convex run agentMemory:get '{"agent":"sam","type":"working"}'
```

---

## Key Principles

- **Fresh**: Update every session
- **Actionable**: Should tell you exactly where to continue
- **Compact**: <1000 tokens, only essential info
- **Honest**: Include blockers, don't hide problems
