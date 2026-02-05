"use client";

import { useEffect, useState } from "react";
import { ActivityPage } from "./activity-page";
import { FileActivityMatrix } from "@/components/evox/FileActivityMatrix";
import { ExecutionTerminal } from "@/components/evox/ExecutionTerminal";
import { HeartbeatPanel } from "@/components/evox/HeartbeatPanel";
import { cn } from "@/lib/utils";

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
}

type DrawerTab = "activity" | "files" | "terminal" | "health";

/** AGT-181: Activity Drawer — slides from right, triggered by bell icon */
export function ActivityDrawer({ open, onClose }: ActivityDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("activity");

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
          "fixed top-0 right-0 h-full w-[400px] z-40 border-l border-white/[0.08] bg-[#0f0f1a] shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-drawer-title"
      >
        <div className="flex h-full flex-col">
          {/* Header with tabs */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "text-xs font-medium tracking-widest uppercase transition-colors",
                  activeTab === "activity" ? "text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                Activity
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("files")}
                className={cn(
                  "text-xs font-medium tracking-widest uppercase transition-colors",
                  activeTab === "files" ? "text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                Files
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("terminal")}
                className={cn(
                  "text-xs font-medium tracking-widest uppercase transition-colors",
                  activeTab === "terminal" ? "text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                Terminal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("health")}
                className={cn(
                  "text-xs font-medium tracking-widest uppercase transition-colors",
                  activeTab === "health" ? "text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                Health
              </button>
            </div>
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
            {activeTab === "activity" && <ActivityPage />}
            {activeTab === "files" && (
              <div className="h-full p-3 overflow-auto">
                <FileActivityMatrix className="h-full" />
              </div>
            )}
            {activeTab === "terminal" && (
              <div className="h-full p-3 overflow-auto">
                <ExecutionTerminal className="h-full" />
              </div>
            )}
            {activeTab === "health" && (
              <div className="h-full p-3 overflow-auto">
                <HeartbeatPanel className="h-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
