#!/usr/bin/env bash
# check-linked-message.sh — Check if a task has a linked message and show loop status
# Part of: The Loop P2 — Agent Protocol Integration (AGT-335)
#
# Usage:
#   ./scripts/check-linked-message.sh AGT-XXX
#
# Returns:
#   - Whether the task exists in Convex
#   - Whether it has a linkedMessageId
#   - Current loop status of the linked message

set -euo pipefail

TICKET="${1:-}"

if [ -z "$TICKET" ]; then
  echo "Usage: ./scripts/check-linked-message.sh AGT-XXX"
  exit 1
fi

echo "=== Loop Status Check: $TICKET ==="
echo ""

# 1. Find the task by linearIdentifier
TASK_RESULT=$(npx convex run agentActions:getTaskByTicket "{\"ticket\":\"$TICKET\"}" 2>/dev/null || echo "NOT_FOUND")

if [ "$TASK_RESULT" = "NOT_FOUND" ] || [ "$TASK_RESULT" = "null" ]; then
  echo "Task $TICKET not found in Convex."
  echo "No linked message to check."
  exit 0
fi

echo "Task found: $TICKET"

# 2. Check for linkedMessageId
LINKED_MSG=$(echo "$TASK_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
msg_id = data.get('linkedMessageId', None)
print(msg_id if msg_id else 'NONE')
" 2>/dev/null || echo "PARSE_ERROR")

if [ "$LINKED_MSG" = "NONE" ] || [ "$LINKED_MSG" = "PARSE_ERROR" ]; then
  echo "No linked message (linkedMessageId is empty)."
  echo "Loop tracking: NOT ACTIVE for this task."
  echo ""
  echo "To link a message to this task:"
  echo "  npx convex run agentActions:linkMessageToTask '{\"taskId\":\"TASK_ID\",\"messageId\":\"MSG_ID\"}'"
  exit 0
fi

echo "Linked message: $LINKED_MSG"

# 3. Get message loop status
MSG_STATUS=$(npx convex run messageStatus:getMessageStatus "{\"messageId\":\"$LINKED_MSG\"}" 2>/dev/null || echo "ERROR")

if [ "$MSG_STATUS" = "ERROR" ] || [ "$MSG_STATUS" = "null" ]; then
  echo "Could not retrieve message status."
  exit 1
fi

# Parse and display status
echo "$MSG_STATUS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data is None:
    print('Message not found.')
    sys.exit(0)

status = data.get('status', 0)
label = data.get('statusLabel', 'unknown')
stages = {0: 'PENDING', 1: 'DELIVERED', 2: 'SEEN', 3: 'REPLIED', 4: 'ACTED', 5: 'REPORTED'}
stage_name = stages.get(status, 'UNKNOWN')

print(f'')
print(f'Loop Status: {stage_name} ({status}/5)')
print(f'Status Label: {label}')
print(f'From: {data.get(\"from\", \"?\")}')
print(f'To: {data.get(\"to\", \"?\")}')

if data.get('seenAt'):
    print(f'Seen at: {data[\"seenAt\"]}')
if data.get('repliedAt'):
    print(f'Replied at: {data[\"repliedAt\"]}')

if status < 5:
    print(f'')
    print(f'Loop is OPEN — will auto-close when completeTask is called.')
else:
    print(f'')
    print(f'Loop is CLOSED.')
" 2>/dev/null

echo ""
echo "=== Done ==="
