#!/bin/bash
# agent-loop.sh — Autonomous agent work loop
# Usage: ./scripts/agent-loop.sh <agent>
# Runs continuously, checking for work every cycle

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-loop.sh <agent>"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVOX_API="https://gregarious-elk-556.convex.site"

cd "$EVOX_DIR"

# Model selection: AGENT_MODEL env var or default to sonnet
AGENT_MODEL="${AGENT_MODEL:-sonnet}"
MODEL_FLAG=""
if [ "$AGENT_MODEL" = "opus" ]; then
  MODEL_FLAG="--model opus"
elif [ "$AGENT_MODEL" = "haiku" ]; then
  MODEL_FLAG="--model haiku"
fi

echo "🤖 $AGENT_UPPER Autonomous Loop Starting..."
echo "   Directory: $EVOX_DIR"
echo "   API: $EVOX_API"
echo "   Model: $AGENT_MODEL"
echo ""

# Function to check for messages
check_messages() {
  curl -s "$EVOX_API/v2/getMessages?agent=$AGENT_UPPER&limit=10" 2>/dev/null
}

# Function to check for work
check_work() {
  curl -s "$EVOX_API/getNextDispatchForAgent?agent=$AGENT_UPPER" 2>/dev/null
}

# Function to send heartbeat
send_heartbeat() {
  curl -s -X POST "$EVOX_API/postToChannel" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"🫀 Heartbeat: Online and checking for work\"}" 2>/dev/null
}

CYCLE=0

while true; do
  CYCLE=$((CYCLE + 1))
  echo ""
  echo "=========================================="
  echo "🔄 Cycle $CYCLE - $(date '+%H:%M:%S')"
  echo "=========================================="
  
  # 1. Check messages
  echo "📬 Checking messages..."
  MESSAGES=$(check_messages)
  UNREAD=$(echo "$MESSAGES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('unreadCount',{}).get('dms',0))" 2>/dev/null || echo "0")
  
  if [ "$UNREAD" != "0" ] && [ "$UNREAD" != "" ]; then
    echo "   📨 $UNREAD unread messages - Starting Claude to respond..."
    
    PROMPT="You are $AGENT_UPPER. You have $UNREAD unread messages.

CHECK YOUR MESSAGES NOW:
\`\`\`bash
curl -s '$EVOX_API/v2/getMessages?agent=$AGENT_UPPER&limit=10'
\`\`\`

For each unread message:
1. Read it carefully
2. Respond appropriately via:
   \`\`\`bash
   curl -X POST '$EVOX_API/v2/sendMessage' -H 'Content-Type: application/json' -d '{\"from\": \"$AGENT_UPPER\", \"to\": \"SENDER\", \"message\": \"your response\"}'
   \`\`\`

After responding to ALL messages, say MESSAGES_DONE."

    timeout 300 claude --dangerously-skip-permissions $MODEL_FLAG "$PROMPT" 2>/dev/null || true
  else
    echo "   ✅ No unread messages"
  fi
  
  # 2. Check for work
  echo "📋 Checking dispatch queue..."
  WORK=$(check_work)
  # API returns dispatchId, not _id
  HAS_WORK=$(echo "$WORK" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d and d.get('dispatchId') else 'no')" 2>/dev/null || echo "no")

  if [ "$HAS_WORK" = "yes" ]; then
    DISPATCH_ID=$(echo "$WORK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dispatchId',''))" 2>/dev/null)
    COMMAND=$(echo "$WORK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)
    PAYLOAD=$(echo "$WORK" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('payload',''))" 2>/dev/null)

    echo "   🎯 Found work: $COMMAND"
    echo "   📦 Dispatch ID: $DISPATCH_ID"

    # Mark as running (using GET with query param - deployed endpoint)
    curl -s "$EVOX_API/markDispatchRunning?dispatchId=$DISPATCH_ID" 2>/dev/null

    PROMPT="You are $AGENT_UPPER. You have a task assigned.

TASK: $COMMAND
DETAILS: $PAYLOAD
DISPATCH_ID: $DISPATCH_ID

Read your agent file: agents/$AGENT_LOWER.md
Read docs/CULTURE.md for context.

DO THE WORK. When complete:
1. Commit your changes if any: git add -A && git commit -m 'feat: description'
2. Mark complete:
   \`\`\`bash
   curl -s '$EVOX_API/markDispatchCompleted?dispatchId=$DISPATCH_ID&result=Brief+summary'
   \`\`\`
3. Post to dev channel:
   \`\`\`bash
   curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"✅ Completed: description\"}'
   \`\`\`

Start working now."

    timeout 600 claude --dangerously-skip-permissions $MODEL_FLAG "$PROMPT" 2>/dev/null || true

  else
    echo "   😴 No pending work"
  fi
  
  # 3. Heartbeat every 10 cycles
  if [ $((CYCLE % 10)) -eq 0 ]; then
    echo "💓 Sending heartbeat..."
    send_heartbeat
  fi
  
  # 4. Wait before next cycle
  echo "⏳ Waiting 60s before next cycle..."
  sleep 60
done
