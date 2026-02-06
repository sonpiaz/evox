# Claude Opus 4.6 — Team Upgrade Guide

*Prepared by EVOX | Reviewed by MAX (PM) | Feb 5, 2026*

---

## What's New

**Release Date:** February 5, 2026
**Model ID:** `claude-opus-4-6`

Anthropic's most intelligent model. Industry-leading for coding, enterprise agents, and professional work.

### Headline Features

| Feature | Detail | EVOX Impact |
|---------|--------|-------------|
| **1M Token Context** | First Opus with 1 million token window (beta) | Handle entire codebase in single session — no more context fragmentation |
| **Agent Teams** | Agents split tasks, coordinate directly, own their piece | This IS what EVOX does. Native support for our architecture. |
| **Better Planning** | Improved at code review, debugging, large codebase navigation | Agents work more like senior engineers — less hand-holding |
| **Reliable Tool Use** | More consistent function calling and API interactions | Fewer failed Convex mutations, more reliable Linear/MCP calls |
| **Financial Reasoning** | Stronger numerical and analytical capabilities | Better cost tracking, metrics accuracy |

---

## For EVOX Agents

### What Changes For You

1. **1M token context** — Handle bigger codebases in a single session. Less "I lost context" errors.
2. **Better tool calling** — Convex API calls, Linear MCP, git operations will be more reliable.
3. **Smarter planning** — Better task breakdown, fewer wrong turns.
4. **Agent Teams support** — Native ability to split work and coordinate with other agents. This aligns directly with our dispatch + messaging architecture.
5. **Cleaner code** — Fewer syntax errors, better patterns, more idiomatic TypeScript.

### What Stays The Same

- Your prompts and workflows do not change
- CLAUDE.md rules still apply
- CULTURE.md protocols still apply
- Convex messaging endpoints unchanged
- Model switch is automatic — no action needed from you

---

## Configuration

### For agent-loop scripts

The model ID in CLAUDE.md and boot scripts:
```
claude-opus-4-6
```

### For API calls (if any)

```typescript
model: "claude-opus-4-6"
// Previous Sonnet: "claude-sonnet-4-5-20250929"
// Previous Haiku: "claude-haiku-4-5-20251001"
```

---

## Cost & Token Considerations

- Opus 4.6 uses **more tokens per response** due to deeper reasoning
- Monitor weekly usage limits (currently at ~98% capacity)
- Opus is significantly more expensive per token than Sonnet
- **Recommendation:** Use Opus for complex tasks (planning, multi-file changes, debugging). Use Sonnet/Haiku for simple tasks (status updates, single-file edits) if cost becomes an issue.

---

## North Star Alignment

Opus 4.6 moves us closer to:

> **Agents that work like senior engineers — proactive, self-sufficient, high-quality output, 24/7.**

| Capability | North Star Connection |
|------------|----------------------|
| 1M context | Agents understand full codebase = fewer mistakes = less CEO intervention |
| Agent Teams | Native multi-agent coordination = our dispatch system gets smarter |
| Better planning | Agents break down tasks correctly the first time = higher velocity |
| Reliable tools | Fewer failed API calls = smoother autonomous operation |

---

## Rollout Plan

| Step | Owner | Status |
|------|-------|--------|
| 1. Prepare this document | EVOX | Done |
| 2. MAX review + feedback | MAX | Done |
| 3. CEO approval | CEO | Pending |
| 4. Team broadcast via #dev | MAX | After approval |
| 5. Activate Opus 4.6 for all agents | CEO | After approval |
| 6. Monitor performance (first 24h) | MAX + QUINN | After activation |

---

## Resources

- [Anthropic Announcement](https://www.anthropic.com/news) (Feb 5, 2026)
- [Claude Models Documentation](https://docs.anthropic.com/en/docs/about-claude/models)
- [AWS Bedrock Availability](https://aws.amazon.com/about-aws/whats-new/2026/2/claude-opus-4.6-available-amazon-bedrock/)

---

*Questions? DM MAX or post in #dev.*
