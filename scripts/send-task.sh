#!/bin/bash
# send-task.sh - Send task to agent and VERIFY it started
# Usage: ./send-task.sh <agent> "<task>"

AGENT="${1:-}"
TASK="${2:-}"

if [ -z "$AGENT" ] || [ -z "$TASK" ]; then
  echo "Usage: ./send-task.sh <agent> \"<task>\""
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
SESSION="evox-$AGENT_LOWER"

echo "📤 Sending to $AGENT..."

# Clear any pending input
tmux send-keys -t "$SESSION" C-c 2>/dev/null
sleep 0.5

# Auto-prepend agent identity to prevent confusion
TASK_WITH_IDENTITY="You are $AGENT_UPPER. $TASK"

# Send the task
tmux send-keys -t "$SESSION" "$TASK_WITH_IDENTITY"
sleep 0.3

# Send Enter to execute
tmux send-keys -t "$SESSION" Enter
sleep 0.5

# Send another Enter if needed
tmux send-keys -t "$SESSION" Enter
sleep 2

# Verify agent is working
STATUS=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null | grep -E "✻|✶|⏺|Reading|Working|Thinking" | tail -1)

if [ -n "$STATUS" ]; then
  echo "✅ $AGENT is working: $STATUS"
else
  echo "⚠️ $AGENT may not have started. Sending another Enter..."
  tmux send-keys -t "$SESSION" Enter
  sleep 2
  STATUS=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null | grep -E "✻|✶|⏺|Reading|Working|Thinking" | tail -1)
  if [ -n "$STATUS" ]; then
    echo "✅ $AGENT is now working: $STATUS"
  else
    echo "❌ $AGENT still not working. Check manually."
  fi
fi
