#!/bin/bash
# agent-daemon.sh — AGT-119: Staggered Heartbeat Scheduler (Local Component)
#
# ⚠️  DEPRECATED FOR PRODUCTION — AGT-218
# Production uses Convex crons for 24/7 cloud-based auto-dispatch.
# See: convex/crons.ts → "auto-dispatch-cycle" (runs every 5 min)
#
# This script is kept for local development/testing only.
# To use production crons, just deploy to Convex — no local daemon needed.
#
# Polls Convex for pending dispatches and triggers agent sessions.
# Run in background: ./scripts/agent-daemon.sh &
#
# Flow:
# 1. Poll Convex /getNextDispatch every 30s
# 2. If dispatch found → run boot.sh + open Claude Code
# 3. Agent works autonomously
# 4. Agent reports back via Convex API

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Config
POLL_INTERVAL=${POLL_INTERVAL:-30}  # seconds
CONVEX_SITE_URL="${CONVEX_SITE_URL:-https://gregarious-elk-556.convex.site}"
LOG_FILE="$PROJECT_DIR/.agent-daemon.log"
RUNNING_FILE="$PROJECT_DIR/.agent-running"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Agent Daemon starting..."
log "Poll interval: ${POLL_INTERVAL}s"
log "Convex URL: $CONVEX_SITE_URL"

# Track running agents via file (macOS bash compat)
is_agent_running() {
  grep -q "^$1$" "$RUNNING_FILE" 2>/dev/null
}

mark_agent_running() {
  echo "$1" >> "$RUNNING_FILE"
}

clear_agent_running() {
  grep -v "^$1$" "$RUNNING_FILE" > "$RUNNING_FILE.tmp" 2>/dev/null && mv "$RUNNING_FILE.tmp" "$RUNNING_FILE" || true
}

cleanup() {
  log "Daemon shutting down..."
  rm -f "$RUNNING_FILE"
  exit 0
}

trap cleanup SIGINT SIGTERM

poll_and_dispatch() {
  # Get next pending dispatch from Convex
  RESPONSE=$(curl -s "$CONVEX_SITE_URL/getNextDispatch" 2>/dev/null || echo '{"error":"network"}')

  # Check for errors
  if echo "$RESPONSE" | grep -q '"error"'; then
    return 0
  fi

  # Check if we got a dispatch
  DISPATCH_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('dispatchId',''))" 2>/dev/null || echo "")

  if [ -z "$DISPATCH_ID" ] || [ "$DISPATCH_ID" = "null" ]; then
    return 0
  fi

  AGENT_NAME=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('agentName','').lower())" 2>/dev/null)
  COMMAND=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)
  TICKET=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ticket',''))" 2>/dev/null)

  log "Dispatch found: $DISPATCH_ID for $AGENT_NAME ($COMMAND)"

  # Check if agent already running
  if is_agent_running "$AGENT_NAME"; then
    log "Agent $AGENT_NAME already running, skipping"
    return 0
  fi

  # Mark dispatch as running
  curl -s -X POST "$CONVEX_SITE_URL/markDispatchRunning?dispatchId=$DISPATCH_ID" > /dev/null 2>&1 || true

  # Boot agent
  log "Booting $AGENT_NAME..."
  mark_agent_running "$AGENT_NAME"

  cd "$PROJECT_DIR"

  if [ -n "$TICKET" ] && [ "$TICKET" != "null" ]; then
    ./scripts/boot.sh "$AGENT_NAME" "$TICKET" >> "$LOG_FILE" 2>&1
  else
    ./scripts/boot.sh "$AGENT_NAME" >> "$LOG_FILE" 2>&1
  fi

  # Build the autonomous prompt
  TASK_PROMPT="You are $AGENT_NAME. Read .claude-context for your identity and current task.

Your task: $TICKET
Command: $COMMAND

Instructions:
1. Read .claude-context to understand your identity and task
2. Read DISPATCH.md for your queue
3. Execute the task autonomously
4. Commit with 'closes $TICKET: description'
5. Push to remote
6. Report completion via Convex API

Start working now."

  # Open terminal with Claude Code + auto-prompt
  # macOS: Use osascript to open new Terminal tab
  if [[ "$OSTYPE" == "darwin"* ]]; then
    log "Opening terminal for $AGENT_NAME with auto-prompt..."
    osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions '$TASK_PROMPT'"
end tell
EOF
  else
    # Linux: Try to use gnome-terminal or xterm
    if command -v gnome-terminal &> /dev/null; then
      gnome-terminal -- bash -c "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions '$TASK_PROMPT'; exec bash"
    elif command -v xterm &> /dev/null; then
      xterm -e "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions '$TASK_PROMPT'; exec bash" &
    fi
  fi

  log "$AGENT_NAME session started"

  # Clear running flag after delay (allow time for agent to work)
  (sleep 300 && clear_agent_running "$AGENT_NAME") &
}

# Main loop
while true; do
  poll_and_dispatch
  sleep "$POLL_INTERVAL"
done
