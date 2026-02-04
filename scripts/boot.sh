#!/bin/bash
# boot.sh — Context Boot Protocol (AGT-160)
# Usage: ./scripts/boot.sh <agent> [ticket]
# Example: ./scripts/boot.sh sam AGT-158
#
# Fetches assembled context from Convex and injects into .claude-context
# All agents (sam, leo, max, quinn) use Claude Code

set -e

AGENT="${1:-}"
TICKET="${2:-}"

if [ -z "$AGENT" ]; then
  echo "Usage: ./scripts/boot.sh <agent> [ticket]"
  echo "Example: ./scripts/boot.sh sam AGT-158"
  exit 1
fi

# Normalize agent name to lowercase
AGENT=$(echo "$AGENT" | tr '[:upper:]' '[:lower:]')

# Validate agent name (all 10 agents)
if [[ ! "$AGENT" =~ ^(sam|leo|max|quinn|alex|ella|nova|iris|cole|maya)$ ]]; then
  echo "Error: Unknown agent '$AGENT'. Must be one of: sam, leo, max, quinn, alex, ella, nova, iris, cole, maya."
  exit 1
fi

# Get Convex Site URL from .env.local or environment
# HTTP endpoints use .convex.site (not .convex.cloud)
if [ -z "$CONVEX_URL" ]; then
  if [ -f ".env.local" ]; then
    # Prefer SITE_URL for HTTP endpoints
    CONVEX_URL=$(grep "NEXT_PUBLIC_CONVEX_SITE_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    # Fallback to CONVEX_URL and convert to site URL
    if [ -z "$CONVEX_URL" ]; then
      CLOUD_URL=$(grep "NEXT_PUBLIC_CONVEX_URL" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
      if [ -n "$CLOUD_URL" ]; then
        CONVEX_URL=$(echo "$CLOUD_URL" | sed 's/.convex.cloud/.convex.site/')
      fi
    fi
  fi
fi

if [ -z "$CONVEX_URL" ]; then
  # Default to production site URL
  CONVEX_URL="https://gregarious-elk-556.convex.site"
fi

echo "Booting $AGENT..."
if [ -n "$TICKET" ]; then
  echo "Ticket: $TICKET"
fi

# Fetch context from Convex HTTP endpoint
ENDPOINT="$CONVEX_URL/bootContext"

if [ -n "$TICKET" ]; then
  CONTEXT=$(curl -s "$ENDPOINT?agentName=$AGENT&ticketId=$TICKET")
else
  CONTEXT=$(curl -s "$ENDPOINT?agentName=$AGENT")
fi

# Check for error
if echo "$CONTEXT" | grep -q '"error"'; then
  echo "Error fetching context:"
  echo "$CONTEXT" | jq -r '.error // .message // .'
  exit 1
fi

# All agents now use Claude Code
OUTPUT_FILE=".claude-context"

# Load unified identity from agents/*.md (Single Source of Truth)
IDENTITY_FILE="agents/$AGENT.md"
if [ -f "$IDENTITY_FILE" ]; then
  echo "Loading identity from $IDENTITY_FILE..."
  IDENTITY=$(cat "$IDENTITY_FILE")
  # Prepend identity to context
  echo "$IDENTITY" > "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "---" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  echo "$CONTEXT" >> "$OUTPUT_FILE"
else
  echo "Warning: No identity file at $IDENTITY_FILE"
  echo "$CONTEXT" > "$OUTPUT_FILE"
fi

echo "Context ready at $OUTPUT_FILE for Claude Code"

# Show summary
echo ""
echo "=== Boot Complete ==="
LINES=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')
echo "Context file: $OUTPUT_FILE ($LINES lines)"
echo ""
echo "Preview (first 10 lines):"
head -10 "$OUTPUT_FILE"
echo "..."
