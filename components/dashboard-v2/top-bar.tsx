"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";

interface TopBarProps {
  agentsActive?: number;
  tasksInQueue?: number;
  onSettingsClick?: () => void;
}

export function TopBar({ agentsActive = 0, tasksInQueue = 0, onSettingsClick }: TopBarProps) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-800 bg-[#0a0a0a] px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-bold tracking-wider text-zinc-50">EVOX COMMAND CENTER</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{agentsActive} Agents Active</span>
          <span className="text-zinc-600">|</span>
          <span>{tasksInQueue} Tasks in Queue</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs">
          <div className="font-mono text-zinc-50">{time}</div>
          <div className="text-zinc-500">{date}</div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-gray-800 px-2 py-1 text-xs font-medium text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          ONLINE
        </div>
        {onSettingsClick && (
          <button
            type="button"
            onClick={onSettingsClick}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-white"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
