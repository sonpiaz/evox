#!/bin/bash
# Check EVOX status - Has EVOX read messages? Has EVOX responded?
# Usage: ./scripts/check-evox-status.sh

set -e

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🔍 EVOX STATUS CHECK"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CONVEX_URL="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

# ============================================================
# 1. CHECK EVOX AGENT STATUS
# ============================================================

echo "1️⃣  EVOX Agent Status:"
echo "   ────────────────────────────────────────"

EVOX_STATUS=$(npx convex run agents:get '{"name":"evox"}' 2>/dev/null || echo "{}")

if [ "$EVOX_STATUS" = "{}" ]; then
  echo -e "   ${RED}✗ EVOX not found in agents table${NC}"
else
  STATUS=$(echo "$EVOX_STATUS" | jq -r '.status // "unknown"')
  LAST_SEEN=$(echo "$EVOX_STATUS" | jq -r '.lastSeen // 0')

  if [ "$LAST_SEEN" != "0" ]; then
    MINS_AGO=$(( ($(date +%s) - ($LAST_SEEN / 1000)) / 60 ))
    echo -e "   ${GREEN}✓ EVOX exists${NC}"
    echo "   Status: $STATUS"
    echo "   Last seen: $MINS_AGO minutes ago"
  else
    echo -e "   ${YELLOW}⚠ EVOX exists but never seen${NC}"
    echo "   Status: $STATUS"
  fi
fi

echo ""

# ============================================================
# 2. CHECK UNREAD MESSAGES TO EVOX
# ============================================================

echo "2️⃣  Messages TO EVOX (Unread):"
echo "   ────────────────────────────────────────"

MESSAGES=$(npx convex run agentMessaging:getDirectMessages '{"agentName":"evox","unreadOnly":true}' 2>/dev/null || echo "[]")

UNREAD_COUNT=$(echo "$MESSAGES" | jq 'length' 2>/dev/null || echo "0")

if [ "$UNREAD_COUNT" -gt 0 ]; then
  echo -e "   ${YELLOW}⚠ $UNREAD_COUNT unread messages${NC}"
  echo ""
  echo "$MESSAGES" | jq -r '.[] | "   • From: \(.from) | Priority: \(.priority // "normal")\n     \(.content | .[0:80])...\n"'
  echo -e "   ${YELLOW}→ EVOX hasn't read messages yet${NC}"
else
  echo -e "   ${GREEN}✓ No unread messages (EVOX may have read them)${NC}"
fi

echo ""

# ============================================================
# 3. CHECK MESSAGES FROM EVOX (Responses)
# ============================================================

echo "3️⃣  Messages FROM EVOX (Responses):"
echo "   ────────────────────────────────────────"

# Check messages to MAX from EVOX
MAX_MESSAGES=$(npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' 2>/dev/null || echo "[]")

EVOX_RESPONSES=$(echo "$MAX_MESSAGES" | jq '[.[] | select(.from == "evox")]' 2>/dev/null || echo "[]")
RESPONSE_COUNT=$(echo "$EVOX_RESPONSES" | jq 'length' 2>/dev/null || echo "0")

if [ "$RESPONSE_COUNT" -gt 0 ]; then
  echo -e "   ${GREEN}✓ $RESPONSE_COUNT responses from EVOX${NC}"
  echo ""

  # Show last 3 responses
  echo "$EVOX_RESPONSES" | jq -r '.[-3:] | .[] | "   • Sent: \(.sentAt // "unknown")\n     \(.content | .[0:100])...\n"'

  # Check if any response is a "READY" or "REPORT"
  HAS_READY=$(echo "$EVOX_RESPONSES" | jq '[.[] | select(.content | test("READY|REPORT|Confirmation"))] | length' 2>/dev/null || echo "0")

  if [ "$HAS_READY" -gt 0 ]; then
    echo -e "   ${GREEN}🎉 EVOX has sent confirmation/report!${NC}"
    echo ""
    echo "   View full response:"
    echo "   npx convex run agentMessaging:getDirectMessages '{\"agentName\":\"max\"}' | jq '.[] | select(.from == \"evox\")' | tail -1"
  fi
else
  echo -e "   ${YELLOW}⚠ No responses from EVOX yet${NC}"
  echo "   EVOX hasn't replied"
fi

echo ""

# ============================================================
# 4. CHECK FILE-BASED REPORTS
# ============================================================

echo "4️⃣  File-based Reports:"
echo "   ────────────────────────────────────────"

if [ -d "/tmp/evox-reports" ]; then
  REPORT_COUNT=$(find /tmp/evox-reports -name "*.txt" -o -name "*.md" 2>/dev/null | wc -l | xargs)

  if [ "$REPORT_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✓ $REPORT_COUNT report file(s) found${NC}"
    echo ""
    ls -lht /tmp/evox-reports/ | head -5
  else
    echo -e "   ${YELLOW}⚠ No report files yet${NC}"
  fi
else
  echo -e "   ${YELLOW}⚠ /tmp/evox-reports/ doesn't exist${NC}"
fi

echo ""

# ============================================================
# 5. CHECK IF EVOX IS RUNNING
# ============================================================

echo "5️⃣  EVOX Process Status:"
echo "   ────────────────────────────────────────"

# Check tmux session
if tmux has-session -t evox 2>/dev/null; then
  echo -e "   ${GREEN}✓ tmux session 'evox' is running${NC}"

  WINDOWS=$(tmux list-windows -t evox 2>/dev/null | wc -l | xargs)
  echo "   Windows: $WINDOWS"

  # Check if any window is active
  ACTIVE=$(tmux list-windows -t evox 2>/dev/null | grep -c "(active)" || echo "0")
  echo "   Active windows: $ACTIVE"
else
  echo -e "   ${RED}✗ tmux session 'evox' not found${NC}"
fi

echo ""

# ============================================================
# SUMMARY
# ============================================================

echo "═══════════════════════════════════════════════════════════════"
echo "📊 SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$UNREAD_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⏳ Status: WAITING FOR EVOX TO READ MESSAGES${NC}"
  echo ""
  echo "   EVOX has $UNREAD_COUNT unread messages."
  echo "   Messages have been sent via:"
  echo "   • Convex DM (urgent priority)"
  echo "   • File: /tmp/evox-inbox/"
  echo ""
  echo "   EVOX will see them at next session start."
  echo ""
elif [ "$RESPONSE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ Status: EVOX HAS RESPONDED${NC}"
  echo ""
  echo "   EVOX sent $RESPONSE_COUNT message(s)."
  echo ""
  echo "   View latest response:"
  echo "   npx convex run agentMessaging:getDirectMessages '{\"agentName\":\"max\"}' | jq '.[] | select(.from == \"evox\") | .content' | tail -1"
  echo ""
else
  echo -e "${YELLOW}⚠️  Status: UNCLEAR${NC}"
  echo ""
  echo "   No unread messages, but no responses either."
  echo "   Possible scenarios:"
  echo "   1. EVOX read messages but hasn't responded yet"
  echo "   2. EVOX is processing the retraining docs"
  echo "   3. EVOX hasn't started a session yet"
  echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "💡 TIP: Run this script periodically to monitor EVOX status"
echo ""
echo "   Watch mode (every 60s):"
echo "   watch -n 60 ./scripts/check-evox-status.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
