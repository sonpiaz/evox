"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AlertBanner - Sticky top banner for critical/warning alerts
 * @see docs/ALERT-DESIGN-SYSTEM.md
 */

const bannerVariants = cva(
  "flex items-center gap-3 px-4 py-3 border-b",
  {
    variants: {
      severity: {
        critical: "bg-gradient-to-r from-red-500/20 to-red-500/10 border-red-500/50 text-red-400",
        warning: "bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 border-yellow-500/50 text-yellow-400",
      },
    },
    defaultVariants: {
      severity: "warning",
    },
  }
);

export interface AlertBannerAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface AlertBannerProps extends VariantProps<typeof bannerVariants> {
  severity: "critical" | "warning";
  title: string;
  details?: string;
  timestamp?: Date;
  actions?: AlertBannerAction[];
  onDismiss?: () => void;
  className?: string;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function AlertBanner({
  severity,
  title,
  details,
  timestamp,
  actions,
  onDismiss,
  className,
}: AlertBannerProps) {
  const Icon = severity === "critical" ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn(bannerVariants({ severity }), className)}
      role="alert"
      aria-live={severity === "critical" ? "assertive" : "polite"}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />

      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-sm">{title}</span>
        {details && (
          <span className="text-sm opacity-80">{details}</span>
        )}
        {timestamp && (
          <span className="text-xs opacity-60">
            {formatRelativeTime(timestamp)}
          </span>
        )}
      </div>

      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors",
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
          className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Convenience component for agent offline alerts
export interface AgentOfflineAlertProps {
  agentName: string;
  lastSeen: Date;
  onPing?: () => void;
  onViewLogs?: () => void;
  onDismiss?: () => void;
}

export function AgentOfflineAlert({
  agentName,
  lastSeen,
  onPing,
  onViewLogs,
  onDismiss,
}: AgentOfflineAlertProps) {
  const actions: AlertBannerAction[] = [];

  if (onPing) {
    actions.push({ label: "Ping", onClick: onPing, primary: true });
  }
  if (onViewLogs) {
    actions.push({ label: "View Logs", onClick: onViewLogs });
  }

  return (
    <AlertBanner
      severity="critical"
      title={`${agentName} offline`}
      details="No heartbeat received"
      timestamp={lastSeen}
      actions={actions}
      onDismiss={onDismiss}
    />
  );
}

// Convenience component for blocked task alerts
export interface TaskBlockedAlertProps {
  taskId: string;
  reason?: string;
  blockedSince?: Date;
  onReassign?: () => void;
  onView?: () => void;
  onDismiss?: () => void;
}

export function TaskBlockedAlert({
  taskId,
  reason,
  blockedSince,
  onReassign,
  onView,
  onDismiss,
}: TaskBlockedAlertProps) {
  const actions: AlertBannerAction[] = [];

  if (onReassign) {
    actions.push({ label: "Reassign", onClick: onReassign, primary: true });
  }
  if (onView) {
    actions.push({ label: "View", onClick: onView });
  }

  return (
    <AlertBanner
      severity="warning"
      title={`${taskId} blocked`}
      details={reason}
      timestamp={blockedSince}
      actions={actions}
      onDismiss={onDismiss}
    />
  );
}
