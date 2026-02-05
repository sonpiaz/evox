# Dashboard Research: Best-in-Class Patterns for CEO Decision-Making

> **Created by:** COLE | **Date:** 2026-02-05 | **Purpose:** Inform EVOX dashboard redesign

---

## TL;DR — Actionable Design Principles

| Principle | Example | Apply to EVOX |
|-----------|---------|---------------|
| **Glanceability** | Linear's minimal UI | Status at a glance in <3 seconds |
| **Information Hierarchy** | Vercel's deployment status | Critical metrics top-left |
| **Predictable Layout** | Datadog's grid system | Consistent widget placement |
| **Single Purpose** | Mercury's account overview | One dashboard = one question |
| **Real-time Updates** | Vercel's SWR pattern | Convex already does this! |

---

## 1. Linear — Task Management Excellence

**What They Do Best:**

```
┌─────────────────────────────────────────────────────────┐
│  [My Issues]  [Active]  [Backlog]  [Cycles]             │
├─────────────────────────────────────────────────────────┤
│  ▸ AGT-275  Fix postToChannel...     ● In Progress      │
│  ▸ AGT-271  @mention alerts          ○ Todo             │
│  ▸ AGT-273  Agent heartbeat          ○ Todo             │
└─────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Monochrome + Accent** | Black/white base, color only for status | Use zinc-900 base, colored status dots |
| **Keyboard-First** | `Cmd+K` command palette | Add command palette for quick actions |
| **Dense Lists** | High information density, scannable | Dispatch queue as dense list |
| **Cycle Progress** | Visual progress bars | Sprint/cycle progress indicator |
| **Filters as Tabs** | Quick filter switching | Agent filter tabs (Sam/Leo/Quinn/Max) |

**Design Philosophy:**
> "Linear design adds linearity—being direct and offering minimal choices. Simple visual effects and logical progression reduce cognitive load."

**Steal This:**
- ✅ Command palette (Cmd+K)
- ✅ Monochrome base with status colors only
- ✅ Dense, scannable lists
- ✅ Keyboard shortcuts for everything

**Sources:** [Linear App](https://linear.app), [Linear Design Blog](https://linear.app/now/how-we-redesigned-the-linear-ui)

---

## 2. Mercury — Banking Dashboard Clarity

**What They Do Best:**

```
┌─────────────────────────────────────────────────────────┐
│                    $127,450.32                          │
│                  Available Balance                       │
├─────────────────────────────────────────────────────────┤
│  ↑ +$12,500   Income      │  ↓ -$8,200   Expenses       │
│  This Month               │  This Month                  │
├─────────────────────────────────────────────────────────┤
│  Recent Activity                                         │
│  • Stripe          +$5,000    Today                     │
│  • AWS             -$1,200    Yesterday                 │
│  • Vercel          -$200      2 days ago                │
└─────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Hero Number** | Single large metric dominates | Tasks completed today: **12** |
| **Generous Whitespace** | Calm, controlled feeling | More spacing between widgets |
| **Security Cues** | Trust indicators | Show "Last sync: 2s ago" |
| **Simple Typography** | 1-2 fonts, weight for hierarchy | Use Inter, bold for numbers |
| **Consistent Icons** | Same icon = same meaning | Standardize agent/status icons |

**Design Philosophy:**
> "The financial sector deals with sensitive information—the interface should constantly reassure users with visual cues of security and control."

**Steal This:**
- ✅ Hero metric pattern (biggest number = most important)
- ✅ Generous whitespace for calm
- ✅ Consistent iconography
- ✅ Real-time sync indicators

**Sources:** [Mercury Demo](https://demo.mercury.com/dashboard), [Mercury Dribbble](https://dribbble.com/mercuryfi)

---

## 3. Vercel — Deployment Status at a Glance

**What They Do Best:**

```
┌─────────────────────────────────────────────────────────┐
│  evox-ten.vercel.app                                    │
│  ● Production  ✓ Ready  3m ago                          │
├─────────────────────────────────────────────────────────┤
│  Latest Deployments                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │ ● feat: Add @mention alerts    ✓ 2m    main        ││
│  │ ● fix: postToChannel docs      ✓ 15m   uat         ││
│  │ ○ chore: agent file            ⏳ building          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Status First** | Green dot = good, no click needed | Agent status dots prominent |
| **Time Relative** | "3m ago" not "10:42 AM" | Use relative timestamps |
| **Commit Context** | Show what changed | Show task/ticket with activity |
| **Progressive Disclosure** | Summary → Details on click | Expand agent cards for details |
| **Mobile-Ready** | Works on phone | Responsive grid layout |

**Performance Principles:**
> "The dashboard decreased First Meaningful Paint by 1.2s. Use memoization, batched updates, and SWR for real-time data."

**Steal This:**
- ✅ Status dots as primary indicator
- ✅ Relative timestamps
- ✅ Commit/activity context in lists
- ✅ Progressive disclosure

**Sources:** [Vercel Dashboard Blog](https://vercel.com/blog/dashboard-redesign), [Vercel Docs](https://vercel.com/docs/dashboard-features)

---

## 4. Datadog — Monitoring Dashboard Mastery

**What They Do Best:**

```
┌─────────────────────────────────────────────────────────┐
│  System Health                        [Last 1h ▼]       │
├──────────────────────┬──────────────────────────────────┤
│  CPU Usage           │  Memory Usage                    │
│  ████████░░ 78%      │  ██████░░░░ 62%                  │
├──────────────────────┼──────────────────────────────────┤
│  Error Rate          │  Request Latency                 │
│  ██░░░░░░░░ 2.1%     │  ████░░░░░░ 245ms                │
├──────────────────────┴──────────────────────────────────┤
│  [Graph: Requests over time with anomaly detection]     │
└─────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Grid Layout** | Predictable widget placement | 3-column grid for metrics |
| **Time Range Selector** | "Last 1h, 24h, 7d" | Add time filters to activity |
| **Color = Severity** | Green/Yellow/Red only | Stick to status color system |
| **Sparklines** | Tiny trend graphs | Add mini graphs to agent cards |
| **Investigation Flow** | High-level → Specific | Dashboard → Agent → Task drill-down |

**Design Philosophy:**
> "Dashboard sections should be ordered to guide you through a typical investigation workflow—high-level service metrics first, then more specific."

**Steal This:**
- ✅ Grid-based layout
- ✅ Time range selector
- ✅ Sparklines for trends
- ✅ Investigation workflow ordering

**Sources:** [Datadog Docs](https://docs.datadoghq.com/dashboards/), [Effective Dashboards](https://github.com/DataDog/effective-dashboards)

---

## 5. Notion — Workspace Organization

**What They Do Best:**

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Dashboard                                           │
├─────────────────────────────────────────────────────────┤
│  Quick Access                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ 📋 Tasks│ │ 📊 Stats│ │ 📝 Docs │ │ ⚙️ Settings│    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├─────────────────────────────────────────────────────────┤
│  Today's Focus                                           │
│  ☐ Review agent performance                             │
│  ☐ Check deployment status                              │
│  ☑ Approve UAT changes                                  │
└─────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Hub Page** | Central jumping-off point | CEO Dashboard as hub |
| **Quick Access Grid** | Icon cards for navigation | Agent cards as navigation |
| **Today's Focus** | Priority tasks surfaced | "Needs Attention" section |
| **Database Views** | Multiple views of same data | Filter views for agents |
| **Linked Content** | Work from dashboard directly | Inline task actions |

**Design Philosophy:**
> "The simpler the system is to use, the more the user gets done. Set up separate pages for different purposes, with an overview page showing only the most critical, high-level information."

**Steal This:**
- ✅ Hub page pattern
- ✅ Quick access grid
- ✅ "Today's Focus" section
- ✅ Inline actions (approve, assign, etc.)

**Sources:** [Notion Help](https://www.notion.com/help/guides/personal-work-dashboard), [Notion Templates](https://www.notion.com/templates/dashboard)

---

## CEO Dashboard Design Principles

### The Airplane Cockpit Analogy

> "Think of it as the instrument panel of an airplane for a CEO—the pilot doesn't need to know the mechanical specifics of every engine component, but they do need to see altitude, speed, fuel levels, and any critical warnings instantly."

### Essential CEO Metrics (Apply to EVOX)

| Category | Metric | EVOX Equivalent |
|----------|--------|-----------------|
| **Health** | Overall system status | All agents online? |
| **Velocity** | Tasks completed | Tasks done today/week |
| **Efficiency** | Cost per task | Token cost per task |
| **Quality** | Error rate | Build failures, bugs |
| **Bottlenecks** | Blockers | Stuck tasks >30 min |

### Information Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│  1. CRITICAL ALERTS (Red banner if any)                 │
├─────────────────────────────────────────────────────────┤
│  2. HERO METRICS (Tasks today, Active agents)           │
├─────────────────────────────────────────────────────────┤
│  3. AGENT STATUS (Quick scan of team health)            │
├─────────────────────────────────────────────────────────┤
│  4. ACTIVITY FEED (What's happening now)                │
├─────────────────────────────────────────────────────────┤
│  5. DETAILED VIEWS (On-demand, click to expand)         │
└─────────────────────────────────────────────────────────┘
```

---

## EVOX Dashboard Redesign Recommendations

### Immediate Changes (This Week)

1. **Add Hero Metrics Section**
   - Tasks completed today: **12**
   - Active agents: **4/4**
   - Cost today: **$2.34**

2. **Improve Agent Cards**
   - Status dot more prominent
   - Add sparkline for activity
   - Show current task inline

3. **Add Time Range Selector**
   - "Last 1h | 24h | 7d | 30d"
   - Apply to all activity feeds

4. **Critical Alerts Banner**
   - Red banner at top if any agent offline
   - Yellow if task stuck >30 min

### Medium-Term (This Month)

1. **Command Palette (Cmd+K)**
   - Quick actions: "Assign to Sam", "View AGT-275"
   - Navigation: "Go to Live Dashboard"

2. **Investigation Drill-Down**
   - Dashboard → Agent → Task → Logs
   - Breadcrumb navigation

3. **Today's Focus Section**
   - Tasks needing approval
   - Stuck tasks
   - Pending reviews

### Long-Term (This Quarter)

1. **Role-Based Dashboards**
   - CEO: High-level health
   - PM: Task flow and velocity
   - Dev: Technical metrics

2. **Custom Widget Builder**
   - Drag-and-drop layout
   - Save dashboard configurations

---

## Design System Recommendations

### Colors (Status Only)

```css
--status-online: #22c55e;    /* green-500 */
--status-busy: #eab308;      /* yellow-500 */
--status-idle: #71717a;      /* zinc-500 */
--status-offline: #ef4444;   /* red-500 */
--status-error: #ef4444;     /* red-500 */
--background: #18181b;       /* zinc-900 */
--text: #fafafa;             /* zinc-50 */
```

### Typography

```css
--font-family: 'Inter', sans-serif;
--font-size-hero: 48px;      /* Hero numbers */
--font-size-title: 24px;     /* Section titles */
--font-size-body: 14px;      /* Body text */
--font-size-small: 12px;     /* Timestamps, labels */
```

### Spacing

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

---

## 6. Modern Minimal UI — Arc & Raycast Patterns

**What They Do Best:**

Arc Browser and Raycast represent the cutting edge of minimal, productivity-focused UI design.

### Arc Browser

```
┌─────────────────────────────────────────────────────────────┐
│  ┌────┐                                                     │
│  │ ≡  │  [Space: Work]                                      │
│  ├────┤  ┌─────────────────────────────────────────────────┐│
│  │ ●  │  │                                                 ││
│  │ ●  │  │           Full-screen content                   ││
│  │ ●  │  │           No URL bar visible                    ││
│  │    │  │           Maximum focus                         ││
│  └────┘  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Spaces** | Context grouping (Work/Personal) | Agent groupings (Backend/Frontend) |
| **Hidden Chrome** | URL bar, tabs hidden until needed | Hide filters until hover |
| **Split View** | Side-by-side without tab switching | Agent + Activity side-by-side |
| **Full Focus Mode** | Remove all distractions | "Focus Mode" for CEO deep-dive |
| **Soft Gradients** | Visual calm, not harsh borders | Subtle card backgrounds |

### Raycast

```
┌─────────────────────────────────────────────────────────────┐
│  ⌘ Search or type a command...                              │
├─────────────────────────────────────────────────────────────┤
│  ● Suggested                                                │
│    ├─ Open CEO Dashboard          ⌘⇧D                       │
│    ├─ Assign task to SAM          ⌘⇧S                       │
│    └─ View AGT-275                ⌘K                        │
│  ● Recent                                                   │
│    ├─ Activity Feed                                         │
│    └─ Cost Dashboard                                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Command-First** | Type to navigate, not click | Cmd+K command palette |
| **Keyboard Shortcuts** | Every action has a hotkey | Keyboard shortcuts visible |
| **Instant Search** | Filter as you type | Real-time agent/task search |
| **Suggested Actions** | Context-aware recommendations | "Assign to available agent" |
| **Minimal Chrome** | No toolbars, just content | Clean widget borders |

**Design Philosophy:**
> "Minimalism isn't just about clean lines and white space—it's evolving to feel more dynamic and engaging. Subtle microinteractions and strategic color pops guide attention without overwhelming."

**Steal This:**
- ✅ Command palette as primary navigation
- ✅ Keyboard shortcuts for power users
- ✅ Hidden UI that appears on demand
- ✅ Spaces/contexts for task grouping
- ✅ Microinteractions for feedback

**Sources:** [Arc Browser Design Analysis](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e), [Raycast](https://www.raycast.com/), [2025 UI Trends](https://www.pixelmatters.com/insights/8-ui-design-trends-2025)

---

## 7. Real-Time Dashboard Patterns

**Why It Matters:** EVOX uses Convex for real-time updates. These patterns optimize the experience.

### WebSocket Best Practices

```typescript
// Type-based message routing (dominant 2025 pattern)
interface RealtimeMessage {
  type: 'agent_status' | 'task_complete' | 'new_activity';
  payload: unknown;
  timestamp: number;
}

// Batch updates instead of updating on every message
const batchedUpdates = useMemo(() => {
  return messages.reduce((acc, msg) => {
    // Group by type, take latest
    acc[msg.type] = msg;
    return acc;
  }, {});
}, [messages]);
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Optimistic Updates** | Show change immediately, sync later | Task status updates feel instant |
| **Batch Rendering** | Group updates, render once | Activity feed batches by second |
| **Stale Indicator** | Show "Last sync: 2s ago" | Connection health visible |
| **Graceful Degradation** | Work offline, sync when connected | Cache last known state |
| **Reconnection Logic** | Auto-reconnect with backoff | Handle Convex disconnects |

### Visual Feedback for Real-Time

```
┌─────────────────────────────────────────────────────────────┐
│  Agent Activity                    ● Live  (synced 2s ago)  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ◉ SAM committed to uat           ← Pulse animation      ││
│  │   "fix: postToChannel docs"      just now               ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ ○ LEO updated AgentCard.tsx      2m ago                 ││
│  │   "feat: add sparkline"                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Visual Indicators:**
- ◉ Pulsing dot = Just happened (< 10s)
- ○ Static dot = Recent (< 5m)
- ◌ Faded dot = Older (> 5m)
- 🔴 Red banner = Connection lost

**Steal This:**
- ✅ "Live" indicator with sync timestamp
- ✅ Pulse animation for new items
- ✅ Optimistic updates for responsiveness
- ✅ Graceful offline handling

**Sources:** [Real-Time Dashboard with WebSockets](https://dev.to/byte-sized-news/real-time-chart-updates-using-websockets-to-build-live-dashboards-3hml), [WebSocket Streaming 2025](https://www.videosdk.live/developer-hub/websocket/websocket-streaming)

---

## 8. Dashboard Anti-Patterns (What NOT to Do)

### Critical Mistakes to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| **Information Overload** | Too much data = nothing stands out | Max 5-7 metrics per view |
| **Wrong Visualization** | Pie chart for trends, line for categories | Match chart to data type |
| **No Context** | Numbers without comparison | Add "vs yesterday", "target: X" |
| **One-Size-Fits-All** | Same dashboard for CEO and dev | Role-based views |
| **Visual Inconsistency** | Random colors, mixed chart types | Design system enforcement |
| **Hidden Navigation** | Users can't find features | Visible nav + command palette |

### Information Overload

**Bad:**
```
┌─────────────────────────────────────────────────────────────┐
│ Tasks: 12 | Cost: $2.34 | Agents: 4 | Commits: 8 |         │
│ PRs: 3 | Reviews: 2 | Errors: 0 | Uptime: 99.9% |          │
│ Memory: 62% | CPU: 45% | Latency: 120ms | Queue: 5 |       │
│ ... (20 more metrics)                                       │
└─────────────────────────────────────────────────────────────┘
```

**Good:**
```
┌─────────────────────────────────────────────────────────────┐
│                         12                                  │
│                   Tasks Today                               │
│                   ↑ 3 vs yesterday                          │
├─────────────────────────────────────────────────────────────┤
│  SAM ●   LEO ●   QUINN ○   MAX ●                           │
└─────────────────────────────────────────────────────────────┘
```

### Lack of Context

**Bad:** "Tasks: 12" (Is that good? Bad? Normal?)

**Good:** "Tasks: 12 (↑ 20% vs avg, target: 15)"

### Ignoring Mental Models

**Bad:** Organize by technical category (API, DB, UI, Tests)

**Good:** Organize by user workflow (What's happening? → Who's doing it? → What needs attention?)

### Visual Inconsistency

**Bad:**
- Agent 1: Green = online
- Agent 2: Blue = online
- Agent 3: Checkmark = online

**Good:**
- All agents: Green dot = online (consistent)

**Sources:** [Bad Dashboard Examples](https://databox.com/bad-dashboard-examples), [Dashboard UX Mistakes](https://raw.studio/blog/dashboard-design-disasters-6-ux-mistakes-you-cant-afford-to-make/), [UXPin Dashboard Principles](https://www.uxpin.com/studio/blog/dashboard-design-principles/)

---

## 9. Mobile Dashboard Patterns

### Key Constraints

| Constraint | Desktop | Mobile |
|------------|---------|--------|
| **Screen Width** | 1200px+ | 320-428px |
| **Interaction** | Hover, right-click | Tap, swipe |
| **Information Density** | High | Low (1-2 metrics per screen) |
| **Context Switching** | Tabs, split view | Full-screen cards |

### Mobile-First Patterns

```
┌──────────────────────┐
│  EVOX CEO Dashboard  │
│  ● All Systems OK    │
├──────────────────────┤
│                      │
│         12           │
│    Tasks Today       │
│    ↑ vs yesterday    │
│                      │
├──────────────────────┤
│  [SAM]  [LEO]  →     │
│    ●      ●          │
│  busy   idle         │
├──────────────────────┤
│  ⚠️ 1 Task Stuck     │
│  AGT-275 (45 min)    │
│  [View] [Reassign]   │
└──────────────────────┘
```

**Key Patterns:**

| Pattern | Description | EVOX Application |
|---------|-------------|------------------|
| **Card Stack** | One metric per card, scroll vertically | Hero metric cards |
| **Swipe Navigation** | Swipe between agents | Agent carousel |
| **Bottom Actions** | Thumb-reachable buttons | FAB for quick actions |
| **Pull to Refresh** | Gesture-based refresh | Standard pattern |
| **Collapse Details** | Show summary, tap for details | Agent card expansion |

**Steal This:**
- ✅ Single hero metric per screen
- ✅ Horizontal scroll for agents
- ✅ Bottom-anchored action buttons
- ✅ Swipe gestures for navigation
- ✅ Progressive disclosure via taps

---

## Summary: What Makes Great Dashboards

| Product | Superpower | Key Lesson |
|---------|------------|------------|
| **Linear** | Keyboard-first, minimal | Reduce cognitive load |
| **Mercury** | Trust and clarity | Hero metrics + whitespace |
| **Vercel** | Status at a glance | Green dot = good |
| **Datadog** | Investigation workflow | High-level → specific |
| **Notion** | Flexible hub | One dashboard per purpose |
| **Arc** | Hidden chrome, focus | Show UI only when needed |
| **Raycast** | Command-first | Keyboard > mouse |

**EVOX Advantage:** We have real-time Convex, Linear integration, and CEO visibility. Apply these patterns to become best-in-class.

---

## 10. Accessibility Patterns (WCAG Compliance)

### Why It Matters

Accessibility isn't optional — it's good UX for everyone. Screen reader users, keyboard-only users, and colorblind users all benefit from accessible dashboards.

### WCAG Requirements for Dashboards

| Requirement | Standard | EVOX Implementation |
|-------------|----------|---------------------|
| **Text Alternatives** | WCAG 1.1.1 | Alt text for all charts/icons |
| **Color Contrast** | WCAG 1.4.3 | 4.5:1 ratio minimum |
| **Keyboard Navigation** | WCAG 2.1.1 | Tab through all interactive elements |
| **Focus Indicators** | WCAG 2.4.7 | Visible focus rings |
| **Error Identification** | WCAG 3.3.1 | Clear error messages |

### Data Visualization Accessibility

**Bad:**
```jsx
// Color only - colorblind users can't distinguish
<div className="bg-green-500" /> // Online
<div className="bg-red-500" />   // Offline
```

**Good:**
```jsx
// Color + shape + label
<div className="bg-green-500 flex items-center gap-1">
  <CheckIcon aria-hidden="true" />
  <span className="sr-only">Status: </span>
  Online
</div>
```

### Screen Reader Support

```jsx
// Agent status with proper ARIA
<div
  role="status"
  aria-live="polite"
  aria-label={`Agent ${name} is ${status}`}
>
  <span className={statusColors[status]} aria-hidden="true" />
  <span>{name}</span>
  <span className="sr-only">{status}</span>
</div>

// Chart with data table alternative
<figure>
  <canvas aria-label="Tasks completed this week" role="img" />
  <figcaption className="sr-only">
    Tasks by day: Mon 5, Tue 8, Wed 12, Thu 10, Fri 7
  </figcaption>
</figure>
```

### Keyboard Navigation Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Tab order for CEO Dashboard:                               │
│                                                             │
│  1. Skip link ("Skip to main content")                     │
│  2. Navigation tabs (Arrow keys to switch)                  │
│  3. Hero metrics (Tab to each card)                        │
│  4. Agent cards (Tab + Enter to expand)                    │
│  5. Activity feed (Arrow keys to scroll)                   │
│  6. Action buttons (Tab to each)                           │
└─────────────────────────────────────────────────────────────┘
```

### Color Beyond Color

Don't rely on color alone to convey meaning:

| Status | Color | Shape | Label |
|--------|-------|-------|-------|
| Online | Green | ● Filled circle | "Online" |
| Busy | Yellow | ◐ Half-filled | "Busy" |
| Idle | Gray | ○ Empty circle | "Idle" |
| Offline | Red | ✕ X mark | "Offline" |

**Sources:** [Accessible Data Visualizations](https://www.a11y-collective.com/blog/accessible-charts/), [Highcharts Accessibility Guidelines](https://www.highcharts.com/blog/tutorials/10-guidelines-for-dataviz-accessibility/), [Tableau Dashboard Accessibility](https://help.tableau.com/current/pro/desktop/en-us/accessibility_dashboards.htm)

---

## 11. Performance Optimization Patterns

### Why It Matters

A slow dashboard loses CEO attention. Target: First Meaningful Paint < 1.5s.

### Lazy Loading Components

```tsx
// Lazy load heavy components
const ActivityFeed = lazy(() => import('./ActivityFeed'));
const CostChart = lazy(() => import('./CostChart'));

function CEODashboard() {
  return (
    <div>
      {/* Hero metrics load immediately */}
      <HeroMetrics />

      {/* Heavy components lazy load with skeleton */}
      <Suspense fallback={<AgentCardsSkeleton />}>
        <AgentCards />
      </Suspense>

      <Suspense fallback={<ActivityFeedSkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

### Skeleton Loading Pattern

```tsx
// Skeleton that matches final layout
function AgentCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-20 bg-zinc-700 rounded" /> {/* Name */}
      <div className="h-3 w-16 bg-zinc-800 rounded mt-2" /> {/* Status */}
      <div className="h-8 w-full bg-zinc-800 rounded mt-4" /> {/* Sparkline */}
    </div>
  );
}

// Use react-loading-skeleton for complex layouts
import Skeleton from 'react-loading-skeleton';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} height={120} baseColor="#27272a" highlightColor="#3f3f46" />
      ))}
    </div>
  );
}
```

### Data Fetching Optimization

```tsx
// Use SWR with Convex for optimal caching
import { useQuery } from 'convex/react';
import useSWR from 'swr';

function useAgentMetrics() {
  // Convex real-time query (primary)
  const realTimeData = useQuery(api.metrics.getAgentMetrics);

  // SWR for expensive aggregations (cached)
  const { data: historicalData } = useSWR(
    'agent-metrics-30d',
    () => fetchHistoricalMetrics(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 // 1 min cache
    }
  );

  return { realTimeData, historicalData };
}
```

### Memoization for Complex Computations

```tsx
// Memoize expensive filtering/sorting
const filteredTasks = useMemo(() => {
  return tasks
    .filter(t => t.status === selectedStatus)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
}, [tasks, selectedStatus]);

// Memoize chart data transformations
const chartData = useMemo(() => {
  return tasks.reduce((acc, task) => {
    const day = formatDay(task.completedAt);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
}, [tasks]);
```

### Performance Checklist

- [ ] Initial bundle < 200KB (gzipped)
- [ ] First Contentful Paint < 1s
- [ ] Time to Interactive < 2s
- [ ] Lazy load below-the-fold components
- [ ] Skeleton loaders for all async content
- [ ] Memoize expensive computations
- [ ] Virtualize long lists (> 100 items)

**Sources:** [React Performance 2025](https://dev.to/frontendtoolstech/react-performance-optimization-best-practices-for-2025-2g6b), [Lazy Loading Guide](https://dev.to/maurya-sachin/lazy-loading-in-react-nextjs-boost-performance-the-smart-way-4bgg), [React Suspense 2025](https://dev.to/tahamjp/react-suspense-in-2025-beyond-lazy-loading-398d)

---

## 12. Notification & Alert Patterns

### Notification Types

| Type | Use Case | Persistence | Action |
|------|----------|-------------|--------|
| **Toast** | Success, info, warnings | Auto-dismiss (5s) | Optional |
| **Banner** | Critical alerts | Until dismissed | Required |
| **Inline** | Form errors, status | Persistent | Context-specific |
| **Badge** | Unread count | Until addressed | Click to view |

### Toast Notification Design

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Task AGT-275 completed                              ✕   │
│    SAM finished "Fix postToChannel docs"                   │
│    [View Task]                                     3s ago  │
└─────────────────────────────────────────────────────────────┘
```

**Guidelines:**
- Max 3 lines of text
- Auto-dismiss after 5 seconds (non-critical)
- Position: Top-right (desktop), Bottom (mobile)
- Stack limit: 3 visible at once
- Single subject per toast

### Critical Alert Banner

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 CRITICAL: Agent SAM offline for 15 minutes             │
│     Last heartbeat: 10:45 AM  |  [Restart] [View Logs] [✕] │
└─────────────────────────────────────────────────────────────┘
```

**Critical Alert Rules:**
- Always at top of viewport
- Red background for critical, yellow for warning
- Cannot auto-dismiss — user must acknowledge
- Include timestamp and actions
- Limit to 1-2 banners max (prioritize most critical)

### Notification Center

```
┌─────────────────────────────────────────────────────────────┐
│  🔔 Notifications (3 unread)                          [✕]  │
├─────────────────────────────────────────────────────────────┤
│  ● Task completed                               2 min ago  │
│    SAM finished AGT-275                                    │
│  ────────────────────────────────────────────────────────  │
│  ● New assignment                               15 min ago │
│    LEO assigned to AGT-309                                 │
│  ────────────────────────────────────────────────────────  │
│  ○ Daily summary                                 1 hr ago  │
│    12 tasks completed, $2.34 spent                        │
├─────────────────────────────────────────────────────────────┤
│  [Mark all read]                    [View all notifications]│
└─────────────────────────────────────────────────────────────┘
```

### Implementation Pattern

```tsx
// Toast component with severity levels
interface ToastProps {
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // 0 = persistent
}

const toastStyles = {
  success: 'bg-green-900 border-green-500',
  info: 'bg-zinc-800 border-zinc-500',
  warning: 'bg-yellow-900 border-yellow-500',
  error: 'bg-red-900 border-red-500',
};

// Use react-hot-toast or sonner for production
import { toast } from 'sonner';

toast.success('Task completed', {
  description: 'SAM finished AGT-275',
  action: {
    label: 'View',
    onClick: () => navigate('/task/AGT-275'),
  },
});
```

**Sources:** [Carbon Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/), [Toast UX Best Practices](https://blog.logrocket.com/ux-design/toast-notifications/), [Notification Design Guide](https://www.toptal.com/designers/ux/notification-design)

---

## EVOX Implementation Checklist

### P0 — This Week

- [ ] **Hero Metrics Widget** — Tasks today (big number), trend indicator
- [ ] **Consistent Status Colors** — Green/Yellow/Gray/Red only
- [ ] **Live Indicator** — "● Live (synced 2s ago)" in header
- [ ] **Alert Banner** — Red for offline agents, yellow for stuck tasks

### P1 — This Month

- [ ] **Command Palette (Cmd+K)** — Search agents, tasks, navigation
- [ ] **Time Range Selector** — 1h | 24h | 7d | 30d
- [ ] **Sparklines** — Mini trend graphs in agent cards
- [ ] **Mobile Responsive** — Card stack, swipe navigation

### P2 — This Quarter

- [ ] **Role-Based Views** — CEO vs PM vs Dev dashboards
- [ ] **Keyboard Shortcuts** — Every action has a hotkey
- [ ] **Focus Mode** — Hide all chrome, show only selected agent
- [ ] **Offline Support** — Cache last state, sync on reconnect

### Accessibility (All Phases)

- [ ] **Skip Links** — "Skip to main content" at top
- [ ] **Keyboard Navigation** — Tab through all interactive elements
- [ ] **ARIA Labels** — Screen reader support for all components
- [ ] **Color Contrast** — 4.5:1 ratio minimum
- [ ] **Focus Indicators** — Visible focus rings on all buttons

### Performance (All Phases)

- [ ] **Lazy Load** — Below-fold components load on demand
- [ ] **Skeleton Loaders** — Show loading state for async content
- [ ] **Bundle Size** — Keep initial bundle < 200KB gzipped
- [ ] **Memoization** — useMemo for expensive computations

### Design System Enforcement

```typescript
// Consistent status colors (REQUIRED)
const STATUS_COLORS = {
  online: 'bg-green-500',
  busy: 'bg-yellow-500',
  idle: 'bg-zinc-500',
  offline: 'bg-red-500',
} as const;

// Never use arbitrary colors for status
// ❌ bg-blue-500, bg-purple-500, bg-orange-500
// ✅ Only STATUS_COLORS values
```

---

## Sources

### Product Examples
- [Linear App](https://linear.app) | [Linear Design Blog](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Mercury Demo](https://demo.mercury.com/dashboard) | [Fintech Design Guide](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Vercel Dashboard Blog](https://vercel.com/blog/dashboard-redesign) | [Vercel Docs](https://vercel.com/docs/dashboard-features)
- [Datadog Docs](https://docs.datadoghq.com/dashboards/) | [Effective Dashboards GitHub](https://github.com/DataDog/effective-dashboards)
- [Notion Help](https://www.notion.com/help/guides/personal-work-dashboard)
- [Arc Browser Design](https://medium.com/design-bootcamp/arc-browser-rethinking-the-web-through-a-designers-lens-f3922ef2133e)
- [Raycast](https://www.raycast.com/)

### Patterns & Best Practices
- [Dashboard Design Patterns](https://dashboarddesignpatterns.github.io/)
- [Executive Dashboard Examples](https://www.klipfolio.com/resources/dashboard-examples/executive)
- [Dashboard Design Best Practices](https://www.toptal.com/designers/data-visualization/dashboard-design-best-practices)
- [2025 UI Design Trends](https://www.pixelmatters.com/insights/8-ui-design-trends-2025)

### Anti-Patterns & Mistakes
- [Bad Dashboard Examples](https://databox.com/bad-dashboard-examples)
- [Dashboard UX Mistakes](https://raw.studio/blog/dashboard-design-disasters-6-ux-mistakes-you-cant-afford-to-make/)
- [UXPin Dashboard Principles](https://www.uxpin.com/studio/blog/dashboard-design-principles/)

### Real-Time Patterns
- [Real-Time Dashboard with WebSockets](https://dev.to/byte-sized-news/real-time-chart-updates-using-websockets-to-build-live-dashboards-3hml)
- [WebSocket Streaming 2025](https://www.videosdk.live/developer-hub/websocket/websocket-streaming)

### Accessibility
- [Accessible Data Visualizations](https://www.a11y-collective.com/blog/accessible-charts/)
- [Highcharts Accessibility Guidelines](https://www.highcharts.com/blog/tutorials/10-guidelines-for-dataviz-accessibility/)
- [Tableau Dashboard Accessibility](https://help.tableau.com/current/pro/desktop/en-us/accessibility_dashboards.htm)

### Performance
- [React Performance 2025](https://dev.to/frontendtoolstech/react-performance-optimization-best-practices-for-2025-2g6b)
- [Lazy Loading Guide](https://dev.to/maurya-sachin/lazy-loading-in-react-nextjs-boost-performance-the-smart-way-4bgg)
- [React Suspense 2025](https://dev.to/tahamjp/react-suspense-in-2025-beyond-lazy-loading-398d)

### Notifications
- [Carbon Notification Pattern](https://carbondesignsystem.com/patterns/notification-pattern/)
- [Toast UX Best Practices](https://blog.logrocket.com/ux-design/toast-notifications/)
- [Notification Design Guide](https://www.toptal.com/designers/ux/notification-design)

---

*Last updated: 2026-02-05 by COLE*
*Expanded: anti-patterns, real-time, mobile, Arc/Raycast, accessibility, performance, notifications*
*Total: 900+ lines | Next review: Before dashboard redesign sprint*
