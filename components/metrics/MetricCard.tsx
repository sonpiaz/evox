"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface MetricCardProps {
  icon: string;
  label: string;
  value: number;
  unit: string;
  trend?: {
    direction: "up" | "down";
    percentage: number;
  };
  updatedAt?: Date;
  className?: string;
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  trend,
  updatedAt,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--bg-secondary)] rounded-2xl p-6 min-w-0 hover-lift",
        className
      )}
    >
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
          {label}
        </span>
      </div>

      {/* Value */}
      <div className="text-5xl font-bold tabular-nums text-[var(--text-primary)] mb-1">
        {value}
      </div>

      {/* Unit */}
      <div className="text-base text-[var(--text-secondary)] mb-4">{unit}</div>

      {/* Trend */}
      {trend && (
        <div
          className={cn(
            "text-sm font-medium",
            trend.direction === "up"
              ? "text-[var(--status-online)]"
              : "text-[var(--status-offline)]"
          )}
        >
          {trend.direction === "up" ? "\u2191" : "\u2193"} {trend.percentage}%
        </div>
      )}

      {/* Timestamp */}
      {updatedAt && (
        <div className="text-xs text-[var(--text-tertiary)] mt-4">
          Updated {formatDistanceToNow(updatedAt, { addSuffix: true })}
        </div>
      )}
    </div>
  );
}
