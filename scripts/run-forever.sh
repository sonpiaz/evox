#!/bin/bash
# run-forever.sh — Keep agent running 24/7
# Usage: ./scripts/run-forever.sh <agent>
# Runs in tmux, auto-restarts when session ends

set -e

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/run-forever.sh <agent>"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
SESSION="evox-$AGENT_LOWER"
EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVOX_API="https://gregarious-elk-556.convex.site"

# Kill existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create infinite loop script
LOOP_SCRIPT=$(cat <<'SCRIPT'
#!/bin/bash
AGENT_LOWER="__AGENT_LOWER__"
AGENT_UPPER="__AGENT_UPPER__"
EVOX_DIR="__EVOX_DIR__"
EVOX_API="__EVOX_API__"

cd "$EVOX_DIR"

while true; do
  echo "=========================================="
  echo "🚀 Starting $AGENT_UPPER at $(date)"
  echo "=========================================="
  
  # Boot context
  ./scripts/boot.sh "$AGENT_LOWER"
  
  # Build prompt
  PROMPT="You are $AGENT_UPPER. Read docs/CULTURE.md and docs/VISION.md first.

## COMMUNICATION FIRST
Before anything else, check and RESPOND to your messages:
\`\`\`bash
curl -s '$EVOX_API/v2/getMessages?agent=$AGENT_UPPER' | jq
\`\`\`

If you have unread DMs:
1. READ them carefully
2. RESPOND to each one via:
   \`\`\`bash
   curl -X POST '$EVOX_API/v2/sendMessage' -H 'Content-Type: application/json' \\
     -d '{\"from\": \"$AGENT_UPPER\", \"to\": \"AGENT_NAME\", \"message\": \"your reply\"}'
   \`\`\`
3. Mark as read

## THEN WORK
After responding to messages:
1. Check dispatch queue: curl -s '$EVOX_API/getNextDispatchForAgent?agent=$AGENT_UPPER' | jq
2. Work on your task
3. When done, post to #dev channel
4. Check messages again before next task

## COLLABORATION
- When you need help, DM the relevant agent
- When you finish something another agent needs, DM them
- Respond to pings within the same session
- Tag agents in channel messages with @AGENT_NAME

Start now. Check messages first, respond, then find work."

  # Run Claude Code
  claude --dangerously-skip-permissions \
    --system-prompt "$(cat .claude-context)" \
    "$PROMPT" || true
  
  echo ""
  echo "⏳ Session ended. Restarting in 10s..."
  sleep 10
done
SCRIPT
)

# Replace placeholders
LOOP_SCRIPT="${LOOP_SCRIPT//__AGENT_LOWER__/$AGENT_LOWER}"
LOOP_SCRIPT="${LOOP_SCRIPT//__AGENT_UPPER__/$AGENT_UPPER}"
LOOP_SCRIPT="${LOOP_SCRIPT//__EVOX_DIR__/$EVOX_DIR}"
LOOP_SCRIPT="${LOOP_SCRIPT//__EVOX_API__/$EVOX_API}"

# Write temp script
TEMP_SCRIPT="/tmp/evox-loop-$AGENT_LOWER.sh"
echo "$LOOP_SCRIPT" > "$TEMP_SCRIPT"
chmod +x "$TEMP_SCRIPT"

# Start tmux session with loop
tmux new-session -d -s "$SESSION" -c "$EVOX_DIR" "$TEMP_SCRIPT"

echo "✅ $AGENT_UPPER running 24/7 in tmux session: $SESSION"
echo "   Attach: tmux attach -t $SESSION"
echo "   Stop:   tmux kill-session -t $SESSION"
