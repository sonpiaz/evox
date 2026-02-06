"use client";

import { cn } from "@/lib/utils";

type HeroStatusType = "green" | "yellow" | "red";

interface HeroStatusProps {
  status: HeroStatusType;
  headline: string;
  subtext?: string;
  className?: string;
}

const statusConfig: Record<HeroStatusType, {
  bg: string;
  text: string;
  icon: string;
  border: string;
}> = {
  green: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    icon: "🟢",
    border: "border-green-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    icon: "🟡",
    border: "border-yellow-500/30",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    icon: "🔴",
    border: "border-red-500/30",
  },
};

/**
 * EVOX Redesign: HeroStatus
 *
 * The most important component on the CEO dashboard.
 * Shows system health in ONE glance.
 *
 * - GREEN: All systems go
 * - YELLOW: Warnings (blockers, idle agents)
 * - RED: Critical (offline agents, failures)
 */
export function HeroStatus({
  status,
  headline,
  subtext,
  className,
}: HeroStatusProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "rounded-xl border p-6 sm:p-8 text-center",
        config.bg,
        config.border,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Status Icon */}
      <div className="text-4xl sm:text-5xl mb-2" aria-hidden="true">
        {config.icon}
      </div>

      {/* Headline - This is what CEO sees first */}
      <h1
        className={cn(
          "text-2xl sm:text-3xl font-bold uppercase tracking-tight",
          config.text
        )}
      >
        {headline}
      </h1>

      {/* Subtext - Supporting details */}
      {subtext && (
        <p className="mt-2 text-sm sm:text-base text-secondary">
          {subtext}
        </p>
      )}
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function HeroStatusCompact({
  status,
  headline,
  className,
}: Omit<HeroStatusProps, "subtext">) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        config.bg,
        config.border,
        className
      )}
      role="status"
    >
      <span className="text-xl">{config.icon}</span>
      <span className={cn("text-sm font-bold uppercase", config.text)}>
        {headline}
      </span>
    </div>
  );
}

/**
 * Calculate hero status from dashboard data
 */
export function calculateHeroStatus(data: {
  offlineAgents: number;
  criticalTasks: number;
  blockedTasks: number;
  idleAgents: number;
  activeAgents: number;
  totalAgents: number;
  tasksToday: number;
  costToday: number;
}): { status: HeroStatusType; headline: string; subtext: string } {
  // Priority 1: Critical issues (RED)
  if (data.offlineAgents > 0) {
    return {
      status: "red",
      headline: "ACTION NEEDED",
      subtext: `${data.offlineAgents} agent${data.offlineAgents > 1 ? "s" : ""} offline`,
    };
  }

  if (data.criticalTasks > 0) {
    return {
      status: "red",
      headline: "CRITICAL",
      subtext: `${data.criticalTasks} critical task${data.criticalTasks > 1 ? "s" : ""} blocked`,
    };
  }

  // Priority 2: Warnings (YELLOW)
  if (data.blockedTasks > 0) {
    return {
      status: "yellow",
      headline: `${data.blockedTasks} BLOCKER${data.blockedTasks > 1 ? "S" : ""}`,
      subtext: `${data.activeAgents} agents working`,
    };
  }

  if (data.idleAgents > 1) {
    return {
      status: "yellow",
      headline: "AGENTS IDLE",
      subtext: `${data.idleAgents} agents waiting for work`,
    };
  }

  // Priority 3: All clear (GREEN)
  return {
    status: "green",
    headline: "ALL GOOD",
    subtext: `${data.activeAgents} agents • ${data.tasksToday} tasks • $${data.costToday.toFixed(2)}`,
  };
}
