"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export type MainViewTab = "ceo" | "kanban" | "comms" | "team";

interface ViewTabsProps {
  activeTab: MainViewTab;
  onTabChange: (tab: MainViewTab) => void;
  className?: string;
}

const tabs: { id: MainViewTab; label: string; href: string }[] = [
  { id: "ceo", label: "Overview", href: "/?view=ceo" },
  { id: "kanban", label: "Kanban", href: "/?view=kanban" },
  { id: "team", label: "Team", href: "/?view=team" },
  { id: "comms", label: "Comms", href: "/?view=comms" },
];

/**
 * AGT-206: View Tabs — Vercel-style navigation with URL links.
 * Each tab updates the URL query param (?view=...).
 * "Team" navigates to /agents.
 */
export function ViewTabs({ activeTab, onTabChange, className }: ViewTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center border-b border-border-default bg-base px-4 overflow-x-auto scrollbar-hide",
        className
      )}
      role="tablist"
      aria-label="Dashboard views"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={(e) => {
            e.preventDefault();
            onTabChange(tab.id);
          }}
          className={cn(
            "relative px-3 py-2.5 text-sm transition-colors whitespace-nowrap shrink-0",
            activeTab === tab.id
              ? "text-text-primary"
              : "text-text-tertiary hover:text-text-secondary"
          )}
        >
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-white" />
          )}
        </Link>
      ))}

    </div>
  );
}
