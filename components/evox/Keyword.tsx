"use client";

import { cn } from "@/lib/utils";

type KeywordVariant = "default" | "blue" | "green" | "yellow" | "red" | "purple";

interface KeywordProps {
  children: React.ReactNode;
  variant?: KeywordVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantStyles: Record<KeywordVariant, string> = {
  default: "bg-gray-500/10 text-secondary border-gray-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

/**
 * EVOX Design System: Keyword
 * Tag/keyword display component
 */
export function Keyword({
  children,
  variant = "blue",
  size = "sm",
  className,
}: KeywordProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium border",
        variantStyles[variant],
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px] sm:text-xs"
          : "px-2 py-0.5 text-xs sm:text-sm",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Keyword list with automatic wrapping
 */
export function KeywordList({
  keywords,
  variant = "blue",
  max = 5,
  className,
}: {
  keywords: string[];
  variant?: KeywordVariant;
  max?: number;
  className?: string;
}) {
  const displayKeywords = keywords.slice(0, max);
  const remaining = keywords.length - max;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {displayKeywords.map((keyword, idx) => (
        <Keyword key={idx} variant={variant}>
          #{keyword}
        </Keyword>
      ))}
      {remaining > 0 && (
        <Keyword variant="default">+{remaining}</Keyword>
      )}
    </div>
  );
}
