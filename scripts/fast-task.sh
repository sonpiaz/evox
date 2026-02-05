#!/bin/bash
# fast-task.sh — Run one-shot task with Claude Code (no interactive)
# Usage: ./scripts/fast-task.sh <agent> "task description"
AGENT="${1:-sam}"
TASK="${2:-Check status}"
cd /Users/sonpiaz/.openclaw/workspace/evox
./scripts/boot.sh "$AGENT" >/dev/null 2>&1
claude --dangerously-skip-permissions -p --system-prompt "$(cat .claude-context)" "$TASK" 2>/dev/null
