#!/bin/bash
# Agent Inbox Daemon - Auto-polls Convex messages for all agents
# Runs in background, forwards messages to tmux sessions

CONVEX_URL="https://gregarious-elk-556.convex.site"
POLL_INTERVAL=20  # seconds
AGENTS=("max" "sam" "leo")

log() {
  echo "[$(date '+%H:%M:%S')] $1"
}

check_and_forward() {
  local agent=$1
  local tmux_session="evox-$agent"
  
  # Check inbox
  response=$(curl -s "${CONVEX_URL}/v2/getMessages?agent=${agent}&limit=3" 2>/dev/null)
  unread=$(echo "$response" | jq -r '.unreadCount.dms // 0' 2>/dev/null)
  
  if [ "$unread" != "0" ] && [ "$unread" != "null" ] && [ -n "$unread" ]; then
    # Get first unread message
    from=$(echo "$response" | jq -r '.unreadDMs[0].fromAgent // empty' 2>/dev/null)
    content=$(echo "$response" | jq -r '.unreadDMs[0].content // empty' 2>/dev/null | head -c 500)
    msgId=$(echo "$response" | jq -r '.unreadDMs[0]._id // empty' 2>/dev/null)
    
    if [ -n "$from" ] && [ -n "$content" ]; then
      log "📬 $agent has message from $from"
      
      # Forward to tmux
      tmux send-keys -t "$tmux_session" "
📬 MESSAGE from $from:
$content

Reply với: curl -X POST '${CONVEX_URL}/v2/sendMessage' -H 'Content-Type: application/json' -d '{\"from\":\"$agent\",\"to\":\"$from\",\"message\":\"<reply>\"}'
" Enter 2>/dev/null
      
      # Mark as read (optional - create endpoint if needed)
      log "✅ Forwarded to $agent"
    fi
  fi
}

log "🚀 Agent Inbox Daemon started"
log "📡 Polling every ${POLL_INTERVAL}s for: ${AGENTS[*]}"

while true; do
  for agent in "${AGENTS[@]}"; do
    check_and_forward "$agent"
  done
  sleep $POLL_INTERVAL
done
