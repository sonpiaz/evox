"use client";

import { cn } from "@/lib/utils";

type StatusType = "online" | "busy" | "idle" | "offline" | "success" | "warning" | "error" | "info";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  online: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    dot: "bg-green-500",
  },
  busy: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  idle: {
    bg: "bg-gray-500/10",
    text: "text-secondary",
    dot: "bg-gray-500",
  },
  offline: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  warning: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  error: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    dot: "bg-blue-500",
  },
};

/**
 * EVOX Design System: StatusBadge
 * Consistent status indicator with optional dot
 */
export function StatusBadge({
  status,
  label,
  size = "sm",
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border",
        config.bg,
        config.text,
        `border-${status === "online" ? "green" : status === "busy" ? "yellow" : status === "idle" ? "zinc" : status === "offline" ? "red" : status === "success" ? "emerald" : status === "warning" ? "yellow" : status === "error" ? "red" : "blue"}-500/20`,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            config.dot,
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            (status === "busy" || status === "online") && "animate-pulse"
          )}
        />
      )}
      <span className="uppercase tracking-wide">{displayLabel}</span>
    </span>
  );
}
