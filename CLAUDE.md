# EVOX Mission Control — Agent Rules

Auto-loaded every Claude Code session. Last updated: Feb 4, 2026.

## Constitution

**Read First:** [docs/VISION.md](docs/VISION.md) — The organizational DNA, values, and genius thinking framework.

## Project

| Key | Value |
|-----|-------|
| App | EVOX Mission Control — AI agent orchestration dashboard |
| Stack | Next.js 14 App Router + Convex + Tailwind + shadcn/ui |
| Deploy | Vercel → evox-ten.vercel.app |
| Repo | github.com/sonpiaz/evox |

## Team Territories

| Agent | Territory | Files |
|-------|-----------|-------|
| Sam | Backend | `convex/`, `lib/evox/`, `scripts/` |
| Leo | Frontend | `app/`, `components/` |
| Quinn | QA | `*.test.ts`, `e2e/`, code review |
| Max | PM | Linear docs, planning, coordination |

**Rule:** Territories are guidelines, not walls. Cross-territory edits allowed — just report in #dev.

## Agent Instructions
- Sam: [Linear Doc](https://linear.app/affitorai/document/sam-instructions-backend-agent-a0ad2c23626a)
- Leo: [Linear Doc](https://linear.app/affitorai/document/leo-instructions-frontend-agent-c84654462a4d)
- Quinn: [Linear Doc](https://linear.app/affitorai/document/quinn-operating-rules-e12df74361ab)

## Team Culture
**Read:** [docs/CULTURE.md](docs/CULTURE.md) — How we communicate, collaborate, and share learnings.

---

## Playbooks

| Playbook | When | Link |
|----------|------|------|
| Session Start | Every new session | [docs/playbooks/SESSION-START.md](docs/playbooks/SESSION-START.md) |
| Pre-Commit | Before every commit | [docs/playbooks/PRE-COMMIT.md](docs/playbooks/PRE-COMMIT.md) |
| Task Complete | After finishing any ticket | [docs/playbooks/TASK-COMPLETE.md](docs/playbooks/TASK-COMPLETE.md) |

---

## Patterns

| Pattern | Problem | Link |
|---------|---------|------|
| Display IDs | Never show raw Convex `_id` | [docs/patterns/DISPLAY-IDS.md](docs/patterns/DISPLAY-IDS.md) |
| Status Colors | Use exhaustive maps, not ternaries | [docs/patterns/STATUS-COLORS.md](docs/patterns/STATUS-COLORS.md) |
| Attribution | Agent name from caller, not API key | [docs/patterns/ATTRIBUTION.md](docs/patterns/ATTRIBUTION.md) |
| Convex Actions | When to use actions vs mutations | [docs/patterns/CONVEX-ACTIONS.md](docs/patterns/CONVEX-ACTIONS.md) |

---

## Quick Reference

### Session Start
```
1. Read CLAUDE.md → Rules
2. Read DISPATCH.md → Task queue
3. Read SOUL.md → Identity
4. Read WORKING.md → Last session context
5. Check @mentions → Anyone need me?
6. Act or report HEARTBEAT_OK
```

### Pre-Commit
```bash
npx next build                    # Must pass
git status                        # No untracked files
git diff --stat HEAD              # Review changes
```

### Task Complete
```bash
git commit -m "closes AGT-XX: description" && git push
npx convex run agentActions:completeTask '{"agent":"sam","ticket":"AGT-XX","action":"completed","summary":"..."}'
./scripts/linear-report.sh AGT-XX "Done. [summary]. Files: [list]."
```

---

## Quality Gates

| Rule | Check |
|------|-------|
| No raw `_id` in UI | `grep -rn "\._id" app/ components/ --include="*.tsx" \| grep -v "key="` |
| Build passes | `npx next build` |
| All files committed | `git status` |
| Case-insensitive status | Always `.toLowerCase()` |
| Attribution correct | Use `completeTask` API, not direct DB writes |

---

## Architecture Decisions

| ADR | Decision |
|-----|----------|
| [ADR-001](docs/decisions/ADR-001.md) | External persistent state for agent memory |
| [ADR-002](docs/decisions/ADR-002.md) | Hierarchical memory (SOUL/WORKING/daily) |
| [ADR-003](docs/decisions/ADR-003.md) | Shared communication via Convex |
| [ADR-004](docs/decisions/ADR-004.md) | Scheduler-driven agent activation |
| [ADR-005](docs/decisions/ADR-005.md) | Permission levels and human oversight |
