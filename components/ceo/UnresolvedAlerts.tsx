"use client";

/**
 * UnresolvedAlerts — AGT-336: Unresolved loop alerts
 *
 * Shows active + escalated loop alerts with joined message context.
 * Uses loopMetrics.getUnresolved query.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface UnresolvedAlertsProps {
  className?: string;
  limit?: number;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  reply_overdue: "Reply overdue",
  action_overdue: "Action overdue",
  report_overdue: "Report overdue",
  loop_broken: "Loop broken",
};

const SEVERITY_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  critical: {
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400",
  },
  warning: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400",
  },
};

export function UnresolvedAlerts({ className, limit = 10 }: UnresolvedAlertsProps) {
  const alerts = useQuery(api.loopMetrics.getUnresolved, { limit });

  if (!alerts) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // Clean state — no alerts, no noise
  }

  return (
    <div className={className}>
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-400 font-semibold text-sm uppercase tracking-wide">
            Unresolved ({alerts.length})
          </span>
        </div>

        <div className="space-y-2">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.warning;

            return (
              <div
                key={alert.alertId}
                className={cn(
                  "rounded-lg p-2 border",
                  style.bg,
                  style.border
                )}
              >
                {/* Row 1: Type badge + agents + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", style.badge)}>
                    {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {alert.fromAgent} → <span className="text-white font-medium">{alert.toAgent}</span>
                  </span>
                  {alert.escalatedTo && (
                    <span className="text-[10px] text-purple-400 ml-auto">
                      esc → {alert.escalatedTo}
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-600 ml-auto">
                    {formatDistanceToNow(alert.sentAt, { addSuffix: true })}
                  </span>
                </div>

                {/* Row 2: Message content */}
                <div className="text-xs text-zinc-300 truncate">
                  {alert.content}
                </div>

                {/* Row 3: Status + broken reason */}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                  <span>Status: {alert.messageStatusLabel}</span>
                  {alert.loopBroken && alert.loopBrokenReason && (
                    <span className="text-red-400 truncate">
                      — {alert.loopBrokenReason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
