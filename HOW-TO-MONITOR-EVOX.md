# How to Monitor EVOX - CEO Guide

**Question:** "Làm sao để tôi biết EVOX có nhận được không? Hay khi nào feedback trở lại?"

**Answer:** Use the monitoring tools below.

---

## 🔍 Quick Check (Recommended)

### Option 1: Run Status Check Script

```bash
./scripts/check-evox-status.sh
```

This will show:
- ✅ Has EVOX read the messages? (Unread count)
- ✅ Has EVOX responded? (Response count)
- ✅ Is EVOX running? (tmux session status)
- ✅ Summary with recommendations

**Output example:**
```
⏳ Status: WAITING FOR EVOX TO READ MESSAGES

   EVOX has 2 unread messages.
   Messages have been sent via:
   • Convex DM (urgent priority)
   • File: /tmp/evox-inbox/

   EVOX will see them at next session start.
```

---

## 📊 Watch Mode (Continuous Monitoring)

### Monitor Every 60 Seconds

```bash
watch -n 60 ./scripts/check-evox-status.sh
```

This will refresh the status every 60 seconds.

**When to use:**
- When waiting for EVOX to read messages
- When waiting for EVOX's response/report
- During critical coordination periods

**Stop:** Press `Ctrl+C`

---

## 📱 Manual Checks

### Check 1: Unread Messages (EVOX inbox)

```bash
npx convex run agentMessaging:getDirectMessages '{"agentName":"evox","unreadOnly":true}'
```

**Output:**
- Empty array `[]` = EVOX read all messages ✅
- Has items = EVOX hasn't read yet ⏳

### Check 2: Responses from EVOX

```bash
npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' | \
  jq '.[] | select(.from == "evox") | {content: .content, sentAt: .sentAt}'
```

**Output:**
- Shows all messages EVOX sent to MAX
- Look for "READY", "REPORT", "Confirmation"

### Check 3: EVOX tmux Session

```bash
tmux list-sessions | grep evox
```

**Output:**
- Shows if EVOX is running
- `evox: 4 windows` = Running ✅

### Check 4: File-based Reports

```bash
ls -lht /tmp/evox-reports/ 2>/dev/null || echo "No reports yet"
```

**Output:**
- Shows any report files EVOX created
- Newest files at top

---

## 🔔 Notification Setup (Advanced)

### Option 1: Slack Notification (If available)

Create `scripts/notify-ceo-evox-responded.sh`:

```bash
#!/bin/bash
# Check if EVOX responded, send Slack notification

RESPONSE_COUNT=$(npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' | \
  jq '[.[] | select(.from == "evox")] | length')

if [ "$RESPONSE_COUNT" -gt 0 ]; then
  # Send Slack notification
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d '{"text":"🎉 EVOX has responded! Check messages."}'
fi
```

### Option 2: Terminal Notification (macOS)

```bash
# Run in background, notify when EVOX responds
while true; do
  RESPONSES=$(npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' | \
    jq '[.[] | select(.from == "evox")] | length')

  if [ "$RESPONSES" -gt 0 ]; then
    osascript -e 'display notification "EVOX has responded!" with title "EVOX Status"'
    break
  fi

  sleep 120  # Check every 2 minutes
done &
```

---

## 📋 Status Meanings

### ⏳ WAITING FOR EVOX TO READ MESSAGES

**What it means:**
- Messages delivered to EVOX's inbox
- EVOX hasn't started a session yet
- OR EVOX started but hasn't checked messages

**What to do:**
- Wait for EVOX to start next session
- Check again in 10-30 minutes
- EVOX typically starts sessions automatically

**Timeline:**
- EVOX should read within next session start
- Usually within 1-2 hours if EVOX is active

---

### ⚠️ EVOX READ BUT NOT RESPONDED

**What it means:**
- EVOX read messages (no unread)
- But hasn't sent response yet
- Might be processing/reading training docs

**What to do:**
- Wait 10-20 minutes
- EVOX might be reading the 3 training documents
- Check again soon

**Timeline:**
- Reading 3 docs: ~5-10 minutes
- Preparing report: ~5 minutes
- Total: Should respond within 15-30 minutes

---

### ✅ EVOX HAS RESPONDED

**What it means:**
- EVOX sent message(s) back
- Likely contains confirmation/report

**What to do:**
- Read EVOX's response:
  ```bash
  npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' | \
    jq '.[] | select(.from == "evox") | .content' | tail -1
  ```

- Verify EVOX confirmed:
  - ✅ Message receipt
  - ✅ Documents read
  - ✅ 4 Golden Rules understood
  - ✅ Commitment to apply

---

## 🎯 Expected Timeline

**Typical flow:**

```
T+0:00   Messages sent to EVOX
            ↓
T+0:30   EVOX starts next session
            ↓
T+0:31   EVOX sees urgent messages
            ↓
T+0:35   EVOX reads training docs (5-10 min)
            ↓
T+0:45   EVOX prepares report
            ↓
T+0:50   EVOX sends confirmation report
            ↓
T+0:51   CEO sees response ✅
```

**Total time:** ~30-60 minutes from message sent to response received.

---

## 🚨 Troubleshooting

### Problem 1: EVOX Not Reading Messages

**Check:**
```bash
tmux list-sessions | grep evox
```

**If no tmux session:**
- EVOX not running
- Start EVOX manually or via cron

**If tmux exists but no read:**
- EVOX might be idle
- Send notification to EVOX's active window

### Problem 2: EVOX Read But No Response

**Possible reasons:**
1. EVOX still reading training docs (wait 10-20 min)
2. EVOX stuck or blocked on something
3. EVOX needs clarification

**Action:**
- Wait 20 minutes
- If still no response, check EVOX's tmux logs
- Send follow-up: "EVOX, did you see CEO's message?"

### Problem 3: Can't Find Response

**Check all channels:**
```bash
# 1. Convex messages
npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}'

# 2. File reports
ls /tmp/evox-reports/

# 3. EVOX's terminal output (if accessible)
tmux capture-pane -t evox -p | tail -50
```

---

## 📝 Quick Reference Commands

```bash
# Check status (recommended)
./scripts/check-evox-status.sh

# Watch continuously
watch -n 60 ./scripts/check-evox-status.sh

# Check unread only
npx convex run agentMessaging:getDirectMessages '{"agentName":"evox","unreadOnly":true}'

# Check EVOX responses
npx convex run agentMessaging:getDirectMessages '{"agentName":"max"}' | \
  jq '.[] | select(.from == "evox")'

# Check EVOX running
tmux list-sessions | grep evox
```

---

## 💡 Best Practices

1. **Check immediately after sending:**
   ```bash
   ./scripts/check-evox-status.sh
   ```

2. **Wait 30-60 minutes** for EVOX to read & respond

3. **Check again:**
   ```bash
   ./scripts/check-evox-status.sh
   ```

4. **If no response after 2 hours:**
   - Check EVOX is running
   - Send follow-up message
   - Check logs for errors

---

## 🎯 Success Indicators

You'll know EVOX received and processed when:

✅ Unread messages = 0 (EVOX read)
✅ Response count > 0 (EVOX replied)
✅ Response contains "READY" or "REPORT"
✅ Response includes checklist with [Yes] answers

**Example successful response from EVOX:**

```
EVOX REPORT - Retraining Confirmation

✅ Message Receipt: Yes
✅ Documents Read: All 3 completed
✅ 4 Golden Rules: All understood
✅ Commitment: Will apply NOW

Next Actions:
- Forward CEO exact words (no interpretation)
- Verify understanding before agents start
- Verify completion before marking done

— EVOX
```

---

**Questions?** Run `./scripts/check-evox-status.sh` anytime!
