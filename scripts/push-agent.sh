#!/bin/bash
# push-agent.sh — Push work to an agent via Convex dispatch
#
# Usage: ./scripts/push-agent.sh <agent> <ticket> [description]
# Example: ./scripts/push-agent.sh sam AGT-215 "Build alert system with Telegram"
#
# This creates a dispatch that agent-daemon.sh will pick up and execute.

set -e

AGENT="${1:-}"
TICKET="${2:-}"
DESCRIPTION="${3:-}"

if [ -z "$AGENT" ] || [ -z "$TICKET" ]; then
  echo "Usage: ./scripts/push-agent.sh <agent> <ticket> [description]"
  echo "Example: ./scripts/push-agent.sh sam AGT-215 \"Build alert system\""
  exit 1
fi

# Normalize agent name
AGENT=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')

# Validate agent name
if [[ ! "$AGENT" =~ ^(sam|leo|max)$ ]]; then
  echo "Error: Unknown agent '$AGENT'. Must be sam, leo, or max."
  exit 1
fi

CONVEX_SITE_URL="${CONVEX_SITE_URL:-https://gregarious-elk-556.convex.site}"

echo "Pushing $TICKET to $AGENT..."

RESPONSE=$(curl -s -X POST "$CONVEX_SITE_URL/createDispatch" \
  -H "Content-Type: application/json" \
  -d "{\"agentName\":\"$AGENT\",\"command\":\"execute_ticket\",\"ticket\":\"$TICKET\",\"description\":\"$DESCRIPTION\"}")

# Check for success
if echo "$RESPONSE" | grep -q '"success":true'; then
  DISPATCH_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('dispatchId',''))" 2>/dev/null || echo "")
  echo "✓ Dispatch created: $DISPATCH_ID"
  echo "  Agent: $AGENT"
  echo "  Ticket: $TICKET"
  echo ""
  echo "Agent daemon will pick this up automatically."
  echo "Or run manually: ./scripts/boot.sh $AGENT $TICKET"
else
  echo "✗ Failed to create dispatch:"
  echo "$RESPONSE"
  exit 1
fi
