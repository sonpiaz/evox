"use client";

import { cn } from "@/lib/utils";

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

/**
 * EVOX Design System: Panel
 * Consistent container component with optional header
 */
export function Panel({
  children,
  title,
  subtitle,
  action,
  noPadding = false,
  className,
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-evox-border bg-evox-surface",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-evox-border px-3 sm:px-4 py-2 sm:py-3">
          <div>
            {title && (
              <h3 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[10px] sm:text-xs text-primary0">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-3 sm:p-4")}>{children}</div>
    </div>
  );
}

/**
 * Collapsible panel section
 */
export function PanelSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-evox-border pt-3 mt-3", className)}>
      {title && (
        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
