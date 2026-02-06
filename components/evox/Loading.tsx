"use client";

import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
};

/**
 * EVOX Design System: Loading Spinner
 */
export function Loading({ size = "md", text, className }: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-gray-500 border-t-blue-500",
          sizeMap[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <span className="text-xs sm:text-sm text-primary0 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Full-page loading state
 */
export function LoadingPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center">
      <Loading size="lg" text={text} />
    </div>
  );
}

/**
 * Skeleton loader for content
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-surface-4",
        className
      )}
    />
  );
}

/**
 * Skeleton card
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-1/50 p-4",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
