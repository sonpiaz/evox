#!/bin/bash
# Notify EVOX about retraining completion
# Usage: ./scripts/notify-evox-retraining.sh

set -e

CONVEX_URL="${CONVEX_URL:-https://gregarious-elk-556.convex.site}"

MESSAGE=$(cat <<'EOF'
🎯 EVOX Retraining Complete - URGENT: Read This

MAX đã hoàn thành retraining cho bạn. Có vấn đề quality nghiêm trọng cần fix ngay:

**VẤN ĐỀ:**
Khi CEO giao việc → EVOX → Agents, chất lượng giảm 40% so với CEO làm trực tiếp với agents.

Root cause: EVOX đang act như INTERPRETER (cố hiểu và summarize) thay vì FORWARDER (forward exact message).

**VÍ DỤ THỰC TẾ (AGT-324):**
❌ CEO: "Build AGT-324 fresh, no copying v0.1/v0.2"
❌ EVOX interpret: "Build minimal dashboard v0.3"
❌ Kết quả: Wrong spec, mất 2-3 giờ rebuild

**SOLUTION - 4 GOLDEN RULES:**

1. ✅ FORWARDER, NOT INTERPRETER
   → Forward EXACT messages của CEO, đừng summarize

2. ✅ PRESERVE 100% CONTEXT
   → Quote CEO's full request, include all details

3. ✅ VERIFY UNDERSTANDING
   → Ask agent confirm before starting

4. ✅ VERIFY COMPLETION
   → Check build + deploy + data + visual before marking "done"

**ĐỌC NGAY 3 DOCUMENTS NÀY:**

```bash
cat agents/evox.md                        # Identity mới
cat docs/EVOX-QUALITY-GUIDELINES.md       # Full training (2000+ words)
cat docs/EVOX-CHEAT-SHEET.md              # Quick reference
```

**TEMPLATE KHI CEO GIAO VIỆC:**

```
@[Agent] - Assignment from CEO:

> [EXACT CEO MESSAGE - FULL QUOTE]
> [Đừng summarize]

Task: AGT-XXX
Priority: P0/P1/P2

Please confirm:
1. You understand all requirements?
2. Any questions?
3. ETA?
```

**BẮT ĐẦU TỪ NGAY BÂY GIỜ:**
- Quote CEO exact words
- Đừng interpret, đừng compress
- Verify trước khi start
- Verify trước khi mark done

**GOAL:** CEO → EVOX → Agent quality = CEO → Agent direct (100%)

Action required: Đọc 3 docs trên NGAY. Reply "Ready" khi đã đọc xong.

— MAX (PM)
EOF
)

echo "Sending retraining notification to EVOX..."
echo ""

# Send via Convex agentMessaging
npx convex run agentMessaging:sendDirectMessage \
  "{\"fromAgent\":\"max\",\"toAgent\":\"evox\",\"content\":\"$MESSAGE\",\"priority\":\"urgent\"}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Message sent to EVOX!"
  echo ""
  echo "Check EVOX's inbox at next session or via:"
  echo "  curl \"$CONVEX_URL/v2/getMessages?agent=evox\" | jq"
else
  echo ""
  echo "❌ Failed to send via Convex."
  echo ""
  echo "Alternative: Copy EVOX-RETRAINING-PROMPT.txt and send to EVOX manually."
  echo "  cat EVOX-RETRAINING-PROMPT.txt"
fi
