#!/bin/bash
# agent-boot.sh — Load context for agent at session start
# Usage: ./scripts/agent-boot.sh <agent>
#
# Fetches from Linear:
# - Agent's Operating Rules
# - EVOX_STATE
# - Active issues
# Outputs context for agent to load

set -euo pipefail

AGENT="${1:-}"
if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/agent-boot.sh <agent>"
  echo "Example: ./scripts/agent-boot.sh MAX"
  exit 1
fi

AGENT_UPPER=$(echo "$AGENT" | tr '[:lower:]' '[:upper:]')
AGENT_LOWER=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')
LINEAR_API_KEY="${LINEAR_API_KEY:-}"
if [ -z "$LINEAR_API_KEY" ]; then
  # Try to load from .env.local
  LINEAR_API_KEY=$(grep LINEAR_API_KEY "$(dirname "$0")/../.env.local" 2>/dev/null | cut -d'=' -f2)
fi
EVOX_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Document IDs in Linear
get_doc_id() {
  case "$1" in
    MAX) echo "c24208afec3d" ;;
    SAM) echo "a0ad2c23626a" ;;
    LEO) echo "c84654462a4d" ;;
    QUINN) echo "e12df74361ab" ;;
    *) echo "" ;;
  esac
}

gql() {
  curl -s "https://api.linear.app/graphql" \
    -H "Authorization: $LINEAR_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$1"
}

echo "🤖 $AGENT_UPPER BOOT SEQUENCE"
echo "=================================="
echo ""

# 1. Fetch Operating Rules
DOC_ID=$(get_doc_id "$AGENT_UPPER")
if [ -n "$DOC_ID" ]; then
  echo "📖 Loading $AGENT_UPPER Operating Rules..."
  RULES=$(gql "{\"query\": \"{ document(id: \\\"$DOC_ID\\\") { title content } }\"}" | jq -r '.data.document.content // "Not found"')
  echo "$RULES" > "$EVOX_DIR/.context/$AGENT_LOWER-rules.md"
  echo "   ✅ Saved to .context/$AGENT_LOWER-rules.md"
else
  echo "   ⚠️ No Operating Rules doc ID for $AGENT_UPPER"
fi

# 2. Fetch EVOX_STATE
echo ""
echo "📊 Loading EVOX_STATE..."
STATE=$(gql "{\"query\": \"{ document(id: \\\"d29e9174c316\\\") { title content } }\"}" | jq -r '.data.document.content // "Not found"')
echo "$STATE" > "$EVOX_DIR/.context/evox-state.md"
echo "   ✅ Saved to .context/evox-state.md"

# 3. Fetch active issues
echo ""
echo "📋 Loading active issues..."
ISSUES=$(gql "{\"query\": \"{ issues(filter: {team: {name: {eq: \\\"Agent Factory\\\"}}, state: {type: {in: [\\\"started\\\", \\\"unstarted\\\"]}}}, first: 20) { nodes { identifier title state { name } assignee { name } } } }\"}" | jq -r '.data.issues.nodes[] | "- [\(.identifier)] \(.title) (\(.state.name)) @\(.assignee.name // "unassigned")"' 2>/dev/null)
echo "$ISSUES" > "$EVOX_DIR/.context/active-issues.md"
echo "   ✅ Saved to .context/active-issues.md"

# 4. Load local docs
echo ""
echo "📁 Loading local context..."
cat "$EVOX_DIR/docs/NORTH-STAR.md" > "$EVOX_DIR/.context/north-star.md" 2>/dev/null && echo "   ✅ NORTH-STAR.md"
cat "$EVOX_DIR/docs/CULTURE.md" > "$EVOX_DIR/.context/culture.md" 2>/dev/null && echo "   ✅ CULTURE.md"
cat "$EVOX_DIR/agents/$AGENT_LOWER.md" > "$EVOX_DIR/.context/$AGENT_LOWER-profile.md" 2>/dev/null && echo "   ✅ agents/$AGENT_LOWER.md"

# 5. Generate boot prompt
echo ""
echo "📝 Generating boot prompt..."
cat > "$EVOX_DIR/.context/boot-prompt-$AGENT_LOWER.md" << EOF
# $AGENT_UPPER Session Boot

You are $AGENT_UPPER, an autonomous agent in the EVOX system.

## Your Operating Rules
Read: .context/$AGENT_LOWER-rules.md

## Current EVOX State
Read: .context/evox-state.md

## Active Issues
Read: .context/active-issues.md

## North Star
Read: .context/north-star.md

## Your Mission
1. Understand your identity from Operating Rules
2. Review current state and active issues
3. Align all work with North Star
4. Self-plan how to achieve assigned goals
5. Ship, report, iterate

## Boot Complete
Reply with your status in this format:

🤖 $AGENT_UPPER online. Session boot complete.

| Area | Status |
|------|--------|
| Active Issues | [count] |
| My Assigned | [count] |
| Priority Focus | [top priority] |

Ready for direction.
EOF

echo "   ✅ boot-prompt-$AGENT_LOWER.md"

# 6. Output summary
echo ""
echo "=================================="
echo "✅ BOOT COMPLETE"
echo ""
echo "Context files in: $EVOX_DIR/.context/"
echo ""
echo "To inject into agent session:"
echo "  cat $EVOX_DIR/.context/boot-prompt-$AGENT_LOWER.md | pbcopy"
echo "  # Then paste into Claude Code"
echo ""
echo "Or send via tmux:"
echo "  tmux send-keys -t evox-$AGENT_LOWER 'Read .context/boot-prompt-$AGENT_LOWER.md and all referenced files. Boot into $AGENT_UPPER identity.' Enter"
