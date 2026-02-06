"use client";

import { cn } from "@/lib/utils";

type Status = "online" | "busy" | "idle" | "offline";

interface StatusDotProps {
  status: Status;
  size?: "xs" | "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

// AGT-273: Consistent status colors
const statusColors: Record<Status, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-red-500",
};

const sizeMap = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

/**
 * EVOX Design System: StatusDot
 * Consistent status indicator dot (AGT-273)
 *
 * Colors:
 * - online: green
 * - busy: yellow (with pulse)
 * - idle: gray
 * - offline: red
 */
export function StatusDot({
  status,
  size = "sm",
  pulse,
  className,
}: StatusDotProps) {
  const shouldPulse = pulse ?? (status === "busy" || status === "online");

  return (
    <span
      className={cn(
        "rounded-full shrink-0",
        statusColors[status],
        sizeMap[size],
        shouldPulse && "animate-pulse",
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}

/**
 * Get status color class for custom usage
 */
export function getStatusColor(status: Status): string {
  return statusColors[status];
}

/**
 * Get status from various inputs (case-insensitive)
 */
export function normalizeStatus(input: string | undefined | null): Status {
  const normalized = (input ?? "offline").toLowerCase();
  if (normalized === "online" || normalized === "active") return "online";
  if (normalized === "busy" || normalized === "working") return "busy";
  if (normalized === "idle" || normalized === "away") return "idle";
  return "offline";
}
