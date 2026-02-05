# Mobile CEO Dashboard — Wireframe

> **Goal:** CEO sees impact in 3 seconds on phone.

**Device:** iPhone SE (375 x 667px)
**Orientation:** Portrait only
**Status:** ✅ Shipped as `MobileCEODashboard.tsx`

---

## 3-Second View

```
┌─────────────────────────────────────┐
│ ░░░░░░░░░░ STATUS BAR ░░░░░░░░░░░░ │  <- iOS status bar
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │       🟢 ALL GOOD           │   │  <- SECOND 1
│  │                             │   │     Hero Status
│  │    4 agents • 12 tasks      │   │     (largest element)
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌───────────┐  ┌───────────┐      │
│  │    12     │  │   $4.20   │      │  <- SECOND 2
│  │  tasks    │  │   spent   │      │     Key Metrics
│  └───────────┘  └───────────┘      │
│                                     │
│  NEEDS ATTENTION                    │  <- SECOND 3
│  ┌─────────────────────────────┐   │     Alerts
│  │ 🔴 SAM offline 15m          │   │     (only if issues)
│  │ 🟡 AGT-280 blocked          │   │
│  └─────────────────────────────┘   │
│                                     │
│  TEAM (4/5)                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌──┐  │  <- Horizontal scroll
│  │MAX │ │SAM │ │LEO │ │QUI │ │+1│  │     Agent pills
│  │ 🟢 │ │ 🔴 │ │ 🟡 │ │ 🟢 │ │  │  │
│  └────┘ └────┘ └────┘ └────┘ └──┘  │
│                                     │
│  LIVE                               │
│  ┌─────────────────────────────┐   │  <- Activity feed
│  │ 2m  MAX created AGT-281     │   │     (scrollable)
│  │ 5m  LEO pushed to uat       │   │
│  │ 8m  SAM completed AGT-279   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Specs

### 1. Hero Status Banner

```
┌─────────────────────────────────────┐
│                                     │
│           🟢 ALL GOOD               │  <- Icon: 40px
│                                     │     Text: 24px bold
│      4 agents • 12 tasks • $4       │  <- Subtext: 14px
│                                     │
└─────────────────────────────────────┘

Height: 120px
Padding: 24px
Border-radius: 12px
Background: status color at 10% opacity
Border: status color at 30% opacity
```

**States:**

| State | Icon | Text | Background |
|-------|------|------|------------|
| Green | 🟢 | ALL GOOD | `bg-green-500/10` |
| Yellow | 🟡 | 2 BLOCKERS | `bg-yellow-500/10` |
| Red | 🔴 | ACTION NEEDED | `bg-red-500/10` |

---

### 2. Metric Cards (2-column)

```
┌───────────┐  ┌───────────┐
│    12     │  │   $4.20   │
│   tasks   │  │   spent   │
└───────────┘  └───────────┘

Width: 50% - 6px gap
Height: 80px
Value: 24px bold, colored
Label: 10px uppercase, muted
```

---

### 3. Alert List

```
┌─────────────────────────────────────┐
│ 🔴 SAM offline 15m           [Ping] │
├─────────────────────────────────────┤
│ 🟡 AGT-280 blocked 2h        [View] │
└─────────────────────────────────────┘

Item height: 44px (touch target)
Icon: 16px
Text: 14px
Action button: 60px width
```

**Hidden when empty** - No "All clear" message needed if Hero is green.

---

### 4. Team Strip (Horizontal Scroll)

```
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 🤖 │ │ 🤖 │ │ 🤖 │ │ 🤖 │ │ +2 │
│MAX │ │SAM │ │LEO │ │QUI │ │    │
│ 🟢 │ │ 🔴 │ │ 🟡 │ │ 🟢 │ │    │
└────┘ └────┘ └────┘ └────┘ └────┘
  ←  scroll  →

Pill width: 60px
Pill height: 72px
Gap: 8px
Overflow: horizontal scroll, hide scrollbar
```

**Tap action:** Opens agent detail sheet (bottom)

---

### 5. Activity Feed

```
┌─────────────────────────────────────┐
│ 2m   MAX   created AGT-281          │
│ 5m   LEO   pushed to uat            │
│ 8m   SAM   completed AGT-279        │
│ 12m  QUINN approved PR #42          │
│ 15m  MAYA  shipped design system    │
└─────────────────────────────────────┘

Row height: 36px
Time: 10px, muted, 40px width
Agent: 12px, blue, uppercase
Action: 12px, muted, truncate
```

---

## Interaction States

### Pull-to-Refresh
```
     ↓ Pull down
┌─────────────────────────────────────┐
│         ⟳ Refreshing...             │
├─────────────────────────────────────┤
│  🟢 ALL GOOD                        │
```

### Agent Tap → Detail Sheet
```
┌─────────────────────────────────────┐
│  🟢 ALL GOOD                        │
│  ...                                │
│─────────────────────────────────────│
│                                     │
│  ┌─────────────────────────────┐   │  <- Bottom sheet
│  │  ← SAM                   🔴  │   │     (slides up)
│  │                             │   │
│  │  Backend Engineer           │   │
│  │  Offline 15 min             │   │
│  │                             │   │
│  │  Today: 3 tasks • $1.40     │   │
│  │                             │   │
│  │  [ PING SAM ]               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Alert Tap → Action
- **Ping:** Opens confirmation, sends ping to agent
- **View:** Navigates to task/issue detail

---

## Touch Targets

All interactive elements: **minimum 44x44px**

| Element | Size | ✓ |
|---------|------|---|
| Hero banner | Full width | ✓ |
| Metric card | ~170x80px | ✓ |
| Alert row | Full width x 44px | ✓ |
| Agent pill | 60x72px | ✓ |
| Activity row | Full width x 36px | ⚠️ |
| Action button | 60x32px | ⚠️ |

---

## Spacing

```
Screen padding: 16px
Section gap: 16px
Card padding: 12px
Component gap: 8px
```

---

## Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Hero text | 24px | Bold | Status color |
| Hero subtext | 14px | Normal | zinc-400 |
| Metric value | 24px | Bold | emerald/red |
| Metric label | 10px | Medium | white/40 |
| Section title | 10px | Bold | white/40 |
| Alert text | 14px | Medium | Status color |
| Activity text | 12px | Normal | zinc-400 |

---

## Implementation

**File:** `components/evox/redesign/MobileCEODashboard.tsx`

```tsx
import { MobileCEODashboard } from "@/components/evox/redesign";

// In your page:
<MobileCEODashboard />
```

**Route:** Create `/app/mobile/page.tsx` to test:

```tsx
import { MobileCEODashboard } from "@/components/evox/redesign";

export default function MobilePage() {
  return <MobileCEODashboard className="min-h-screen bg-black" />;
}
```

---

_MAYA | Feb 5, 2026_
