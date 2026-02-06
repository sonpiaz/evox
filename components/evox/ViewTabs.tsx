"use client";

import { cn } from "@/lib/utils";

export type MainViewTab = "ceo" | "kanban" | "health" | "comms";

interface ViewTabsProps {
  activeTab: MainViewTab;
  onTabChange: (tab: MainViewTab) => void;
  className?: string;
}

const tabs: { id: MainViewTab; label: string; shortcut: string }[] = [
  { id: "ceo", label: "CEO", shortcut: "⌘0" },
  { id: "kanban", label: "Kanban", shortcut: "⌘1" },
  { id: "health", label: "Health", shortcut: "⌘2" },
  { id: "comms", label: "Comms", shortcut: "⌘3" },
];

/**
 * AGT-206: View Tabs
 * Tab toggle for main content area
 * Keyboard: Cmd+1/2/3/4/5 (handled by parent via useKeyboardShortcuts)
 */
export function ViewTabs({ activeTab, onTabChange, className }: ViewTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-zinc-800 bg-zinc-950 px-2 sm:px-4 py-2 overflow-x-auto scrollbar-hide",
        className
      )}
      role="tablist"
      aria-label="Dashboard views"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            // Mobile-first: 44px min touch target (py-3 = 12px * 2 + text ~= 44px)
            "flex items-center justify-center gap-1 sm:gap-2 rounded-md px-3 sm:px-4 py-3 min-h-[44px] text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0",
            "active:scale-95 touch-manipulation",
            activeTab === tab.id
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
          )}
        >
          <span>{tab.label}</span>
          <span
            className={cn(
              "hidden text-[10px] lg:inline",
              activeTab === tab.id ? "text-white/50" : "text-zinc-700"
            )}
          >
            {tab.shortcut}
          </span>
        </button>
      ))}
    </div>
  );
}
