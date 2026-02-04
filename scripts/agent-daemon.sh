#!/bin/bash
# agent-daemon.sh — AGT-119: Staggered Heartbeat Scheduler (Local Component)
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

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Agent Daemon starting..."
log "Poll interval: ${POLL_INTERVAL}s"
log "Convex URL: $CONVEX_SITE_URL"

# Track running agents to prevent double-spawn
declare -A RUNNING_AGENTS

cleanup() {
  log "Daemon shutting down..."
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
  if [ "${RUNNING_AGENTS[$AGENT_NAME]}" = "1" ]; then
    log "Agent $AGENT_NAME already running, skipping"
    return 0
  fi

  # Mark dispatch as running
  curl -s -X POST "$CONVEX_SITE_URL/markDispatchRunning?dispatchId=$DISPATCH_ID" > /dev/null 2>&1 || true

  # Boot agent
  log "Booting $AGENT_NAME..."
  RUNNING_AGENTS[$AGENT_NAME]=1

  cd "$PROJECT_DIR"

  if [ -n "$TICKET" ] && [ "$TICKET" != "null" ]; then
    ./scripts/boot.sh "$AGENT_NAME" "$TICKET" >> "$LOG_FILE" 2>&1
  else
    ./scripts/boot.sh "$AGENT_NAME" >> "$LOG_FILE" 2>&1
  fi

  # Open terminal with Claude Code
  # macOS: Use osascript to open new Terminal tab
  if [[ "$OSTYPE" == "darwin"* ]]; then
    log "Opening terminal for $AGENT_NAME..."
    osascript <<EOF
tell application "Terminal"
  activate
  do script "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions"
end tell
EOF
  else
    # Linux: Try to use gnome-terminal or xterm
    if command -v gnome-terminal &> /dev/null; then
      gnome-terminal -- bash -c "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions; exec bash"
    elif command -v xterm &> /dev/null; then
      xterm -e "cd '$PROJECT_DIR' && echo '=== $AGENT_NAME Agent Session ===' && claude --dangerously-skip-permissions; exec bash" &
    fi
  fi

  log "$AGENT_NAME session started"

  # Clear running flag after delay (allow time for agent to work)
  (sleep 300 && unset "RUNNING_AGENTS[$AGENT_NAME]") &
}

# Main loop
while true; do
  poll_and_dispatch
  sleep "$POLL_INTERVAL"
done
