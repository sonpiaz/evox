"use client";

import { useEffect } from "react";
import { ActivityPage } from "./activity-page";
import { cn } from "@/lib/utils";

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** AGT-181: Activity Drawer — slides from right, triggered by bell icon */
export function ActivityDrawer({ open, onClose }: ActivityDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <>
      <div
        role="presentation"
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[400px] z-40 border-l border-white/[0.08] bg-base shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-drawer-title"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span
              id="activity-drawer-title"
              className="text-xs font-medium tracking-widest uppercase text-white"
            >
              Activity
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-white/40 transition-colors hover:text-white/90"
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ActivityPage />
          </div>
        </div>
      </div>
    </>
  );
}
