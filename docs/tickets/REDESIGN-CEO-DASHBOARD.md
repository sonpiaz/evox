# 🎨 CEO Dashboard Redesign Brief

> **Goal:** Everything visible in 3 seconds, mobile-first, zero clutter.

## Current Problems

### ❌ Redundancies Found
| Current | Overlaps With | Action |
|---------|---------------|--------|
| Velocity metric | 24h Summary "Total Tasks" | MERGE |
| Team % metric | Team Status section | MERGE |
| ROI metric | Derived from Cost/Velocity | REMOVE (not actionable) |
| Agent Comms feed | Live Activity feed | MERGE into one feed |
| Done/WIP/Queue card | Team Status shows same | MERGE |

### ❌ Mobile Issues
- 6 metric cards = too many for mobile
- 3-column layout doesn't stack well
- Terminal iframe takes too much space
- Text too small (8px, 10px labels)

---

## ✅ Redesign Proposal

### Mobile-First Layout (< 640px)

```
┌─────────────────────────┐
│  🟢 3/5 Agents Online   │  ← Single status line
├─────────────────────────┤
│   TODAY: 5 done │ $2.50 │  ← Two key numbers
├─────────────────────────┤
│ ⚠️ 1 urgent blocked     │  ← Alert (if any)
├─────────────────────────┤
│ 💬 Recent Activity      │  ← Unified feed
│ • MAX: Created AGT-90   │     (comms + activity)
│ • SAM: Pushed 3 commits │
│ • LEO: Completed task   │
├─────────────────────────┤
│ [MAX] [SAM] [LEO]...    │  ← Agent tabs (collapsed)
│ (tap to expand terminal)│
└─────────────────────────┘
```

### Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────┐
│ Agents: 🟢🟢🟢🔴🔴 (3/5)  │ Today: 5 ✓ │ $2.50  │
├───────────────────────┬──────────────────────────┤
│ Team Status           │ Activity Feed            │
│ ┌─────────────────┐   │ • MAX: Created AGT-90    │
│ │ MAX  🟢 2 tasks │   │ • SAM: Pushed abc123     │
│ │ SAM  🟢 3 tasks │   │ • LEO: Started AGT-88    │
│ │ LEO  🔴 offline │   │ • QUINN: Review done     │
│ └─────────────────┘   │                          │
├───────────────────────┴──────────────────────────┤
│ ⚠️ Alert: 1 urgent task blocked (if any)         │
├──────────────────────────────────────────────────┤
│ Terminal: [MAX ▼] [SAM] [LEO] [QUINN] [MAYA]     │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Core Metrics (Keep Only These)

| Metric | Why | Display |
|--------|-----|---------|
| Agents Online | Team health at a glance | X/Y + dots |
| Tasks Done Today | Velocity | Number |
| Cost Today | Budget awareness | $X.XX |
| Alerts | Action needed | Only if exists |

### Remove
- ~~Automation %~~ (nice to know, not actionable)
- ~~ROI~~ (derived, not real data)
- ~~Team Health %~~ (replaced by dots)
- ~~24h Summary~~ (redundant)
- ~~Sparklines~~ (clutter on mobile)

---

## 📱 Mobile Requirements

1. **Touch targets ≥ 44px** — All buttons/tabs
2. **Font size ≥ 14px** — Body text readable
3. **No horizontal scroll** — Single column
4. **Activity feed first** — Most useful info up top
5. **Terminal collapsed by default** — Optional expand

---

## 🔧 Implementation Steps

### Phase 1: Simplify (MAYA)
1. Remove ROI, Automation %, sparklines
2. Merge velocity + 24h summary
3. Merge comms + activity into one feed
4. Reduce metric cards from 6 → 3

### Phase 2: Mobile Layout (LEO)
1. Stack layout for mobile
2. Collapsible sections
3. Larger touch targets
4. Swipe gestures for terminals

### Phase 3: Polish (MAYA + LEO)
1. Dark theme refinement
2. Loading skeletons
3. Empty states
4. Micro-interactions

---

## Assignees
- **MAYA**: Design decisions, component simplification
- **LEO**: Implementation, responsive CSS

## Priority
**P0** — CEO requirement, ship TODAY

## Acceptance Criteria
- [ ] Dashboard usable on iPhone (375px width)
- [ ] Key info visible without scroll
- [ ] Load time < 2 seconds
- [ ] No redundant information
- [ ] CEO approves design
