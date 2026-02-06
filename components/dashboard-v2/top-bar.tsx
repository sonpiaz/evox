"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

import { useViewerMode } from "@/contexts/ViewerModeContext";

interface TopBarProps {
  agentsActive?: number;
  tasksInQueue?: number;
  inProgress?: number;
  doneToday?: number;
  totalTasks?: number;
  onSettingsClick?: () => void;
  /** AGT-181: Bell opens Activity drawer */
  notificationTotalUnread?: number;
  onBellClick?: () => void;
}

export function TopBar({
  agentsActive = 0,
  tasksInQueue = 0,
  inProgress = 0,
  doneToday = 0,
  totalTasks = 0,
  onSettingsClick,
  notificationTotalUnread = 0,
  onBellClick,
}: TopBarProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const { isViewerMode } = useViewerMode();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDate(now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-default bg-base px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-primary">EVOX</h1>
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Command Center</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-1 px-2 py-1 text-xs text-primary0">
          In Progress <span className="font-medium text-primary">{inProgress}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-1 px-2 py-1 text-xs text-primary0">
          Done <span className="font-medium text-primary">{doneToday}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border-default bg-surface-1 px-2 py-1 text-xs text-primary0">
          Total <span className="font-medium text-primary">{totalTasks}</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs">
          <div className="font-mono text-primary">{time}</div>
          <div className="text-primary0">{date}</div>
        </div>
        {isViewerMode && (
          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-400">
            VIEWER MODE
          </span>
        )}
        <NotificationBell
          totalUnread={notificationTotalUnread}
          onBellClick={onBellClick}
        />
        <div className="flex items-center gap-1.5 text-xs text-secondary">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Online
        </div>
        {onSettingsClick && !isViewerMode && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="rounded-lg p-2 text-primary0 hover:bg-surface-1 hover:text-primary"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
