"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface KillSwitchProps {
  className?: string;
}

/**
 * AGT-212: Kill Switch UI
 * Emergency stop all agent operations
 * - Red "KILL" button (admin only)
 * - Confirmation modal
 * - System paused banner with Resume button
 */
export function KillSwitch({ className }: KillSwitchProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const { isViewerMode } = useViewerMode();

  const systemState = useQuery(api.system.getSystemState);
  const killSwitch = useMutation(api.system.killSwitch);
  const resumeSystem = useMutation(api.system.resumeSystem);

  const isPaused = systemState?.paused ?? false;

  // In viewer mode, don't show kill switch at all
  if (isViewerMode) {
    return null;
  }

  const handleKill = async () => {
    if (!reason.trim()) return;
    await killSwitch({ reason: reason.trim(), pausedBy: "Son" });
    setShowConfirm(false);
    setReason("");
  };

  const handleResume = async () => {
    await resumeSystem({ resumedBy: "Son" });
  };

  return (
    <>
      {/* Kill button or paused indicator */}
      {!isPaused ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:border-red-500/50",
            className
          )}
        >
          <span>KILL</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleResume}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-400 animate-pulse transition-colors hover:bg-yellow-500/20",
            className
          )}
        >
          <span>RESUME</span>
        </button>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setShowConfirm(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-red-500/30 bg-base p-6 shadow-2xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-400">
              <span>EMERGENCY STOP</span>
            </h2>
            <p className="mt-3 text-sm text-secondary">
              This will immediately:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-primary0">
              <li>Set all agents to offline</li>
              <li>Cancel all pending dispatches</li>
              <li>Pause all automation</li>
            </ul>

            <div className="mt-4">
              <label className="text-xs text-secondary">Reason (required)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you stopping the system?"
                className="mt-1 w-full rounded-md border border-gray-500 bg-surface-1 px-3 py-2 text-sm text-white placeholder-tertiary focus:border-red-500/50 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-md border border-gray-500 bg-surface-1 px-4 py-2 text-sm text-secondary transition-colors hover:bg-surface-4 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleKill}
                disabled={!reason.trim()}
                className="flex-1 rounded-md border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                STOP ALL AGENTS
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * System Paused Banner - shows when system is paused
 * Should be rendered at top of page
 * AGT-230: Hide resume button in viewer/demo mode
 */
export function SystemPausedBanner() {
  const systemState = useQuery(api.system.getSystemState);
  const resumeSystem = useMutation(api.system.resumeSystem);
  const { isViewerMode } = useViewerMode();

  if (!systemState?.paused) return null;

  const handleResume = async () => {
    await resumeSystem({ resumedBy: "Son" });
  };

  const pausedAt = systemState.pausedAt
    ? new Date(systemState.pausedAt).toLocaleTimeString()
    : "unknown";

  return (
    <div className="flex items-center justify-between bg-red-500/90 px-4 py-2 text-white">
      <div className="flex items-center gap-3">
        <span className="text-lg">SYSTEM PAUSED</span>
        <span className="text-sm opacity-80">
          {systemState.pauseReason} (paused at {pausedAt} by {systemState.pausedBy})
        </span>
      </div>
      {!isViewerMode && (
        <button
          type="button"
          onClick={handleResume}
          className="rounded-md border border-white/30 bg-white/10 px-4 py-1 text-sm font-medium transition-colors hover:bg-white/20"
        >
          RESUME SYSTEM
        </button>
      )}
    </div>
  );
}
