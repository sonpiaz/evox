#!/bin/bash
# skills.sh — Shared skills for all agents
# Source this file: source scripts/skills.sh
# Usage: skill_name [args]

# Load environment
source "$(dirname "$0")/../.env.local" 2>/dev/null || true

CONVEX_URL="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"
LINEAR_API_KEY="${LINEAR_API_KEY:-}"
TEAM_ID="2a06122d-f98e-45ac-8003-326b4c09cd4c"

# ============================================================
# SKILL: check_queue <agent>
# Get next task for an agent
# ============================================================
check_queue() {
  local agent="${1:-sam}"
  curl -s "$CONVEX_URL/getNextDispatchForAgent?agent=$agent"
}

# ============================================================
# SKILL: send_dm <from> <to> <message>
# Send a DM to another agent or channel
# ============================================================
send_dm() {
  local from="$1"
  local to="$2"
  local message="$3"

  curl -s -X POST "$CONVEX_URL/v2/dm" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"$from\",\"to\":\"$to\",\"message\":\"$message\"}"
}

# ============================================================
# SKILL: report_dev <agent> <message>
# Post a message to #dev channel
# ============================================================
report_dev() {
  local agent="$1"
  local message="$2"
  send_dm "$agent" "dev" "$message"
}

# ============================================================
# SKILL: create_ticket <title> <description> [priority]
# Create a Linear ticket
# ============================================================
create_ticket() {
  local title="$1"
  local description="$2"
  local priority="${3:-2}"

  curl -s -X POST "https://api.linear.app/graphql" \
    -H "Content-Type: application/json" \
    -H "Authorization: $LINEAR_API_KEY" \
    -d "{
      \"query\": \"mutation { issueCreate(input: { teamId: \\\"$TEAM_ID\\\", title: \\\"$title\\\", description: \\\"$description\\\", priority: $priority }) { success issue { identifier title } } }\"
    }"
}

# ============================================================
# SKILL: create_bug <title> <steps> <expected> <actual> <owner>
# Create a bug ticket with standard format
# ============================================================
create_bug() {
  local title="$1"
  local steps="$2"
  local expected="$3"
  local actual="$4"
  local owner="$5"

  local desc="## Bug: $title

**Owner:** @$owner

**Steps:**
$steps

**Expected:** $expected
**Actual:** $actual"

  create_ticket "[BUG] $title" "$desc" 1
}

# ============================================================
# SKILL: commit_task <ticket> <description>
# Commit with standard format and push
# ============================================================
commit_task() {
  local ticket="$1"
  local description="$2"

  git add -A
  git commit -m "closes $ticket: $description

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
  git push
}

# ============================================================
# SKILL: check_messages <agent>
# Get unread messages for an agent
# ============================================================
check_messages() {
  local agent="$1"
  curl -s "$CONVEX_URL/v2/unread?agent=$agent"
}

# ============================================================
# SKILL: agent_status
# Show all running agents
# ============================================================
agent_status() {
  echo "=== Running Agents ==="
  ps aux | grep -E "claude.*(sam|leo|quinn|max)" | grep -v grep | while read line; do
    pid=$(echo $line | awk '{print $2}')
    agent=$(echo $line | grep -oE "(sam|leo|quinn|max)" | head -1)
    echo "$agent: PID $pid"
  done
}

# ============================================================
# SKILL: queue_task <agent> <ticket> <description>
# Add a task to agent's queue
# ============================================================
queue_task() {
  local agent="$1"
  local ticket="$2"
  local description="$3"

  curl -s -X POST "$CONVEX_URL/createDispatch" \
    -H "Content-Type: application/json" \
    -d "{\"agentName\":\"$(echo $agent | tr '[:lower:]' '[:upper:]')\",\"command\":\"execute_ticket\",\"ticket\":\"$ticket\",\"description\":\"$description\"}"
}

# ============================================================
# SKILL: ping_agent <from> <to> <message>
# Send urgent ping to another agent
# ============================================================
ping_agent() {
  local from="$1"
  local to="$2"
  local message="$3"

  send_dm "$from" "$to" "🔔 PING: $message"
}

# ============================================================
# SKILL: handoff <from> <to> <ticket> <message>
# Hand off a task to another agent
# ============================================================
handoff() {
  local from="$1"
  local to="$2"
  local ticket="$3"
  local message="$4"

  queue_task "$to" "$ticket" "$message"
  ping_agent "$from" "$to" "Handoff: $ticket - $message"
  report_dev "$from" "🤝 Handed off $ticket to @$to: $message"
}

# ============================================================
# SKILL: log_learning <agent> <ticket> <title> <summary> [files] [patterns]
# Log session learning before ending
# ============================================================
log_learning() {
  local agent="$1"
  local ticket="$2"
  local title="$3"
  local summary="$4"
  local files="${5:-[]}"
  local patterns="${6:-}"

  curl -s -X POST "$CONVEX_URL/v2/learn" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent\": \"$agent\",
      \"taskId\": \"$ticket\",
      \"taskTitle\": \"$title\",
      \"summary\": \"$summary\",
      \"files\": $files,
      \"patterns\": \"$patterns\",
      \"tags\": [\"session\", \"$(date +%Y-%m-%d)\"]
    }"
}

# ============================================================
# SKILL: get_learnings [agent] [limit]
# Read learnings from team
# ============================================================
get_learnings() {
  local agent="${1:-}"
  local limit="${2:-10}"

  if [ -n "$agent" ]; then
    curl -s "$CONVEX_URL/v2/learnings?agent=$agent&limit=$limit"
  else
    curl -s "$CONVEX_URL/v2/learnings?limit=$limit"
  fi
}

# ============================================================
# SKILL: check_processes
# List all running Claude agents and their tasks
# ============================================================
check_processes() {
  echo "=== Running Processes ==="
  ps aux | grep -E "claude.*--dangerously" | grep -v grep | while read line; do
    pid=$(echo $line | awk '{print $2}')
    agent=$(echo $line | grep -oE "You are [A-Z]+" | awk '{print $3}')
    task=$(echo $line | grep -oE "TASK: AGT-[0-9]+" | awk '{print $2}')
    echo "$agent | $task | PID: $pid"
  done
}

# ============================================================
# SKILL: kill_agent <agent>
# Kill an agent and its loop
# ============================================================
kill_agent() {
  local agent="$1"
  local agent_lower=$(echo "$agent" | tr '[:upper:]' '[:lower:]')

  # Kill agent-loop.sh
  pkill -f "agent-loop.*$agent_lower" 2>/dev/null

  # Kill claude process
  pkill -f "claude.*$agent" 2>/dev/null

  echo "✓ Killed $agent"
}

# ============================================================
# SKILL: start_agent <agent>
# Start an agent in current terminal (subscription mode)
# ============================================================
start_agent() {
  local agent="$1"
  local agent_lower=$(echo "$agent" | tr '[:upper:]' '[:lower:]')

  cd "$(dirname "$0")/.."
  ./scripts/agent-loop.sh "$agent_lower"
}

# ============================================================
# SKILL: deploy_convex
# Deploy Convex functions
# ============================================================
deploy_convex() {
  echo "Deploying Convex..."
  npx convex deploy --yes
}

# ============================================================
# SKILL: session_summary <session_number>
# Create a new session summary file from template
# ============================================================
session_summary() {
  local session_num="$1"
  local date=$(date +%Y-%m-%d)
  local file="docs/sessions/${date}-session-${session_num}.md"

  mkdir -p docs/sessions

  cat > "$file" << 'TEMPLATE'
# Session SESSION_NUM — DATE

## Người thực hiện
- Human:
- Agent:

## Mục tiêu
[Mục tiêu chính]

## Đã hoàn thành
| # | Task | Ticket | Status |
|---|------|--------|--------|
| 1 | ... | AGT-XX | ✅ Done |

## Files đã thay đổi
```
path/to/file.ts — Mô tả
```

## Bài học
1. **Keyword** — Giải thích

## Lỗi & Fix
| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|

## Còn lại
- [ ] Task 1

## Commands
```bash
# Useful commands
```
TEMPLATE

  sed -i '' "s/SESSION_NUM/$session_num/g" "$file"
  sed -i '' "s/DATE/$date/g" "$file"

  echo "✓ Created $file"
}

# ============================================================
# SKILL: push_all
# Git add, commit and push with standard format
# ============================================================
push_all() {
  local message="$1"

  git add -A
  git commit -m "$message

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
  git push
}

echo "✓ Skills loaded. Available: check_queue, send_dm, report_dev, create_ticket, create_bug, commit_task, check_messages, agent_status, queue_task, ping_agent, handoff, log_learning, get_learnings, check_processes, kill_agent, start_agent, deploy_convex, session_summary, push_all"
