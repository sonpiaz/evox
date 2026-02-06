"use client";

/**
 * AGT-336: Loop Timeline
 *
 * Visual timeline for a message's Loop journey:
 * sent → seen → replied → acted → reported
 *
 * Shows colored dots, connecting lines, and durations.
 * Highlights SLA breaches in red.
 */

import { cn } from "@/lib/utils";

const STAGES = ["sent", "seen", "replied", "acted", "reported"] as const;
type Stage = (typeof STAGES)[number];

/** Status code each stage corresponds to */
const STAGE_CODE: Record<Stage, number> = {
  sent: 0,
  seen: 2,
  replied: 3,
  acted: 4,
  reported: 5,
};

/** SLA limits for stages that have them */
const SLA_MS: Partial<Record<Stage, number>> = {
  replied: 15 * 60 * 1000, // 15 min
  acted: 2 * 60 * 60 * 1000, // 2 hours
  reported: 24 * 60 * 60 * 1000, // 24 hours
};

const DOT_COLORS: Record<string, string> = {
  completed: "bg-emerald-500",
  active: "bg-blue-500 animate-pulse",
  pending: "bg-gray-500",
  breached: "bg-red-500",
};

const LABEL_COLORS: Record<string, string> = {
  completed: "text-emerald-400",
  active: "text-blue-400",
  pending: "text-tertiary",
  breached: "text-red-400",
};

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export interface LoopTimelineMessage {
  status: number;
  sentAt: number;
  seenAt?: number;
  repliedAt?: number;
  content: string;
  from: string;
  to: string;
}

interface LoopTimelineProps {
  message: LoopTimelineMessage | null;
  className?: string;
}

export function LoopTimeline({ message, className }: LoopTimelineProps) {
  if (!message) {
    return (
      <div className={cn("bg-surface-1/40 border border-border-default/60 rounded-xl p-6", className)}>
        <div className="text-xs text-tertiary text-center">
          Select a message to view its loop timeline
        </div>
      </div>
    );
  }

  const now = Date.now();

  const timeline = STAGES.map((stage) => {
    const code = STAGE_CODE[stage];
    const isCompleted = stage === "sent" || message.status >= code;
    const isActive = !isCompleted && message.status === code - 1;

    // Compute duration between stages where timestamps exist
    let duration: number | undefined;
    if (stage === "seen" && message.seenAt) {
      duration = message.seenAt - message.sentAt;
    } else if (stage === "replied" && message.repliedAt && message.seenAt) {
      duration = message.repliedAt - message.seenAt;
    }

    // Check SLA breach for active stages
    const slaLimit = SLA_MS[stage];
    let isBreached = false;
    if (slaLimit && isActive) {
      if (stage === "replied" && message.seenAt) {
        isBreached = now - message.seenAt > slaLimit;
      } else if (stage === "acted" && message.repliedAt) {
        isBreached = now - message.repliedAt > slaLimit;
      }
    }

    let state: string;
    if (isBreached) state = "breached";
    else if (isCompleted) state = "completed";
    else if (isActive) state = "active";
    else state = "pending";

    return { stage, state, duration, isCompleted };
  });

  return (
    <div className={cn("bg-surface-1/40 border border-border-default/60 rounded-xl overflow-hidden", className)}>
      <div className="px-4 py-2.5 border-b border-border-default/40 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary0">
          Loop Timeline
        </span>
        <span className="text-[10px] text-tertiary truncate ml-2">
          {message.from} &rarr; {message.to}
        </span>
      </div>
      <div className="px-4 py-4">
        {/* Stage dots with connectors */}
        <div className="flex items-center justify-between">
          {timeline.map((t, i) => (
            <div key={t.stage} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("h-3 w-3 rounded-full shrink-0", DOT_COLORS[t.state])} />
                <span className={cn("text-[9px] uppercase font-medium", LABEL_COLORS[t.state])}>
                  {t.stage}
                </span>
                {t.duration !== undefined && (
                  <span
                    className={cn(
                      "text-[9px] tabular-nums",
                      t.state === "breached" ? "text-red-400" : "text-primary0"
                    )}
                  >
                    {formatDuration(t.duration)}
                  </span>
                )}
              </div>
              {i < timeline.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-1.5",
                    t.isCompleted ? "bg-emerald-500/40" : "bg-surface-4"
                  )}
                />
              )}
            </div>
          ))}
        </div>
        {/* Message preview */}
        <div className="mt-3 pt-3 border-t border-border-default/30">
          <div className="text-[10px] text-tertiary truncate">{message.content}</div>
        </div>
      </div>
    </div>
  );
}
