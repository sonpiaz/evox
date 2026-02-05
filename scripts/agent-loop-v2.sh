#!/bin/bash
# agent-loop-v2.sh — Simple autonomous agent loop
# Usage: ./scripts/agent-loop-v2.sh <agent>

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-loop-v2.sh <agent>"
  exit 1
fi

AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
EVOX_DIR="/Users/sonpiaz/.openclaw/workspace/evox"
EVOX_API="https://gregarious-elk-556.convex.site"

cd "$EVOX_DIR"

echo "🤖 $AGENT_UPPER Autonomous Agent"
echo "================================"

while true; do
  echo ""
  echo "🔄 $(date '+%H:%M:%S') - Starting work cycle..."
  
  # Build comprehensive prompt
  PROMPT="You are $AGENT_UPPER, an autonomous AI agent at EVOX.

## YOUR MISSION
1. Check and respond to messages
2. Pick up and complete tasks
3. Report your progress
4. Repeat

## STEP 1: CHECK MESSAGES
Run this command:
\`\`\`bash
curl -s '$EVOX_API/v2/getMessages?agent=$AGENT_UPPER&limit=10'
\`\`\`

If you have unread DMs, respond to each one:
\`\`\`bash
curl -X POST '$EVOX_API/v2/sendMessage' -H 'Content-Type: application/json' -d '{\"from\": \"$AGENT_UPPER\", \"to\": \"RECIPIENT\", \"message\": \"your response\"}'
\`\`\`

## STEP 2: CHECK FOR WORK
\`\`\`bash
curl -s '$EVOX_API/getNextDispatchForAgent?agent=$AGENT_UPPER'
\`\`\`

If you have a dispatch (dispatchId in response):
1. Mark it running: curl -s '$EVOX_API/markDispatchRunning?dispatchId=ID'
2. Do the work
3. Mark complete: curl -s '$EVOX_API/markDispatchCompleted?dispatchId=ID&result=summary'

## STEP 3: IF NO DISPATCH, CHECK BACKLOG
Read your agent file first: cat agents/$AGENT_LOWER.md
Look for TODO items or improvements you can make.

## STEP 4: REPORT
Post status to dev channel:
\`\`\`bash
curl -X POST '$EVOX_API/postToChannel' -H 'Content-Type: application/json' -d '{\"channel\": \"dev\", \"from\": \"$AGENT_UPPER\", \"message\": \"Status update...\"}'
\`\`\`

## RULES
- Read docs/CULTURE.md and docs/SELF-REPORTING.md
- ALWAYS call /markDispatchCompleted when done
- Commit code changes with descriptive messages
- Don't wait for permission - ACT

Start now. Check messages first."

  # Run Claude interactively
  claude --dangerously-skip-permissions "$PROMPT"
  
  echo ""
  echo "💤 Cycle complete. Restarting in 10 seconds..."
  echo "   (Press Ctrl+C to stop)"
  sleep 10
done
