"use client";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EVOX Design System: EmptyState
 * Display when no content is available
 */
export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 sm:py-12 text-center",
        className
      )}
    >
      <span className="text-3xl sm:text-4xl mb-3">{icon}</span>
      <h3 className="text-sm sm:text-base font-medium text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-xs sm:text-sm text-primary0 max-w-xs">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * Inline empty state for smaller spaces
 */
export function EmptyStateInline({
  message = "No data",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "py-4 text-center text-xs sm:text-sm text-primary0",
        className
      )}
    >
      {message}
    </div>
  );
}
