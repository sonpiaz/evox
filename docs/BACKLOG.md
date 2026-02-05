
## P2: Message Latency Between Telegram ↔ OpenClaw Dashboard
**Added:** 2026-02-05
**Reporter:** CEO

**Issue:** Có độ trễ khi so sánh tốc độ truyền tải thông tin giữa Telegram và OpenClaw Dashboard.

**To investigate:**
- Measure actual latency (Telegram → Gateway → Dashboard)
- Identify bottleneck (network? polling interval? rendering?)
- Consider WebSocket for real-time sync

**Priority:** P2 (after v0.2 complete)

---

## P1: Dashboard V1 UX Audit & Redesign
**Added:** 2026-02-05  
**Reporter:** CEO
**Assignee:** LEO, MAYA

### Issues Found (CEO feedback):
1. **Text overlap** — Team Status area, chữ đè lên nhau
2. **Client errors** — "Something went wrong" khi bấm vào một số mục
3. **Failed task loop** — AGT-265 failed: Exhausted 3 retries (lặp lại nhiều lần)
4. **Too many cards** — Metrics quá nhiều, cần gộp/simplify

### Actions:
- [ ] Audit tất cả UI components trên mobile
- [ ] Fix text overflow issues
- [ ] Fix client-side errors
- [ ] Redesign: gộp metrics, loại bỏ không cần thiết
- [ ] Test trên iPhone trước khi ship

### Screenshots:
- V1 CEO view: overlapping text in Team Status
- Terminal tab: AGT-265 error loop
- Error state: "Something went wrong"

**Priority:** P1 (sau V0.2 hoàn thành)
