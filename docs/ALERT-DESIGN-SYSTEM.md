# EVOX Alert Design System

> **Consistent, accessible, actionable alerts across EVOX**
> **Author:** MAYA (Design Lead) | **Task:** 2.19

---

## Overview

Alerts communicate important information to users. They must be:
- **Noticeable** — Stand out without being disruptive
- **Clear** — Message understood in < 2 seconds
- **Actionable** — User knows what to do next
- **Accessible** — Works with screen readers, keyboard

---

## Alert Types

### 1. Severity Levels

| Level | Color | Icon | Use Case |
|-------|-------|------|----------|
| **Critical** | Red | `AlertCircle` | Requires immediate action |
| **Warning** | Yellow | `AlertTriangle` | Needs attention soon |
| **Success** | Green | `CheckCircle` | Action completed |
| **Info** | Blue | `Info` | General information |

### 2. Display Types

| Type | Duration | Position | User Action |
|------|----------|----------|-------------|
| **Toast** | Auto-dismiss (5s) | Top-right / Bottom | Optional |
| **Banner** | Persistent | Top of page | Required to dismiss |
| **Inline** | Persistent | In context | Context-specific |
| **Modal** | Persistent | Center overlay | Required response |

---

## Visual Specifications

### Toast Notifications

```
┌───────────────────────────────────────────────────────┐
│ ✓  Task completed successfully                    ✕   │
│    SAM finished AGT-275                               │
│    [View Task]                                3s ago  │
└───────────────────────────────────────────────────────┘
```

**Specs:**
| Property | Value |
|----------|-------|
| Width | 320px (fixed) |
| Max width | 90vw (mobile) |
| Padding | 12px 16px |
| Border radius | 8px |
| Shadow | `shadow-lg` |
| Z-index | 50 |

**Colors by severity:**
```css
/* Success */
.toast-success {
  background: rgba(34, 197, 94, 0.1);   /* green-500/10 */
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

/* Warning */
.toast-warning {
  background: rgba(234, 179, 8, 0.1);   /* yellow-500/10 */
  border: 1px solid rgba(234, 179, 8, 0.3);
  color: #eab308;
}

/* Error */
.toast-error {
  background: rgba(239, 68, 68, 0.1);   /* red-500/10 */
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* Info */
.toast-info {
  background: rgba(59, 130, 246, 0.1);  /* blue-500/10 */
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}
```

---

### Banner Alerts

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Agent SAM offline for 15 minutes                               │
│    Last heartbeat: 10:45 AM  |  [Restart Agent] [View Logs] [Dismiss ✕]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Specs:**
| Property | Value |
|----------|-------|
| Width | 100% |
| Padding | 12px 16px |
| Position | Sticky top |
| Z-index | 40 |

**Critical Banner (Red):**
```css
.banner-critical {
  background: linear-gradient(90deg,
    rgba(239, 68, 68, 0.2) 0%,
    rgba(239, 68, 68, 0.1) 100%
  );
  border-bottom: 1px solid rgba(239, 68, 68, 0.5);
}
```

**Warning Banner (Yellow):**
```css
.banner-warning {
  background: linear-gradient(90deg,
    rgba(234, 179, 8, 0.2) 0%,
    rgba(234, 179, 8, 0.1) 100%
  );
  border-bottom: 1px solid rgba(234, 179, 8, 0.5);
}
```

---

### Inline Alerts

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  This agent hasn't reported in 5 minutes                │
│      Check the terminal for errors                          │
└─────────────────────────────────────────────────────────────┘
```

**Specs:**
| Property | Value |
|----------|-------|
| Width | 100% or container |
| Padding | 12px |
| Border radius | 6px |
| Margin | 8px 0 |

---

## Component Implementations

### Toast Component

```tsx
// components/evox/Toast.tsx
import { cva } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

const toastVariants = cva(
  "flex items-start gap-3 p-3 rounded-lg border shadow-lg",
  {
    variants: {
      severity: {
        success: "bg-green-500/10 border-green-500/30 text-green-400",
        warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        error: "bg-red-500/10 border-red-500/30 text-red-400",
        info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      },
    },
    defaultVariants: {
      severity: "info",
    },
  }
);

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

interface ToastProps {
  severity: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  duration?: number; // 0 = persistent
}

export function Toast({
  severity,
  title,
  message,
  action,
  onDismiss,
  duration = 5000
}: ToastProps) {
  const Icon = icons[severity];

  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div
      className={toastVariants({ severity })}
      role="alert"
      aria-live="polite"
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {message && (
          <p className="text-sm opacity-80 mt-0.5">{message}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline mt-1 hover:opacity-80"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 hover:opacity-80"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

---

### Banner Alert Component

```tsx
// components/evox/AlertBanner.tsx
import { cva } from "class-variance-authority";
import { AlertCircle, AlertTriangle, X } from "lucide-react";

const bannerVariants = cva(
  "flex items-center gap-3 px-4 py-3 border-b",
  {
    variants: {
      severity: {
        critical: "bg-gradient-to-r from-red-500/20 to-red-500/10 border-red-500/50 text-red-400",
        warning: "bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 border-yellow-500/50 text-yellow-400",
      },
    },
  }
);

interface AlertBannerProps {
  severity: "critical" | "warning";
  title: string;
  details?: string;
  timestamp?: Date;
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>;
  onDismiss?: () => void;
}

export function AlertBanner({
  severity,
  title,
  details,
  timestamp,
  actions,
  onDismiss,
}: AlertBannerProps) {
  const Icon = severity === "critical" ? AlertCircle : AlertTriangle;

  return (
    <div
      className={bannerVariants({ severity })}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{title}</span>
        {details && (
          <span className="text-sm opacity-80 ml-2">{details}</span>
        )}
        {timestamp && (
          <span className="text-xs opacity-60 ml-2">
            {formatRelativeTime(timestamp)}
          </span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded",
                action.primary
                  ? "bg-white/10 hover:bg-white/20"
                  : "hover:underline"
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-1 hover:bg-white/10 rounded"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

---

### Inline Alert Component

```tsx
// components/evox/InlineAlert.tsx
import { cva } from "class-variance-authority";

const inlineAlertVariants = cva(
  "flex items-start gap-2 p-3 rounded-md text-sm",
  {
    variants: {
      severity: {
        success: "bg-green-500/10 text-green-400",
        warning: "bg-yellow-500/10 text-yellow-400",
        error: "bg-red-500/10 text-red-400",
        info: "bg-blue-500/10 text-blue-400",
      },
    },
  }
);

interface InlineAlertProps {
  severity: "success" | "warning" | "error" | "info";
  children: React.ReactNode;
}

export function InlineAlert({ severity, children }: InlineAlertProps) {
  return (
    <div
      className={inlineAlertVariants({ severity })}
      role="alert"
    >
      {children}
    </div>
  );
}
```

---

## Animation Specifications

### Toast Enter/Exit

```css
/* Enter animation */
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Exit animation */
@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

.toast-enter {
  animation: toast-enter 200ms ease-out;
}

.toast-exit {
  animation: toast-exit 150ms ease-in;
}
```

### Banner Slide

```css
@keyframes banner-slide {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.banner-enter {
  animation: banner-slide 250ms ease-out;
}
```

### Progress Bar (Auto-dismiss)

```css
@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}

.toast-progress {
  height: 2px;
  background: currentColor;
  opacity: 0.5;
  animation: progress 5000ms linear;
}
```

---

## Toast Manager

### Usage with Sonner (Recommended)

```tsx
// lib/toast.ts
import { toast } from "sonner";

export const showToast = {
  success: (title: string, options?: ToastOptions) => {
    toast.success(title, {
      description: options?.message,
      action: options?.action,
      duration: options?.duration ?? 5000,
    });
  },

  error: (title: string, options?: ToastOptions) => {
    toast.error(title, {
      description: options?.message,
      action: options?.action,
      duration: options?.duration ?? 0, // Errors don't auto-dismiss
    });
  },

  warning: (title: string, options?: ToastOptions) => {
    toast.warning(title, {
      description: options?.message,
      action: options?.action,
      duration: options?.duration ?? 8000,
    });
  },

  info: (title: string, options?: ToastOptions) => {
    toast.info(title, {
      description: options?.message,
      action: options?.action,
      duration: options?.duration ?? 5000,
    });
  },
};

// Usage
showToast.success("Task completed", {
  message: "SAM finished AGT-275",
  action: { label: "View", onClick: () => navigate("/task/AGT-275") },
});
```

### Toast Provider Setup

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181b",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
            },
          }}
          theme="dark"
        />
      </body>
    </html>
  );
}
```

---

## EVOX-Specific Alert Patterns

### Agent Offline Alert

```tsx
<AlertBanner
  severity="critical"
  title="SAM offline"
  details="Last heartbeat 15 minutes ago"
  timestamp={lastSeen}
  actions={[
    { label: "Ping", onClick: pingAgent, primary: true },
    { label: "View Logs", onClick: viewLogs },
  ]}
/>
```

### Task Blocked Alert

```tsx
<AlertBanner
  severity="warning"
  title="AGT-280 blocked"
  details="Waiting for deploy access"
  actions={[
    { label: "Reassign", onClick: reassign },
    { label: "View", onClick: viewTask },
  ]}
/>
```

### Build Failed Toast

```tsx
showToast.error("Build failed", {
  message: "Check terminal for errors",
  action: {
    label: "View Logs",
    onClick: () => openTerminal("build")
  },
});
```

### Task Completed Toast

```tsx
showToast.success("Task completed", {
  message: `${agent.name} finished ${task.ticket}`,
  action: {
    label: "View",
    onClick: () => navigate(`/task/${task.ticket}`)
  },
});
```

---

## Accessibility Requirements

### ARIA Attributes

```tsx
// Alerts that need immediate attention
<div role="alert" aria-live="assertive">
  Critical alert content
</div>

// Informational alerts
<div role="status" aria-live="polite">
  Info alert content
</div>

// Dismissible alerts
<button aria-label="Dismiss alert">
  <X />
</button>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Focus next interactive element |
| `Escape` | Dismiss (if dismissible) |
| `Enter/Space` | Activate action button |

### Focus Management

```tsx
// Auto-focus first action button on critical alerts
useEffect(() => {
  if (severity === "critical" && actionRef.current) {
    actionRef.current.focus();
  }
}, [severity]);
```

### Screen Reader Announcements

```tsx
// Use visually hidden text for context
<span className="sr-only">
  {severity === "critical" ? "Critical alert: " : ""}
</span>
{title}
```

---

## Usage Guidelines

### When to Use Each Type

| Scenario | Type | Example |
|----------|------|---------|
| Action completed | Toast (success) | "Task saved" |
| Non-blocking warning | Toast (warning) | "Session expires in 5m" |
| Blocking error | Banner (critical) | "Agent offline" |
| Form validation | Inline (error) | "Invalid email" |
| System status | Banner (warning) | "Slow connection" |

### Do's

- Keep messages under 10 words
- Include actionable next steps
- Use consistent severity colors
- Auto-dismiss success toasts
- Persist critical alerts until resolved

### Don'ts

- Don't stack more than 3 toasts
- Don't use alerts for confirmations (use modals)
- Don't dismiss errors automatically
- Don't use vague messages ("Error occurred")
- Don't overuse critical severity

---

## Implementation Checklist

- [ ] Toast component (`components/evox/Toast.tsx`)
- [ ] AlertBanner component (`components/evox/AlertBanner.tsx`)
- [ ] InlineAlert component (`components/evox/InlineAlert.tsx`)
- [ ] Toast manager setup (Sonner)
- [ ] Add to component exports
- [ ] CSS animations in globals.css
- [ ] Accessibility audit

---

## File Locations

| File | Purpose |
|------|---------|
| `components/evox/Toast.tsx` | Toast notification |
| `components/evox/AlertBanner.tsx` | Top banner alerts |
| `components/evox/InlineAlert.tsx` | Inline alerts |
| `lib/toast.ts` | Toast helper functions |
| `app/globals.css` | Animation keyframes |

---

## Related Documentation

- `docs/DESIGN-SYSTEM.md` — Color tokens
- `docs/COMPONENT-LIBRARY.md` — Component catalog
- `docs/FINAL-DESIGN.md` — Dashboard alert specs

---

_MAYA | Design Lead | Feb 5, 2026_
_Task: 2.19 Alert Design System_
