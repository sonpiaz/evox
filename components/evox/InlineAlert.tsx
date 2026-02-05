"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * InlineAlert - Contextual alert within content
 * @see docs/ALERT-DESIGN-SYSTEM.md
 */

const inlineAlertVariants = cva(
  "flex items-start gap-2 p-3 rounded-md text-sm",
  {
    variants: {
      severity: {
        success: "bg-green-500/10 text-green-400",
        warning: "bg-yellow-500/10 text-yellow-400",
        error: "bg-red-500/10 text-red-400",
        info: "bg-blue-500/10 text-blue-400",
      },
    },
    defaultVariants: {
      severity: "info",
    },
  }
);

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

export interface InlineAlertProps extends VariantProps<typeof inlineAlertVariants> {
  severity: "success" | "warning" | "error" | "info";
  children: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export function InlineAlert({
  severity,
  children,
  showIcon = true,
  className,
}: InlineAlertProps) {
  const Icon = icons[severity];

  return (
    <div
      className={cn(inlineAlertVariants({ severity }), className)}
      role="alert"
    >
      {showIcon && (
        <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Compact version for form validation
export interface ValidationAlertProps {
  message: string;
  type?: "error" | "warning";
}

export function ValidationAlert({
  message,
  type = "error",
}: ValidationAlertProps) {
  return (
    <p
      className={cn(
        "text-xs mt-1",
        type === "error" ? "text-red-400" : "text-yellow-400"
      )}
      role="alert"
    >
      {message}
    </p>
  );
}

// Success message for completed actions
export function SuccessMessage({ children }: { children: React.ReactNode }) {
  return (
    <InlineAlert severity="success" className="my-2">
      {children}
    </InlineAlert>
  );
}

// Error message for failed actions
export function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <InlineAlert severity="error" className="my-2">
      {children}
    </InlineAlert>
  );
}
