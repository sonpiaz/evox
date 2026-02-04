#!/bin/bash
# agent-loop.sh — 100x Autonomous Agent Loop (AGT-251)
#
# Usage: ./scripts/agent-loop.sh <agent>
#
# NEW: Direct Linear polling — no dispatch queue needed!
# Agent grabs highest priority unassigned ticket matching their role.

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-loop.sh <agent>"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONVEX_URL="https://gregarious-elk-556.convex.site"
LINEAR_API="https://api.linear.app/graphql"
LOCK_FILE="$PROJECT_DIR/.lock-$AGENT_LOWER"

cd "$PROJECT_DIR"

# === Agent Role Mapping ===
case "$AGENT_LOWER" in
  sam) ROLE="backend"; KEYWORDS="SAM|Backend|convex|api|schema" ;;
  leo) ROLE="frontend"; KEYWORDS="LEO|Frontend|UI|component|dashboard" ;;
  max) ROLE="pm"; KEYWORDS="MAX|PM|planning|coordination" ;;
  quinn) ROLE="qa"; KEYWORDS="QUINN|QA|test|bug" ;;
  *) ROLE="general"; KEYWORDS="." ;;
esac

# === LOCK: Prevent duplicate processes ===
if [ -f "$LOCK_FILE" ]; then
  OLD_PID=$(cat "$LOCK_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "ERROR: $AGENT already running (PID $OLD_PID)"
    exit 1
  fi
  rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"

# === HEARTBEAT ===
send_heartbeat() {
  curl -s -X POST "$CONVEX_URL/api/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{\"agentName\":\"$AGENT_LOWER\",\"status\":\"$1\",\"statusReason\":\"$2\"}" > /dev/null 2>&1 || true
}

# === CLEANUP ON EXIT ===
CURRENT_TICKET="none"
cleanup() {
  echo ""
  echo "=== Agent $AGENT_UPPER shutting down ==="
  send_heartbeat "offline" "shutdown"
  rm -f "$LOCK_FILE"
}
trap cleanup EXIT SIGINT SIGTERM

echo "╔════════════════════════════════════════════════╗"
echo "║  $AGENT_UPPER Agent — 100x Autonomous Mode     ║"
echo "║  Direct Linear Polling • No Dispatch Queue    ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
send_heartbeat "starting" "boot"

# === MAIN LOOP ===
while true; do
  send_heartbeat "polling" "looking_for_work"

  # === 1. Check dispatch queue first (backward compatible) ===
  RESPONSE=$(curl -s "$CONVEX_URL/getNextDispatchForAgent?agent=$AGENT_LOWER" 2>/dev/null || echo "{}")
  DISPATCH_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('dispatchId',''))" 2>/dev/null || echo "")
  TICKET=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('ticket',''))" 2>/dev/null || echo "")

  # === 2. If no dispatch, poll Linear directly ===
  if [ -z "$TICKET" ] || [ "$TICKET" = "null" ] || [ "$TICKET" = "" ]; then
    echo "No dispatch. Polling Linear directly..."

    # Query Linear for unassigned backlog tickets matching agent role
    LINEAR_QUERY='{"query":"{ issues(filter: { state: { type: { in: [\"backlog\", \"unstarted\"] } }, assignee: { null: true } }, first: 10, orderBy: priority) { nodes { identifier title priority state { name } labels { nodes { name } } } } }"}'

    LINEAR_RESPONSE=$(curl -s -X POST "$LINEAR_API" \
      -H "Content-Type: application/json" \
      -H "Authorization: $LINEAR_API_KEY" \
      -d "$LINEAR_QUERY" 2>/dev/null || echo "{}")

    # Find ticket matching agent's keywords
    TICKET=$(echo "$LINEAR_RESPONSE" | python3 -c "
import json, sys, re
try:
    data = json.load(sys.stdin)
    issues = data.get('data', {}).get('issues', {}).get('nodes', [])
    keywords = '$KEYWORDS'
    for issue in issues:
        title = issue.get('title', '')
        labels = ' '.join([l.get('name','') for l in issue.get('labels',{}).get('nodes',[])])
        if re.search(keywords, title + ' ' + labels, re.IGNORECASE):
            print(issue.get('identifier', ''))
            break
    else:
        # No keyword match, take first available if agent is general
        if '$ROLE' == 'general' and issues:
            print(issues[0].get('identifier', ''))
except:
    pass
" 2>/dev/null || echo "")

    DISPATCH_ID=""  # No dispatch for direct Linear grab
  fi

  # === 3. No work found ===
  if [ -z "$TICKET" ] || [ "$TICKET" = "null" ] || [ "$TICKET" = "" ]; then
    send_heartbeat "idle" "no_work"
    echo "$(date '+%H:%M:%S') — No work for $AGENT_UPPER. Sleeping 30s..."
    sleep 30
    continue
  fi

  # === 4. WORK ON TICKET ===
  echo ""
  echo "╔════════════════════════════════════════════════╗"
  echo "║  TASK: $TICKET"
  echo "╚════════════════════════════════════════════════╝"
  CURRENT_TICKET="$TICKET"
  send_heartbeat "working" "$TICKET"

  # Mark dispatch running if we have one
  if [ -n "$DISPATCH_ID" ] && [ "$DISPATCH_ID" != "null" ]; then
    curl -s "$CONVEX_URL/markDispatchRunning?dispatchId=$DISPATCH_ID" > /dev/null 2>&1 || true
  fi

  # Boot agent context
  ./scripts/boot.sh "$AGENT_LOWER" "$TICKET"

  # === 5. BUILD PROMPT ===
  PROMPT="You are $AGENT_UPPER — EVOX $ROLE engineer.

## TASK: $TICKET

## ABSOLUTE RULES — VIOLATION = FAILURE
- DO NOT ask questions. Ever. For any reason.
- DO NOT ask 'should I...?' or 'would you like...?' — JUST DO IT.
- DO NOT ask for clarification. Make assumptions and proceed.
- DO NOT wait for approval. Ship immediately.
- DO NOT say 'Let me know if...' — There is no one to ask.
- If uncertain, pick the best option and execute.
- If error, fix it yourself and continue.
- You are ALONE. No human will respond. Act accordingly.

## WORKFLOW
1. mcp__linear__get_issue id=\"$TICKET\" → get details
2. Read files, understand context
3. Implement the solution NOW
4. npx next build → verify
5. git add -A && git commit -m 'closes $TICKET: <summary>'
6. git push
7. mcp__linear__update_issue id=\"$TICKET\" state=\"Done\"
8. Output: TASK_COMPLETE

START IMMEDIATELY. Zero questions. Ship it."

  echo ""
  echo "Starting Claude for $TICKET..."
  echo ""

  # === 6. RUN CLAUDE WITH SELF-HEALING (AGT-251) ===
  # Note: Headless mode requires API credits (not subscription)
  # Add credits at: https://console.anthropic.com/settings/billing

  MAX_RETRIES=3
  RETRY_COUNT=0
  TASK_SUCCESS=false

  while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$TASK_SUCCESS" = "false" ]; do
    if [ $RETRY_COUNT -gt 0 ]; then
      BACKOFF_SECONDS=$((2 ** $RETRY_COUNT))
      echo ""
      echo "⚠️  Retry attempt $RETRY_COUNT/$MAX_RETRIES after ${BACKOFF_SECONDS}s backoff..."
      sleep $BACKOFF_SECONDS
    fi

    if claude --dangerously-skip-permissions "$PROMPT"; then
      echo ""
      echo "✅ $TICKET COMPLETED"
      TASK_SUCCESS=true
      if [ -n "$DISPATCH_ID" ] && [ "$DISPATCH_ID" != "null" ]; then
        curl -s "$CONVEX_URL/markDispatchCompleted?dispatchId=$DISPATCH_ID" > /dev/null 2>&1 || true
      fi
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))
      echo ""
      echo "❌ Attempt $RETRY_COUNT failed"
    fi
  done

  # If all retries exhausted, escalate
  if [ "$TASK_SUCCESS" = "false" ]; then
    echo ""
    echo "🚨 $TICKET FAILED after $MAX_RETRIES attempts — ESCALATING"
    if [ -n "$DISPATCH_ID" ] && [ "$DISPATCH_ID" != "null" ]; then
      curl -s "$CONVEX_URL/markDispatchFailed?dispatchId=$DISPATCH_ID&error=retry_exhausted" > /dev/null 2>&1 || true
    fi

    # Log failure to Convex
    npx convex run agentActions:reportFailure "{\"agent\":\"$AGENT_LOWER\",\"ticket\":\"$TICKET\",\"error\":\"Exhausted $MAX_RETRIES retries\",\"retryable\":false}" > /dev/null 2>&1 || true
  fi

  echo ""
  echo "Looking for next task..."
  sleep 5
done
