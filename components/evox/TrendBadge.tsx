"use client";

import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  value: number; // Percentage change (+15, -5, etc.)
  label?: string;
  className?: string;
}

/**
 * AGT-205: Trend indicator badge (↑15% vs last period)
 */
export function TrendBadge({ value, label, className }: TrendBadgeProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const icon = isNeutral ? "→" : isPositive ? "↑" : "↓";
  const colorClass = isNeutral
    ? "text-zinc-500"
    : isPositive
      ? "text-emerald-400"
      : "text-red-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <span>{icon}</span>
      <span>{Math.abs(value)}%</span>
      {label && <span className="text-zinc-500 ml-1">{label}</span>}
    </span>
  );
}
