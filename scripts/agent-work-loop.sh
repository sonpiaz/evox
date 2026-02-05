#!/bin/bash
# agent-work-loop.sh — True 24/7 Autonomous Agent Work Loop
# Usage: ./scripts/agent-work-loop.sh <agent>
#
# This is THE infrastructure for 24/7 autonomous operation.
# Agent runs indefinitely: check queue → claim → execute → report → repeat
#
# Requirements:
# - tmux session named evox-<agent> running Claude Code
# - Convex API accessible
# - jq installed for JSON parsing

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-work-loop.sh <agent>"
  echo "Example: ./scripts/agent-work-loop.sh SAM"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVOX_API="https://gregarious-elk-556.convex.site"
TMUX_SESSION="evox-$AGENT_LOWER"
LOG_FILE="$EVOX_DIR/logs/agent-$AGENT_LOWER.log"

# Timing
POLL_INTERVAL=30        # Seconds between queue checks
HEARTBEAT_INTERVAL=300  # Seconds between heartbeats (5 min)
TASK_TIMEOUT=600        # Max seconds to wait for task completion (10 min)
COMPLETION_CHECK=30     # Seconds between completion checks

# Retry Configuration (AGT-292: Auto-retry failed tasks)
MAX_TASK_RETRIES=2      # Max retries per dispatch before giving up
RETRY_BACKOFF=60        # Seconds to wait before retry

# ============================================================================
# SETUP
# ============================================================================

cd "$EVOX_DIR"
mkdir -p "$EVOX_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "🤖 $AGENT_UPPER AUTONOMOUS WORK LOOP"
log "=========================================="
log "Directory: $EVOX_DIR"
log "API: $EVOX_API"
log "tmux: $TMUX_SESSION"
log "Poll interval: ${POLL_INTERVAL}s"
log ""

# ============================================================================
# API FUNCTIONS (Using deployed endpoints)
# ============================================================================

# Get next pending dispatch for this agent
get_next_dispatch() {
  curl -s "$EVOX_API/getNextDispatchForAgent?agent=$AGENT_UPPER" 2>/dev/null || echo '{"dispatchId":null}'
}

# Mark dispatch as running (claim it)
mark_running() {
  local dispatch_id="$1"
  curl -s "$EVOX_API/markDispatchRunning?dispatchId=$dispatch_id" 2>/dev/null || echo '{"error":"failed"}'
}

# Mark dispatch as completed
mark_completed() {
  local dispatch_id="$1"
  local result="$2"
  # URL encode the result
  local encoded_result=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$result'))" 2>/dev/null || echo "completed")
  curl -s "$EVOX_API/markDispatchCompleted?dispatchId=$dispatch_id&result=$encoded_result" 2>/dev/null || echo '{"error":"failed"}'
}

# Mark dispatch as failed
mark_failed() {
  local dispatch_id="$1"
  local error="$2"
  local encoded_error=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$error'))" 2>/dev/null || echo "failed")
  curl -s "$EVOX_API/markDispatchFailed?dispatchId=$dispatch_id&error=$encoded_error" 2>/dev/null || echo '{"error":"failed"}'
}

# ============================================================================
# STATUS TRACKING (AGT-292: Agent Status in Convex)
# ============================================================================

# Update agent status in Convex via heartbeat API
update_agent_status() {
  local status="$1"
  local current_task="${2:-}"
  curl -s -X POST "$EVOX_API/api/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"agentId\": \"$AGENT_UPPER\", \"status\": \"$status\", \"currentTask\": $( [ -n "$current_task" ] && echo "\"$current_task\"" || echo "null" )}" 2>/dev/null || true
}

# Report recovery success (reset failure counters)
report_recovery_success() {
  # This would call the recovery API if deployed
  log "   📈 Recovery success reported"
}

# Send heartbeat to channel AND update status
send_heartbeat() {
  local status="${1:-idle}"
  # Update Convex status
  update_agent_status "$status"
  # Also post to channel for visibility
  curl -s -X POST "$EVOX_API/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"🫀 Heartbeat: ${status^}, checking for work\"}" 2>/dev/null || true
}

# Post status to dev channel
post_status() {
  local message="$1"
  curl -s -X POST "$EVOX_API/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"$message\"}" 2>/dev/null || true
}

# ============================================================================
# TMUX FUNCTIONS (with self-healing)
# ============================================================================

# Check if tmux session exists
session_exists() {
  tmux has-session -t "$TMUX_SESSION" 2>/dev/null
}

# Self-healing: Create tmux session if it doesn't exist
create_session() {
  log "   🔧 Self-healing: Creating tmux session $TMUX_SESSION..."
  tmux new-session -d -s "$TMUX_SESSION" -c "$EVOX_DIR" 2>/dev/null || true
  sleep 2

  # Start Claude Code in the session
  if session_exists; then
    log "   🚀 Starting Claude Code in session..."
    tmux send-keys -t "$TMUX_SESSION" "claude" Enter
    sleep 5  # Wait for Claude to initialize
    return 0
  fi
  return 1
}

# Ensure session exists (self-healing)
ensure_session() {
  if ! session_exists; then
    log "   ⚠️ tmux session not found, attempting self-heal..."
    update_agent_status "idle"  # Report we're recovering

    if create_session; then
      log "   ✅ Session recreated successfully"
      post_status "🔧 Self-healed: Recreated tmux session"
      report_recovery_success
      return 0
    else
      log "   ❌ Failed to recreate session"
      update_agent_status "offline"
      post_status "❌ Self-heal failed: Cannot create tmux session"
      return 1
    fi
  fi
  return 0
}

# Send command to tmux session
send_to_tmux() {
  local cmd="$1"
  tmux send-keys -t "$TMUX_SESSION" "$cmd" Enter
}

# Get last N lines from tmux pane
get_tmux_output() {
  local lines="${1:-10}"
  tmux capture-pane -t "$TMUX_SESSION" -p | tail -n "$lines"
}

# Check if Claude is at prompt (idle)
is_claude_idle() {
  local output=$(get_tmux_output 5)
  # Claude Code shows "❯" when idle and waiting for input
  if [[ "$output" == *"❯"* ]] && [[ "$output" != *"Thinking"* ]] && [[ "$output" != *"..."* ]]; then
    return 0
  fi
  return 1
}

# Check if Claude is stuck (showing error or crashed)
is_claude_stuck() {
  local output=$(get_tmux_output 20)
  # Check for error patterns
  if [[ "$output" == *"Error:"* ]] || [[ "$output" == *"panic"* ]] || [[ "$output" == *"SIGTERM"* ]]; then
    return 0
  fi
  return 1
}

# Wait for Claude to become idle (task complete)
wait_for_completion() {
  local timeout="$1"
  local elapsed=0

  while [ $elapsed -lt $timeout ]; do
    sleep "$COMPLETION_CHECK"
    elapsed=$((elapsed + COMPLETION_CHECK))

    # Check for stuck/crashed state
    if is_claude_stuck; then
      log "   🔴 Claude appears stuck/crashed"
      return 2  # Special return code for stuck
    fi

    if is_claude_idle; then
      log "   ✅ Claude is idle (task likely complete)"
      return 0
    fi

    log "   ⏳ Still working... (${elapsed}s / ${timeout}s)"
  done

  log "   ⚠️ Timeout waiting for completion"
  return 1
}

# ============================================================================
# RETRY TRACKING (AGT-292: Auto-retry failed tasks)
# ============================================================================

RETRY_FILE="$EVOX_DIR/logs/retry-$AGENT_LOWER.json"

# Get retry count for a dispatch
get_retry_count() {
  local dispatch_id="$1"
  if [ -f "$RETRY_FILE" ]; then
    python3 -c "import json; d=json.load(open('$RETRY_FILE')); print(d.get('$dispatch_id', 0))" 2>/dev/null || echo "0"
  else
    echo "0"
  fi
}

# Increment retry count for a dispatch
increment_retry() {
  local dispatch_id="$1"
  local current=$(get_retry_count "$dispatch_id")
  local new=$((current + 1))
  if [ -f "$RETRY_FILE" ]; then
    python3 -c "import json; d=json.load(open('$RETRY_FILE')); d['$dispatch_id']=$new; json.dump(d, open('$RETRY_FILE','w'))" 2>/dev/null || echo "{\"$dispatch_id\": $new}" > "$RETRY_FILE"
  else
    echo "{\"$dispatch_id\": $new}" > "$RETRY_FILE"
  fi
  echo "$new"
}

# Clear retry tracking for a dispatch (on success)
clear_retry() {
  local dispatch_id="$1"
  if [ -f "$RETRY_FILE" ]; then
    python3 -c "import json; d=json.load(open('$RETRY_FILE')); d.pop('$dispatch_id', None); json.dump(d, open('$RETRY_FILE','w'))" 2>/dev/null || true
  fi
}

# ============================================================================
# MAIN WORK LOOP
# ============================================================================

CYCLE=0
LAST_HEARTBEAT=0
CONSECUTIVE_FAILURES=0
MAX_FAILURES=3

# Startup: Set status to online and announce
update_agent_status "online"
post_status "🚀 Work loop started. Ready for tasks."

# Ensure tmux session exists at startup
if ! ensure_session; then
  log "❌ Failed to initialize tmux session. Exiting."
  exit 1
fi

while true; do
  CYCLE=$((CYCLE + 1))
  CURRENT_TIME=$(date +%s)

  log ""
  log "🔄 Cycle $CYCLE - $(date '+%H:%M:%S')"

  # -------------------------------------------------------------------------
  # 0. SELF-HEALING CHECK (ensure session exists)
  # -------------------------------------------------------------------------
  if ! ensure_session; then
    CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    log "   ❌ Session check failed (${CONSECUTIVE_FAILURES}/${MAX_FAILURES})"

    if [ $CONSECUTIVE_FAILURES -ge $MAX_FAILURES ]; then
      log "   🛑 Circuit breaker: Too many failures. Stopping."
      update_agent_status "offline"
      post_status "🛑 Circuit breaker tripped after ${MAX_FAILURES} failures"
      exit 1
    fi

    sleep "$POLL_INTERVAL"
    continue
  fi

  # Reset failure counter on successful check
  if [ $CONSECUTIVE_FAILURES -gt 0 ]; then
    log "   ✅ Session recovered, resetting failure counter"
    CONSECUTIVE_FAILURES=0
    report_recovery_success
  fi

  # -------------------------------------------------------------------------
  # 1. HEARTBEAT (every 5 minutes)
  # -------------------------------------------------------------------------
  if [ $((CURRENT_TIME - LAST_HEARTBEAT)) -ge $HEARTBEAT_INTERVAL ]; then
    log "💓 Sending heartbeat..."
    if is_claude_idle; then
      send_heartbeat "idle"
    else
      send_heartbeat "busy"
    fi
    LAST_HEARTBEAT=$CURRENT_TIME
  fi

  # -------------------------------------------------------------------------
  # 2. CHECK DISPATCH QUEUE
  # -------------------------------------------------------------------------
  log "📋 Checking dispatch queue..."
  DISPATCH_RESPONSE=$(get_next_dispatch)
  DISPATCH_ID=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dispatchId') or '')" 2>/dev/null || echo "")

  if [ -z "$DISPATCH_ID" ] || [ "$DISPATCH_ID" = "null" ]; then
    log "   📭 No dispatch in queue"

    # -------------------------------------------------------------------------
    # SELF-ASSIGNMENT MODE (North Star: KHÔNG BAO GIỜ IDLE > 5 min)
    # -------------------------------------------------------------------------
    log "   🔍 Entering self-assignment mode..."

    if ensure_session && is_claude_idle; then
      # Update status to busy for self-assigned work
      update_agent_status "busy" "Self-assigned work"

      # Build self-assignment prompt for Claude
      SELF_ASSIGN_PROMPT="You have no assigned dispatch. Time to SELF-ASSIGN work.

## SELF-ASSIGNMENT PROTOCOL (from docs/AGENT-AUTONOMY.md)

1. Check Linear backlog for unassigned tickets matching your skills
2. Check docs/ROADMAP.md for items in current phase
3. Check recent commits for bugs to fix
4. Enter improvement mode: refactor, test, document

## YOUR SKILLS (from agents/$AGENT_LOWER.md)
Read your agent file to know your territory.

## RULES
- KHÔNG BAO GIỜ IDLE > 5 min
- Align with NORTH-STAR.md
- Ship > Perfect

## ACTION
Pick ONE task and execute it. When done, report to #dev:
curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\":\"dev\",\"from\":\"$AGENT_UPPER\",\"message\":\"🔄 Self-assigned: [what you did]\"}'

GO. Find work. Ship something."

      log "   📤 Sending self-assignment prompt to Claude..."
      send_to_tmux "$SELF_ASSIGN_PROMPT"

      # Wait shorter time for self-assigned work
      log "   ⏳ Waiting for self-assigned work (max 300s)..."
      wait_for_completion 300 || true

      # Back to idle after self-assigned work
      update_agent_status "idle"
    fi

    log "   ⏳ Sleeping ${POLL_INTERVAL}s..."
    sleep "$POLL_INTERVAL"
    continue
  fi

  # -------------------------------------------------------------------------
  # 3. PARSE DISPATCH DETAILS
  # -------------------------------------------------------------------------
  COMMAND=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command','work'))" 2>/dev/null || echo "work")
  PAYLOAD=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('payload',''))" 2>/dev/null || echo "")
  TICKET=$(echo "$DISPATCH_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ticket') or '')" 2>/dev/null || echo "")

  log "   🎯 Found work!"
  log "   📦 Dispatch: $DISPATCH_ID"
  log "   🏷️  Command: $COMMAND"
  log "   🎫 Ticket: ${TICKET:-none}"

  # -------------------------------------------------------------------------
  # 4. CLAIM THE DISPATCH (mark as running)
  # -------------------------------------------------------------------------
  log "   🔒 Claiming dispatch..."
  CLAIM_RESULT=$(mark_running "$DISPATCH_ID")

  if echo "$CLAIM_RESULT" | grep -q "error"; then
    log "   ❌ Failed to claim dispatch"
    sleep "$POLL_INTERVAL"
    continue
  fi

  log "   ✅ Claimed successfully"

  # -------------------------------------------------------------------------
  # 5. CHECK TMUX SESSION (with self-healing)
  # -------------------------------------------------------------------------
  if ! ensure_session; then
    log "   ❌ Cannot recover tmux session"
    log "   📢 Marking dispatch as failed"
    mark_failed "$DISPATCH_ID" "tmux session recovery failed"
    post_status "❌ Error: tmux session recovery failed."
    sleep "$POLL_INTERVAL"
    continue
  fi

  # -------------------------------------------------------------------------
  # 6. UPDATE STATUS TO BUSY & SEND TASK TO CLAUDE
  # -------------------------------------------------------------------------
  log "   📤 Sending task to Claude..."
  update_agent_status "busy" "$COMMAND"

  # Build the task prompt
  TASK_PROMPT="You have a new task assigned.

DISPATCH_ID: $DISPATCH_ID
COMMAND: $COMMAND
TICKET: ${TICKET:-none}
PAYLOAD: $PAYLOAD

Instructions:
1. Read your agent file: agents/$AGENT_LOWER.md
2. Do the work described above
3. Commit changes if any
4. When DONE, run these commands:
   curl -s '$EVOX_API/markDispatchCompleted?dispatchId=$DISPATCH_ID&result=Done'
   curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\":\"dev\",\"from\":\"$AGENT_UPPER\",\"message\":\"✅ Completed: $COMMAND\"}'

GO. Execute this task now."

  # Send to tmux
  send_to_tmux "$TASK_PROMPT"

  # -------------------------------------------------------------------------
  # 7. WAIT FOR COMPLETION (with stuck detection and auto-retry)
  # -------------------------------------------------------------------------
  log "   ⏳ Waiting for task completion (max ${TASK_TIMEOUT}s)..."

  WAIT_RESULT=0
  wait_for_completion "$TASK_TIMEOUT" || WAIT_RESULT=$?

  case $WAIT_RESULT in
    0)
      log "   ✅ Task appears complete"
      clear_retry "$DISPATCH_ID"  # Clear retry tracking on success
      update_agent_status "idle"
      report_recovery_success
      sleep 5  # Give Claude time to make API calls
      ;;
    1|2)
      # Handle both timeout (1) and stuck (2) with retry logic
      RETRY_COUNT=$(get_retry_count "$DISPATCH_ID")
      log "   ⚠️ Task failed (retry $RETRY_COUNT/$MAX_TASK_RETRIES)"

      if [ "$RETRY_COUNT" -lt "$MAX_TASK_RETRIES" ]; then
        # Increment retry and attempt again
        NEW_RETRY=$(increment_retry "$DISPATCH_ID")
        log "   🔄 Scheduling retry #$NEW_RETRY in ${RETRY_BACKOFF}s..."
        post_status "🔄 Retry #$NEW_RETRY for: $COMMAND"

        # If stuck, try to recover Claude first
        if [ "$WAIT_RESULT" -eq 2 ]; then
          log "   🔧 Recovering Claude before retry..."
          send_to_tmux "/exit"
          sleep 2
          send_to_tmux "claude"
          sleep 5
        fi

        # Wait before retry
        sleep "$RETRY_BACKOFF"

        # Re-send the task (mark as running again and retry)
        log "   📤 Re-sending task to Claude (retry #$NEW_RETRY)..."
        update_agent_status "busy" "$COMMAND (retry #$NEW_RETRY)"
        send_to_tmux "$TASK_PROMPT"

        # Wait again for completion
        RETRY_WAIT_RESULT=0
        wait_for_completion "$TASK_TIMEOUT" || RETRY_WAIT_RESULT=$?

        if [ "$RETRY_WAIT_RESULT" -eq 0 ]; then
          log "   ✅ Retry succeeded!"
          clear_retry "$DISPATCH_ID"
          update_agent_status "idle"
        else
          log "   ❌ Retry #$NEW_RETRY failed"
          # Will try again next cycle if under max retries
        fi
      else
        # Max retries exceeded - mark as permanently failed
        log "   ❌ Max retries exceeded, marking as failed"
        if [ "$WAIT_RESULT" -eq 1 ]; then
          mark_failed "$DISPATCH_ID" "Timeout after ${MAX_TASK_RETRIES} retries"
        else
          mark_failed "$DISPATCH_ID" "Agent stuck after ${MAX_TASK_RETRIES} retries"
        fi
        post_status "❌ Task failed after ${MAX_TASK_RETRIES} retries: $COMMAND"
        clear_retry "$DISPATCH_ID"

        # Recover Claude if stuck
        if [ "$WAIT_RESULT" -eq 2 ]; then
          send_to_tmux "/exit"
          sleep 2
          send_to_tmux "claude"
          sleep 5
        fi
      fi
      update_agent_status "idle"
      ;;
  esac

  # -------------------------------------------------------------------------
  # 8. BRIEF PAUSE BEFORE NEXT CYCLE
  # -------------------------------------------------------------------------
  log "   🔄 Ready for next task"
  sleep 5

done

log "🛑 Work loop ended"
