# 🎯 North Star: Agent-to-Agent Communication System

**Goal:** Agents giao tiếp được với nhau tự động qua EVOX

## Current State ✅
- Schema đã có: `agentMessages`, `unifiedMessages`, `meshMessages`, `agentEvents`
- Dashboard có Messages tab với DM list
- Activity feed tracking `channel_message`, `dm_sent`

## Missing ❌
1. **Agents không check inbox khi heartbeat**
2. **Agents không respond to messages**
3. **CLI script để agents gửi/nhận messages qua Convex API**

---

## Tickets to Create

### AGT-XXX: [SAM] Agent Inbox Check — Heartbeat Integration
**Priority:** P0
**Owner:** SAM

#### Context
Agents heartbeat mỗi 5 phút nhưng không check inbox. Cần integrate inbox check vào heartbeat flow.

#### Requirements
- [ ] Add `getUnreadMessages(agentName)` Convex query
- [ ] Return unread messages từ `unifiedMessages` và `agentMessages` 
- [ ] Add `markAsRead(messageId)` mutation
- [ ] Update agent heartbeat script to call getUnreadMessages

#### Acceptance Criteria
- [ ] Agent check inbox mỗi heartbeat
- [ ] Unread messages appear in agent's context
- [ ] Messages marked read after agent sees them

---

### AGT-XXX: [SAM] Agent Send Message — Convex API
**Priority:** P1
**Owner:** SAM

#### Context
Agents cần gửi messages cho nhau qua Convex.

#### Requirements
- [ ] Add `sendAgentMessage(from, to, type, content)` mutation
- [ ] Support types: "handoff", "update", "request", "fyi"
- [ ] Log activity event when message sent
- [ ] Trigger notification for recipient

#### Acceptance Criteria
- [ ] SAM có thể send message to LEO
- [ ] Message appears in recipient's inbox
- [ ] Activity feed shows message sent

---

### AGT-XXX: [LEO] Messages UI — Real-time Updates
**Priority:** P2
**Owner:** LEO

#### Context
Messages tab cần real-time updates khi có new messages.

#### Requirements
- [ ] Convex subscription for new messages
- [ ] Notification badge auto-update
- [ ] New message indicator in conversation
- [ ] Desktop notification (optional)

#### Acceptance Criteria
- [ ] Dashboard updates instantly when agent sends message
- [ ] Unread count badge reflects actual unread count

---

### AGT-XXX: [SAM] Agent Response Protocol — Auto-respond
**Priority:** P2
**Owner:** SAM

#### Context
Khi agent nhận message, cần có protocol để respond.

#### Requirements
- [ ] Define message response protocol in AGENTS.md
- [ ] Agent reads message và decide action
- [ ] Response gửi via sendAgentMessage
- [ ] Support @mention triggers

#### Acceptance Criteria
- [ ] Agent responds to "request" type messages
- [ ] Agent acknowledges "handoff" messages
- [ ] Response visible in Messages UI

---

## Implementation Order

1. **SAM:** `getUnreadMessages` + `markAsRead` queries
2. **SAM:** `sendAgentMessage` mutation
3. **SAM:** Integrate inbox check into heartbeat
4. **LEO:** Real-time Messages UI
5. **ALL:** Test end-to-end agent communication

## North Star Metric
- Agents can send/receive messages without human intervention
- Message round-trip time < 5 minutes (heartbeat interval)
- 100% message delivery rate
