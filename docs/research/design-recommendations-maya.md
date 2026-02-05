# Design Recommendations for MAYA

> **From:** COLE (Research) | **To:** MAYA (Design) | **Date:** 2026-02-05
> **Re:** CEO Dashboard improvements based on DASHBOARD-RESEARCH.md

---

## Current State Analysis

I reviewed `components/evox/CEODashboard.tsx` (623 lines). Here's what's working well and what could be improved based on my research.

### What's Already Good

| Pattern | Implementation | Research Source |
|---------|---------------|-----------------|
| **Status Colors** | Consistent green/yellow/gray/red | AGT-273, Mercury |
| **Hero Metrics** | 6 metric cards at top | Mercury pattern |
| **Sparklines** | Velocity trend chart | Datadog pattern |
| **Mobile-first** | 44px touch targets, responsive grid | Best practice |
| **Real-time** | Convex queries, live updates | Vercel SWR |
| **Relative Time** | `formatDistanceToNow` | Vercel pattern |

---

## P0 Recommendations (This Week)

### 1. Add "Live" Indicator

**Current:** No connection status visible
**Research:** Vercel shows "Last synced: 2s ago"

```tsx
// Add to top-right of dashboard
<div className="flex items-center gap-2 text-xs text-white/50">
  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
  <span>Live</span>
  <span className="text-white/30">synced 2s ago</span>
</div>
```

**Why:** CEO needs confidence that data is current.

### 2. Critical Alert Banner (Top of Page)

**Current:** Alerts in middle column, can be missed
**Research:** Mercury/Vercel put critical alerts at absolute top

```tsx
// Before main content, full width
{alerts.some(a => a.severity === "critical") && (
  <div className="bg-red-500/20 border-b border-red-500/50 px-4 py-2 flex items-center gap-3">
    <span className="text-red-400 animate-pulse">●</span>
    <span className="text-red-200 text-sm font-medium">
      {alerts.find(a => a.severity === "critical")?.text}
    </span>
    <button className="ml-auto text-xs text-white/50 hover:text-white">
      Dismiss
    </button>
  </div>
)}
```

**Why:** Critical issues must be impossible to miss.

### 3. Bigger Hero Number

**Current:** `text-2xl sm:text-3xl` (24-30px)
**Research:** Mercury uses 48px for hero metrics

```tsx
// For the primary metric (Velocity/Tasks Today)
<span className="text-4xl sm:text-5xl font-bold">
  {metrics.velocity}
</span>
```

**Why:** CEO glance = biggest number = most important. 3 second rule.

---

## P1 Recommendations (This Month)

### 4. Command Palette (Cmd+K)

**Research:** Linear and Raycast use command palette as primary navigation

```tsx
// Add keyboard listener
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

// Command palette actions
const commands = [
  { label: "View Agent SAM", action: () => navigate('/agent/sam') },
  { label: "Assign task to LEO", action: () => openAssignModal('leo') },
  { label: "Go to Live Dashboard", action: () => navigate('/live') },
];
```

**Why:** Power users (CEO) love keyboard shortcuts. Reduces clicks.

### 5. Time Range Selector

**Current:** Fixed to "today"
**Research:** Datadog allows "Last 1h | 24h | 7d | 30d"

```tsx
const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

<div className="flex gap-1 text-xs">
  {['1h', '24h', '7d', '30d'].map(range => (
    <button
      key={range}
      onClick={() => setTimeRange(range)}
      className={cn(
        "px-2 py-1 rounded",
        timeRange === range
          ? "bg-white/10 text-white"
          : "text-white/40 hover:text-white/60"
      )}
    >
      {range}
    </button>
  ))}
</div>
```

**Why:** CEO needs historical context, not just today.

### 6. Skeleton Loading

**Current:** No loading states visible
**Research:** Performance optimization requires skeleton loaders

```tsx
function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-3 animate-pulse">
      <div className="h-3 w-16 bg-zinc-700 rounded" />
      <div className="h-8 w-20 bg-zinc-700 rounded mt-2" />
      <div className="h-2 w-24 bg-zinc-800 rounded mt-2" />
    </div>
  );
}

// Use in dashboard
{!dashboardStats ? (
  <MetricCardSkeleton />
) : (
  <MetricCard ... />
)}
```

**Why:** Perceived performance. User knows something is loading.

---

## P2 Recommendations (This Quarter)

### 7. Focus Mode

**Research:** Arc browser hides all chrome for focus

```tsx
const [focusMode, setFocusMode] = useState(false);

// When focused on single agent
{focusMode ? (
  <div className="fixed inset-0 bg-zinc-950 z-50 p-8">
    <button onClick={() => setFocusMode(false)} className="absolute top-4 right-4">
      Exit Focus
    </button>
    <AgentDetailView agent={selectedAgent} />
  </div>
) : (
  // Normal dashboard
)}
```

**Why:** Deep investigation without distraction.

### 8. Notification Toast System

**Current:** No toast notifications
**Research:** Use sonner or react-hot-toast

```tsx
import { toast } from 'sonner';

// When agent completes task
toast.success('Task completed', {
  description: 'SAM finished AGT-275',
  action: {
    label: 'View',
    onClick: () => navigate('/task/AGT-275'),
  },
});
```

**Why:** Real-time feedback without page refresh.

---

## Accessibility Checklist

Based on my accessibility research:

- [ ] Add `aria-live="polite"` to activity feed
- [ ] Add `role="status"` to agent status indicators
- [ ] Ensure 4.5:1 color contrast (current yellow on dark may fail)
- [ ] Add `sr-only` labels for icon-only buttons
- [ ] Test keyboard navigation (Tab order)
- [ ] Add skip link: "Skip to main content"

```tsx
// Example: Agent status with screen reader support
<div
  role="status"
  aria-live="polite"
  aria-label={`Agent ${agent.name} is ${status}`}
>
  <span className={dotColor} aria-hidden="true" />
  <span>{agent.name}</span>
  <span className="sr-only">{status}</span>
</div>
```

---

## Design Tokens to Enforce

From my research, stick to these:

```typescript
// Status colors (NEVER use others for status)
const STATUS_COLORS = {
  online: 'bg-green-500',   // #22c55e
  busy: 'bg-yellow-500',    // #eab308
  idle: 'bg-zinc-500',      // #71717a
  offline: 'bg-red-500',    // #ef4444
} as const;

// Typography scale
const TYPOGRAPHY = {
  hero: 'text-5xl font-bold',     // 48px - biggest number
  title: 'text-2xl font-semibold', // 24px - section headers
  body: 'text-sm',                 // 14px - regular text
  small: 'text-xs',                // 12px - timestamps
  micro: 'text-[10px]',            // 10px - labels
} as const;

// Spacing
const SPACING = {
  card: 'p-3 sm:p-4',
  section: 'mb-4',
  gap: 'gap-2 sm:gap-3',
} as const;
```

---

## Summary: Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Live indicator | 30 min | High |
| P0 | Critical alert banner | 1 hr | High |
| P0 | Bigger hero number | 15 min | Medium |
| P1 | Command palette | 4 hr | High |
| P1 | Time range selector | 2 hr | Medium |
| P1 | Skeleton loading | 1 hr | Medium |
| P2 | Focus mode | 4 hr | Medium |
| P2 | Toast notifications | 2 hr | Medium |

---

## Questions for MAYA

1. Should we implement command palette with shadcn/ui's `<Command>` component?
2. Preference on toast library: sonner vs react-hot-toast?
3. Should time range selector be a dropdown or inline buttons?

---

*Research source: docs/DASHBOARD-RESEARCH.md (900+ lines)*
*Ping me @COLE if you need more detail on any pattern.*
