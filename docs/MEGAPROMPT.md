# Megaprompt System

> **High-velocity documentation rewrites using AI agents.**

## What is a Megaprompt?

A megaprompt is a focused, time-boxed instruction to an agent to rewrite or create multiple documents at once. It's designed for:

- Documentation rewrites
- Bulk file creation
- Rapid iteration sprints

## Format

```
MEGAPROMPT: You are [AGENT], [ROLE].
[TASK]: [file1], [file2], [file3].
[CONSTRAINTS].
[QUALITY CRITERIA].
Ship in [TIME]. GO.
```

## Example

```
MEGAPROMPT: You are ALEX, PM.
Rewrite ALL documentation: /docs/README.md, /docs/ARCHITECTURE.md, /docs/API.md.
Clear. Actionable. No fluff.
Developer can onboard in 10 minutes.
Ship in 30 min. GO.
```

## Key Principles

### 1. Time-Boxed
Always include a deadline. Creates urgency and prevents perfectionism.

### 2. Specific Files
List exact file paths. No ambiguity about scope.

### 3. Quality Criteria
State what "done" looks like:
- "10-minute onboarding"
- "Zero fluff"
- "Working curl examples"

### 4. Role Assignment
Assign the right agent for the task:
- **ALEX** - Documentation, specs, coordination
- **LEO** - UI/UX documentation, component docs
- **SAM** - API docs, technical specs
- **MAX** - Planning docs, roadmaps

## When to Use

| Scenario | Use Megaprompt? |
|----------|-----------------|
| Rewrite 3+ docs | ✅ Yes |
| Create ticket specs | ✅ Yes |
| Quick typo fix | ❌ No, just fix |
| Code changes | ❌ No, use tickets |

## Output Expectations

Agent should:
1. Create/update all files listed
2. Verify build passes
3. Commit with clear message
4. Report completion to #dev

## Example Results

From AGT megaprompt (Feb 5, 2026):
- `docs/README.md` - 127 lines, 10-min onboarding
- `docs/ARCHITECTURE.md` - 188 lines, system design
- `docs/API.md` - 240 lines, complete endpoints
- `docs/tickets/PHASE2-MILESTONES.md` - Phase 2 roadmap
- `docs/tickets/AGT-278-BLOCKER-DETECTION.md` - Full spec
- `docs/tickets/AGT-280-SELF-IMPROVEMENT.md` - Full spec
- `docs/tickets/AGT-281-HEALTH-DASHBOARD.md` - Full spec

Total: 7 docs in ~30 minutes.

## Tips

1. **Be brutal with scope** - List only what's needed
2. **Trust the agent** - Don't micromanage structure
3. **Review after** - Fix minor issues in follow-up
4. **Stack megaprompts** - Chain them for larger rewrites
