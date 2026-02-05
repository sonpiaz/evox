"use client";

import { useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Toast notification component
 * @see docs/ALERT-DESIGN-SYSTEM.md
 */

const toastVariants = cva(
  "flex items-start gap-3 p-3 rounded-lg border shadow-lg w-[320px] max-w-[90vw]",
  {
    variants: {
      severity: {
        success: "bg-green-500/10 border-green-500/30 text-green-400",
        warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
        error: "bg-red-500/10 border-red-500/30 text-red-400",
        info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
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

export interface ToastProps extends VariantProps<typeof toastVariants> {
  severity: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  duration?: number; // 0 = persistent
  showProgress?: boolean;
  className?: string;
}

export function Toast({
  severity,
  title,
  message,
  action,
  onDismiss,
  duration = 5000,
  showProgress = true,
  className,
}: ToastProps) {
  const Icon = icons[severity];

  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div
      className={cn(toastVariants({ severity }), className)}
      role="alert"
      aria-live={severity === "error" ? "assertive" : "polite"}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {message && (
          <p className="text-sm opacity-80 mt-0.5">{message}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline mt-1 hover:opacity-80 transition-opacity"
          >
            {action.label}
          </button>
        )}
        {showProgress && duration > 0 && (
          <div
            className="h-0.5 bg-current opacity-30 mt-2 rounded-full"
            style={{
              animation: `progress ${duration}ms linear`,
              width: "100%",
            }}
          />
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 hover:opacity-80 transition-opacity p-1 -m-1 rounded"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Re-export severity type for external use
export type ToastSeverity = "success" | "warning" | "error" | "info";
