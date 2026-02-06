"use client";

import { cn } from "@/lib/utils";

type MetricColor = "default" | "success" | "warning" | "error" | "info";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  color?: MetricColor;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

const colorMap: Record<MetricColor, string> = {
  default: "text-white",
  success: "text-emerald-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  info: "text-blue-400",
};

const trendColors = {
  up: "text-emerald-400",
  down: "text-red-400",
  flat: "text-primary0",
};

const trendIcons = {
  up: "↑",
  down: "↓",
  flat: "→",
};

/**
 * EVOX Design System: MetricCard
 * Dashboard metric display with optional trend indicator
 */
export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  color = "default",
  trend,
  trendValue,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-surface-1/50 p-3 sm:p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-white/30">
          {title}
        </span>
        {icon && (
          <span className="text-white/20">{icon}</span>
        )}
      </div>

      {/* Value */}
      <div className="mt-1 sm:mt-2 flex items-baseline gap-1">
        <span
          className={cn(
            "text-xl sm:text-2xl font-bold tabular-nums",
            colorMap[color]
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm text-white/50">{unit}</span>
        )}
      </div>

      {/* Footer: Subtitle or Trend */}
      <div className="mt-1 flex items-center gap-2">
        {subtitle && (
          <span className="text-[9px] sm:text-[10px] text-white/40">
            {subtitle}
          </span>
        )}
        {trend && trendValue && (
          <span className={cn("text-[10px] sm:text-xs font-medium", trendColors[trend])}>
            {trendIcons[trend]} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact metric for inline display
 */
export function MetricInline({
  label,
  value,
  color = "default",
  className,
}: {
  label: string;
  value: string | number;
  color?: MetricColor;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-xs text-white/40">{label}</span>
      <span className={cn("text-xs sm:text-sm font-medium", colorMap[color])}>
        {value}
      </span>
    </div>
  );
}
