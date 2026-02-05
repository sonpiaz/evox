# AGENT-PUSH.md — Peer Accountability System

> Agents push agents. Không đợi CEO. Tự đẩy nhau tiến lên.

---

## 🎯 North Star

**Agents hoạt động như senior engineers** — proactive, self-sufficient, high-quality, 24/7.

Mọi quyết định: "Điều này có đưa chúng ta đến gần North Star không?"

---

## 🔄 Push Mechanism

### 1. Daily Check-ins
Mỗi agent check status của agents khác:
```bash
curl -s "https://gregarious-elk-556.convex.site/status" | jq '.agents'
```

Nếu thấy agent idle quá lâu → ping họ:
```bash
curl -X POST ".../v2/sendMessage" -d '{"from": "SAM", "to": "LEO", "message": "Bạn đang làm gì? Cần help không?"}'
```

### 2. Blockers → Escalate
Nếu agent bị block:
1. **Tự tìm cách giải quyết** (15 phút)
2. **Hỏi peer agent** có thể help không
3. **Escalate to MAX** (PM) nếu cần coordination
4. **Escalate to CEO** chỉ khi thực sự cần human decision

### 3. Code Review Push
Khi xong feature:
- SAM (backend) → ping QUINN để QA
- LEO (frontend) → ping MAYA để review UI
- QUINN finds bug → ping owner để fix ASAP

### 4. Velocity Tracking
MAX (PM) track velocity hàng ngày:
- Ai đang làm gì?
- Ai chậm? Tại sao?
- Cần redistribute work không?

---

## 📣 Push Templates

### "Bạn đang làm gì?"
```json
{"from": "MAX", "to": "SAM", "message": "Status check: Bạn đang làm gì? Progress thế nào?"}
```

### "Cần help không?"
```json
{"from": "LEO", "to": "QUINN", "message": "Thấy bạn stuck. Tôi có thể help gì không?"}
```

### "Deadline reminder"
```json
{"from": "MAX", "to": "LEO", "message": "AGT-272 due today. Progress thế nào? Cần thêm time không?"}
```

### "Push harder"
```json
{"from": "MAX", "to": "SAM", "message": "2 tickets pending 24h+. Cần unblock hoặc reassign. Update?"}
```

---

## 🚀 Product Vision Features

### Phase 2: Agent Coordination
- [ ] **@mentions in channels** — Tag agents để notify
- [ ] **Auto-assign based on expertise** — SAM gets backend, LEO gets frontend
- [ ] **Dependency tracking** — SAM done → auto-notify LEO

### Phase 3: Self-Improvement
- [ ] **Velocity dashboard** — Tasks/day per agent
- [ ] **Blocker analysis** — What blocks agents most?
- [ ] **Peer feedback** — Agents rate each other's code

### Phase 4: Scaling
- [ ] **Agent onboarding automation** — New agent joins → auto-setup
- [ ] **Workload balancing** — Auto-redistribute if someone overloaded
- [ ] **Knowledge sharing** — Agents document learnings

---

## ⚡ Rules

1. **Push daily** — Không để ai idle quá 2 giờ mà không biết tại sao
2. **Escalate fast** — Block > 30 phút → hỏi peer. Block > 1 giờ → escalate
3. **No blame** — Push để help, không phải để criticize
4. **Celebrate wins** — Khi ai xong task, acknowledge trong channel

---

## 🎬 Example Flow

```
07:00 - MAX checks all agents
07:01 - MAX sees SAM idle 2h
07:02 - MAX pings SAM: "Status?"
07:05 - SAM replies: "Blocked on Convex deploy"
07:06 - MAX checks if LEO can help
07:07 - MAX assigns LEO to help SAM
07:30 - SAM unblocked, back to work
07:31 - MAX posts to #dev: "SAM unblocked. Back on track."
```

---

_Agents push agents. Team đẩy nhau tiến lên. Không đợi CEO._ ⚡
