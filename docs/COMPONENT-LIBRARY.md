# EVOX Component Library

> **Catalog of all EVOX UI components with usage examples**
> **Maintained by:** MAYA (Design Lead)

---

## Quick Import

```tsx
// Import everything from central index
import {
  StatusDot,
  AgentCard,
  MetricCard,
  ActivityFeed,
  // ... more
} from "@/components/evox";

// Import redesign components
import {
  HeroStatus,
  AlertList,
  MobileCEODashboard,
} from "@/components/evox/redesign";
```

---

## Component Categories

| Category | Count | Description |
|----------|-------|-------------|
| Status & Indicators | 4 | Status dots, badges, trends |
| Cards & Containers | 5 | Agent cards, metric cards, panels |
| Content & Display | 4 | Keywords, empty states, loading |
| Feeds & Lists | 6 | Activity, communication, dispatch |
| Navigation & Controls | 3 | Tabs, kill switch, alerts |
| Panels & Widgets | 11 | Various dashboard widgets |
| Charts & Visualizations | 3 | Velocity, cost, file activity |
| Forms & Input | 6 | DM, markdown, comments |
| Modals & Overlays | 2 | Settings, shortcuts |
| Layout & Navigation | 4 | Sidebar, terminals |
| Dashboards | 7 | Full-page dashboard views |
| Redesign (Mobile) | 3 | Hero, alerts, mobile dashboard |

---

## Status & Indicators

### StatusDot

Small colored indicator for agent/system status.

```tsx
import { StatusDot, getStatusColor, normalizeStatus } from "@/components/evox";

// Basic usage
<StatusDot status="online" />
<StatusDot status="busy" />
<StatusDot status="idle" />
<StatusDot status="offline" />

// With size
<StatusDot status="online" size="sm" />  // 6px
<StatusDot status="online" size="md" />  // 8px (default)
<StatusDot status="online" size="lg" />  // 12px

// Utilities
const color = getStatusColor("online"); // "bg-green-500"
const normalized = normalizeStatus("ONLINE"); // "online"
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `"online" \| "busy" \| "idle" \| "offline"` | required | Status value |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Dot size |
| `pulse` | `boolean` | `false` | Enable pulse animation |

---

### StatusBadge

Pill-shaped badge with status color and label.

```tsx
import { StatusBadge } from "@/components/evox";

<StatusBadge status="online" />
<StatusBadge status="busy" label="Working" />
<StatusBadge status="offline" showIcon />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `string` | required | Status value |
| `label` | `string` | auto | Override label text |
| `showIcon` | `boolean` | `false` | Show status icon |

---

### AgentStatusIndicator

Comprehensive agent status display with optional details.

```tsx
import { AgentStatusIndicator } from "@/components/evox";

<AgentStatusIndicator
  status="online"
  agentName="MAX"
  showLabel
/>

<AgentStatusIndicator
  status="busy"
  agentName="LEO"
  currentTask="AGT-281"
  lastSeen={new Date()}
/>
```

---

### TrendBadge

Shows trend direction with value change.

```tsx
import { TrendBadge } from "@/components/evox";

<TrendBadge direction="up" value="+12%" />
<TrendBadge direction="down" value="-5%" />
<TrendBadge direction="flat" value="0%" />
```

---

## Cards & Containers

### AgentCard

Full agent card with status, keywords, and metrics.

```tsx
import { AgentCard, extractKeywords, generateSummary } from "@/components/evox";

<AgentCard
  agent={{
    name: "MAX",
    role: "pm",
    status: "online",
    currentTask: "AGT-281",
    tasksToday: 5,
    costToday: 1.20,
  }}
  onClick={() => openDetail(agent)}
/>

// Utilities
const keywords = extractKeywords(activityLog); // ["API", "bugfix", "deploy"]
const summary = generateSummary(activities);    // "Working on API bugfix"
```

---

### MetricCard

Dashboard metric display with optional trend.

```tsx
import { MetricCard, MetricInline } from "@/components/evox";

// Full card
<MetricCard
  label="Tasks Today"
  value={12}
  trend={{ direction: "up", value: "+3" }}
  color="emerald"
/>

// Inline version
<MetricInline label="Cost" value="$4.20" />
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Metric label |
| `value` | `string \| number` | required | Metric value |
| `trend` | `{ direction, value }` | - | Trend indicator |
| `color` | `"emerald" \| "red" \| "zinc"` | `"emerald"` | Value color |
| `onClick` | `() => void` | - | Click handler |

---

### Panel

Container with optional header and sections.

```tsx
import { Panel, PanelSection } from "@/components/evox";

<Panel title="Agent Details" collapsible>
  <PanelSection title="Stats">
    {/* Content */}
  </PanelSection>
  <PanelSection title="Activity">
    {/* Content */}
  </PanelSection>
</Panel>
```

---

## Content & Display

### Keyword

Styled keyword/tag display.

```tsx
import { Keyword, KeywordList } from "@/components/evox";

// Single keyword
<Keyword>API</Keyword>
<Keyword variant="primary">Important</Keyword>

// List of keywords
<KeywordList keywords={["API", "bugfix", "frontend"]} max={5} />
```

---

### EmptyState

Empty state placeholder with optional action.

```tsx
import { EmptyState, EmptyStateInline } from "@/components/evox";

// Full empty state
<EmptyState
  icon="inbox"
  title="No tasks"
  description="All caught up!"
  action={{ label: "Create Task", onClick: create }}
/>

// Inline version
<EmptyStateInline message="No activity yet" />
```

---

### Loading

Loading indicators and skeletons.

```tsx
import { Loading, LoadingPage, Skeleton, SkeletonCard } from "@/components/evox";

// Spinner
<Loading />
<Loading size="lg" />

// Full page loading
<LoadingPage message="Loading dashboard..." />

// Skeleton placeholders
<Skeleton width={200} height={20} />
<SkeletonCard />
```

---

### CompletionBar

Progress bar with percentage.

```tsx
import { CompletionBar } from "@/components/evox";

<CompletionBar value={75} max={100} />
<CompletionBar value={5} max={10} showLabel />
```

---

## Feeds & Lists

### ActivityFeed

Real-time activity stream.

```tsx
import { ActivityFeed } from "@/components/evox";

<ActivityFeed
  activities={activities}
  maxItems={10}
  showTimestamp
  onItemClick={(activity) => viewDetail(activity)}
/>
```

---

### AgentActivityFeed

Activity feed filtered by agent.

```tsx
import { AgentActivityFeed } from "@/components/evox";

<AgentActivityFeed agentName="MAX" limit={20} />
```

---

### CommunicationLog

Agent-to-agent communication display.

```tsx
import { CommunicationLog } from "@/components/evox";

<CommunicationLog
  messages={messages}
  showChannels
  highlightMentions
/>
```

---

### DispatchQueue

Task dispatch queue display.

```tsx
import { DispatchQueue } from "@/components/evox";

<DispatchQueue
  tasks={dispatchedTasks}
  onAssign={(task, agent) => assign(task, agent)}
/>
```

---

## Navigation & Controls

### ViewTabs

Tab navigation component.

```tsx
import { ViewTabs } from "@/components/evox";

<ViewTabs
  tabs={[
    { id: "overview", label: "Overview" },
    { id: "agents", label: "Agents" },
    { id: "activity", label: "Activity" },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

---

### KillSwitch

Emergency stop button for agents.

```tsx
import { KillSwitch } from "@/components/evox";

<KillSwitch
  agentName="SAM"
  onKill={() => killAgent("SAM")}
  requireConfirm
/>
```

---

### BudgetAlert

Budget warning/alert display.

```tsx
import { BudgetAlert } from "@/components/evox";

<BudgetAlert
  current={8.50}
  limit={10.00}
  threshold={0.8}
  onDismiss={() => dismiss()}
/>
```

---

## Panels & Widgets

### SystemHealthWidget

System health overview widget.

```tsx
import { SystemHealthWidget } from "@/components/evox";

<SystemHealthWidget
  status="healthy"
  metrics={{
    uptime: "99.9%",
    errors: 0,
    latency: "120ms",
  }}
/>
```

---

### AgentMetricsWidget

Agent performance metrics widget.

```tsx
import { AgentMetricsWidget } from "@/components/evox";

<AgentMetricsWidget
  agentName="LEO"
  metrics={{
    tasksToday: 8,
    costToday: 2.50,
    avgTaskTime: "15m",
  }}
/>
```

---

### HeartbeatPanel

Agent heartbeat monitoring panel.

```tsx
import { HeartbeatPanel } from "@/components/evox";

<HeartbeatPanel
  agents={agents}
  showLastSeen
  alertThreshold={300} // 5 minutes
/>
```

---

## Charts & Visualizations

### VelocityChart

Task velocity over time chart.

```tsx
import { VelocityChart } from "@/components/evox";

<VelocityChart
  data={velocityData}
  period="7d"
  showTrend
/>
```

---

### CostBarChart

Cost breakdown bar chart.

```tsx
import { CostBarChart } from "@/components/evox";

<CostBarChart
  data={costByAgent}
  showLabels
  color="emerald"
/>
```

---

## Dashboards

### CEODashboard

Main CEO dashboard view.

```tsx
import { CEODashboard } from "@/components/evox";

<CEODashboard />
```

---

### LiveDashboard

Real-time live dashboard.

```tsx
import { LiveDashboard } from "@/components/evox";

<LiveDashboard
  refreshInterval={5000}
  showNotifications
/>
```

---

### MobileCEODashboard (Redesign)

Mobile-first CEO dashboard.

```tsx
import { MobileCEODashboard } from "@/components/evox/redesign";

<MobileCEODashboard />
```

---

## Redesign Components

### HeroStatus

Hero status banner with traffic light system.

```tsx
import { HeroStatus, calculateHeroStatus } from "@/components/evox/redesign";

// Automatic status calculation
const status = calculateHeroStatus({
  offlineAgents: 0,
  blockedTasks: 2,
  activeAgents: 4,
  tasksToday: 12,
});

<HeroStatus
  status={status.status}      // "green" | "yellow" | "red"
  headline={status.headline}  // "ALL GOOD" | "2 BLOCKERS" | "ACTION NEEDED"
  subtext={status.subtext}    // "4 agents • 12 tasks"
/>
```

---

### AlertList

Actionable alert list.

```tsx
import { AlertList, AlertRow } from "@/components/evox/redesign";

<AlertList
  alerts={[
    {
      id: "1",
      severity: "critical",
      icon: "offline",
      title: "SAM offline",
      duration: "15m",
      actions: [{ label: "Ping", action: "ping_agent" }],
    },
  ]}
  onAction={(alert, action) => handleAction(alert, action)}
/>
```

---

## Usage Patterns

### Mobile-First Responsive

```tsx
// Always start with mobile styles, add breakpoints
<div className="p-3 sm:p-4 lg:p-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    <MetricCard label="Tasks" value={12} />
    <MetricCard label="Cost" value="$4.20" />
  </div>
</div>
```

### Status Color Consistency

```tsx
// Always use status colors from StatusDot
import { getStatusColor } from "@/components/evox";

const statusClass = getStatusColor(agent.status);
// Returns: "bg-green-500" | "bg-yellow-500" | "bg-zinc-500" | "bg-red-500"
```

### Loading States

```tsx
import { Skeleton, SkeletonCard } from "@/components/evox";

// Show skeleton while loading
{isLoading ? (
  <SkeletonCard />
) : (
  <AgentCard agent={agent} />
)}
```

---

## File Structure

```
components/evox/
├── index.ts                    # Central exports
├── StatusDot.tsx               # Status indicator
├── StatusBadge.tsx             # Status badge
├── AgentCard.tsx               # Agent card
├── MetricCard.tsx              # Metric display
├── ActivityFeed.tsx            # Activity stream
├── ...
└── redesign/
    ├── index.ts                # Redesign exports
    ├── HeroStatus.tsx          # Hero banner
    ├── AlertList.tsx           # Alert list
    └── MobileCEODashboard.tsx  # Mobile dashboard
```

---

## Related Documentation

- `docs/DESIGN-SYSTEM.md` — Design tokens, colors, typography
- `docs/FINAL-DESIGN.md` — CEO Dashboard specifications
- `docs/WIREFRAMES.md` — Mobile wireframes

---

_MAYA | Design Lead | Feb 5, 2026_
