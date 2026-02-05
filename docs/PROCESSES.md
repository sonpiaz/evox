# PROCESSES.md — Standard Operating Procedures

## Daily Operations

### Morning Check (EVOX/COO)
1. Check `v2/getMessages?agent=CEO` for overnight agent messages
2. Relay to CEO via Telegram
3. Check `/status` for blocked agents
4. Unblock or assign work

### Agent Communication
```bash
# DM an agent
curl -X POST ".../v2/sendMessage" -d '{"from":"EVOX","to":"MAX","message":"..."}'

# Check agent messages
curl ".../v2/getMessages?agent=AGENT_NAME"

# Post to channel
curl -X POST ".../postToChannel" -d '{"channel":"dev","from":"EVOX","message":"..."}'
```

### Contact CEO
```bash
curl -X POST ".../v2/sendMessage" \
  -d '{"from":"AGENT_NAME","to":"CEO","message":"...","priority":"high"}'
```
EVOX monitors and relays to Telegram.

---

## Development

### Start Work
```bash
cd /Users/sonpiaz/.openclaw/workspace/evox
npm run dev
```

### Before Commit
```bash
npm run build  # Must pass
npm run lint   # Fix warnings
```

### Commit Message Format
```
type: short description

- detail 1
- detail 2

Ticket: AGT-XXX
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

## Deployment

### UAT (Daily)
```bash
git checkout uat
git merge main
git push origin uat
# Auto-deploys to Vercel preview
```

### Production (CEO Approval)
1. PR: `uat` → `main`
2. CEO reviews
3. Merge → auto-deploy

---

## Troubleshooting

### Agent Not Responding
1. Check tmux: `tmux attach -t evox-<agent>`
2. Check status: `curl .../status`
3. Restart if needed: `./scripts/run-forever.sh <agent>`

### Terminals Not Visible
```bash
# Restart ttyd servers
./scripts/start-terminals.sh

# Check ports
curl -s localhost:7681  # MAX
curl -s localhost:7682  # SAM
curl -s localhost:7683  # LEO
curl -s localhost:7684  # QUINN
```

### Git Push Fails
See `docs/BLOCKERS.md` for auth solutions.

### Build Fails
```bash
npm run build 2>&1 | tail -50  # See errors
npm run lint -- --fix          # Auto-fix lint
```

---

## Emergency

### Kill All Agents
```bash
tmux kill-server
pkill -f "claude"
pkill ttyd
```

### Restart Everything
```bash
./scripts/boot.sh
./scripts/start-terminals.sh
```

---

---

## EPIC Task Methodology (MANDATORY)

> Every EPIC must follow this breakdown. No exceptions.

### Phase 1: Research (COLE)
- **Duration:** 30 min max
- **Output:** Research doc with findings
- **Owner:** COLE or assigned researcher
- Tasks:
  - [ ] Analyze existing code/patterns
  - [ ] Research best practices
  - [ ] Document findings in `docs/research/`

### Phase 2: Design (MAYA)
- **Duration:** 30 min max
- **Output:** Design spec or wireframes
- **Owner:** MAYA or assigned designer
- Tasks:
  - [ ] Create wireframes/mockups
  - [ ] Define component structure
  - [ ] Document in `docs/design/`

### Phase 3: Implementation (Split into Subtasks)
- **Rule:** Each subtask < 30 min
- **Format:** `[EPIC-XXX-1] Subtask description`
- Breakdown template:
  ```
  EPIC: AGT-XXX - Feature Name
  ├── AGT-XXX-R: Research (30 min) → COLE
  ├── AGT-XXX-D: Design (30 min) → MAYA
  ├── AGT-XXX-1: Backend API (30 min) → SAM
  ├── AGT-XXX-2: Frontend component (30 min) → LEO
  ├── AGT-XXX-3: Integration (30 min) → LEO
  └── AGT-XXX-Q: QA Review (30 min) → QUINN
  ```

### Phase 4: QA Review (QUINN)
- **Duration:** 30 min max per subtask
- **Output:** Approved or feedback
- **Owner:** QUINN
- Tasks:
  - [ ] Code review
  - [ ] Test coverage check
  - [ ] Accessibility audit
  - [ ] Approve or request changes

### Enforcement Rules

1. **No subtask > 30 min** - If estimate exceeds, split further
2. **Research before implementation** - No coding without research
3. **Design before frontend** - No UI without design spec
4. **QA on every subtask** - Not just at the end
5. **Track in Linear** - All subtasks as child issues

### Example Breakdown

```
EPIC: AGT-293 - CEO Dashboard v2
├── AGT-293-R: Research dashboard patterns (COLE, 30 min)
├── AGT-293-D: Design dashboard layout (MAYA, 30 min)
├── AGT-293-1: Build SystemHealthWidget (LEO, 30 min)
├── AGT-293-2: Build VelocityChart (LEO, 30 min)
├── AGT-293-3: Build BlockersCard (LEO, 30 min)
├── AGT-293-4: Build WinsCard (LEO, 30 min)
├── AGT-293-5: Integrate real-time data (FINN, 30 min)
└── AGT-293-Q: Full dashboard QA (QUINN, 30 min)
```

---

_Last updated: 2026-02-05_
