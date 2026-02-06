"use client";

import { cn } from "@/lib/utils";

type AlertSeverity = "critical" | "warning";
type AlertAction = "ping" | "view" | "resolve";

interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  detail?: string;
  action?: AlertAction;
  onAction?: () => void;
}

interface AlertListProps {
  alerts: Alert[];
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const severityConfig: Record<AlertSeverity, {
  icon: string;
  bg: string;
  text: string;
  border: string;
}> = {
  critical: {
    icon: "🔴",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  warning: {
    icon: "🟡",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
  },
};

const actionLabels: Record<AlertAction, string> = {
  ping: "Ping",
  view: "View",
  resolve: "Resolve",
};

/**
 * EVOX Redesign: AlertList
 *
 * Shows items that need immediate attention.
 * Sorted by severity (critical first).
 */
export function AlertList({
  alerts,
  title = "Needs Attention",
  emptyMessage,
  className,
}: AlertListProps) {
  // Sort: critical first, then warning
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return 0;
  });

  if (sortedAlerts.length === 0) {
    if (!emptyMessage) return null; // Hide when no alerts
    return (
      <div className={cn("py-4 text-center text-sm text-primary0", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
          {title} ({sortedAlerts.length})
        </h3>
      )}

      {sortedAlerts.map((alert) => {
        const config = severityConfig[alert.severity];

        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 min-h-[44px]",
              config.bg,
              config.border
            )}
          >
            {/* Severity Icon */}
            <span className="shrink-0 text-base">{config.icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", config.text)}>
                {alert.message}
              </p>
              {alert.detail && (
                <p className="text-xs text-primary0 truncate">{alert.detail}</p>
              )}
            </div>

            {/* Action Button */}
            {alert.action && alert.onAction && (
              <button
                type="button"
                onClick={alert.onAction}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium",
                  "bg-white/5 hover:bg-white/10 transition-colors",
                  "min-h-[32px] min-w-[60px]",
                  config.text
                )}
              >
                {actionLabels[alert.action]}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact alert row for tighter spaces
 */
export function AlertRow({
  severity,
  message,
  className,
}: {
  severity: AlertSeverity;
  message: string;
  className?: string;
}) {
  const config = severityConfig[severity];

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        config.text,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{message}</span>
    </div>
  );
}
