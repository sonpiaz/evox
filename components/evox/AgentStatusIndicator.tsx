"use client";

import { cn } from "@/lib/utils";

/**
 * AGT-273: Agent Status Indicator
 * Design: Green = online, Yellow = busy, Red = offline, Gray = idle
 * Pulse animation when agent is actively working
 */

type AgentStatus = "online" | "busy" | "idle" | "offline";

interface AgentStatusIndicatorProps {
  status: AgentStatus | string;
  /** Show pulse animation for working agents */
  showPulse?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

const statusColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-red-500",
};

const statusRingColors: Record<AgentStatus, string> = {
  online: "ring-green-500/30",
  busy: "ring-yellow-500/30",
  idle: "ring-gray-500/30",
  offline: "ring-red-500/30",
};

const sizeClasses: Record<"sm" | "md" | "lg", string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

/**
 * Normalizes any status string to a valid AgentStatus
 */
function normalizeStatus(status: string | undefined | null): AgentStatus {
  const normalized = (status ?? "").toLowerCase().trim();
  if (normalized === "online") return "online";
  if (normalized === "busy" || normalized === "working") return "busy";
  if (normalized === "idle") return "idle";
  return "offline";
}

export function AgentStatusIndicator({
  status,
  showPulse = false,
  size = "md",
  className,
}: AgentStatusIndicatorProps) {
  const normalizedStatus = normalizeStatus(status);
  const colorClass = statusColors[normalizedStatus];
  const ringClass = statusRingColors[normalizedStatus];
  const sizeClass = sizeClasses[size];

  // Show pulse for online/busy agents when showPulse is true
  const shouldPulse = showPulse && (normalizedStatus === "online" || normalizedStatus === "busy");

  return (
    <span
      className={cn(
        "relative inline-block shrink-0 rounded-full",
        colorClass,
        sizeClass,
        shouldPulse && "ring-2 ring-offset-1 ring-offset-base",
        shouldPulse && ringClass,
        shouldPulse && "animate-pulse",
        className
      )}
      aria-label={`Status: ${normalizedStatus}`}
      role="status"
    />
  );
}

/**
 * Returns human-readable status label
 */
export function getStatusLabel(status: string | undefined | null): string {
  const normalized = normalizeStatus(status);
  const labels: Record<AgentStatus, string> = {
    online: "Online",
    busy: "Working",
    idle: "Idle",
    offline: "Offline",
  };
  return labels[normalized];
}

