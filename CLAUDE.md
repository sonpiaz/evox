# EVOX — Mission Control MVP

## Tech Stack
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Database: Convex (real-time, serverless)
- Repo: https://github.com/sonpiaz/evox

## Agent Territories (STRICT — no cross-editing)
- SAM (Backend): convex/, scripts/, lib/evox/
- LEO (Frontend): app/evox/, components/evox/

## Rules
- Commit format: closes EVOX-XX
- No auto-push unless Son approves
- Types first: schema.ts before UI
- AUTO-APPROVE: Do NOT ask for permission on file creation, edits, installs, or builds. Just do it. Only ask permission for: git push, API key changes, data deletion, or security-sensitive actions.
- AUTO-STATUS: For EVERY task, BEFORE starting update Linear issue to "In Progress", AFTER completing update to "Done" with comment (files, blockers, verification). If no Linear MCP access, print: STATUS_UPDATE: AGT-XX = DONE | Files: [list] | Verified: yes/no | Blockers: none

## AUTO-DISPATCH
When you finish a task or start a new session:
1. Read DISPATCH.md in repo root
2. Pick your top unfinished task
3. Read the full ticket from Linear issue (identifier in DISPATCH.md)
4. Start building immediately — no need to wait for Son or Max
5. When done: commit, mark task done, move to next task in queue

**Flow:**
Max writes ticket + updates DISPATCH.md → Son commits once
↓
Sam reads DISPATCH.md → picks task → builds → done → picks next
Leo reads DISPATCH.md → picks task → builds → done → picks next
