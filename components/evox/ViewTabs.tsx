"use client";

import { cn } from "@/lib/utils";

export type MainViewTab = "kanban" | "terminal" | "queue" | "activity" | "health" | "automation" | "messages" | "metrics";

interface ViewTabsProps {
  activeTab: MainViewTab;
  onTabChange: (tab: MainViewTab) => void;
  className?: string;
}

const tabs: { id: MainViewTab; label: string; shortcut: string }[] = [
  { id: "kanban", label: "Kanban", shortcut: "⌘1" },
  { id: "terminal", label: "Terminal", shortcut: "⌘2" },
  { id: "queue", label: "Queue", shortcut: "⌘3" },
  { id: "activity", label: "Activity", shortcut: "⌘4" },
  { id: "health", label: "Health", shortcut: "⌘5" },
  { id: "automation", label: "Automation", shortcut: "⌘6" },
  { id: "messages", label: "Messages", shortcut: "⌘7" },
  { id: "metrics", label: "Metrics", shortcut: "⌘8" },
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
        "flex items-center gap-1 border-b border-[#222222] bg-[#0f0f0f] px-4 py-2",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === tab.id
              ? "bg-white/10 text-white"
              : "text-[#666666] hover:bg-white/5 hover:text-[#999999]"
          )}
        >
          <span>{tab.label}</span>
          <span
            className={cn(
              "hidden text-[10px] sm:inline",
              activeTab === tab.id ? "text-white/50" : "text-[#444444]"
            )}
          >
            {tab.shortcut}
          </span>
        </button>
      ))}
    </div>
  );
}
