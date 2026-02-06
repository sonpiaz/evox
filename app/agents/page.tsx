"use client";

/**
 * AGT-341: Hall of Fame — Agent Leaderboard (standalone route)
 *
 * Route: /agents
 * Uses shared HallOfFame component. This route exists for direct URL access.
 * Primary access is via the "Team" tab in the main dashboard.
 */

import Link from "next/link";
import { HallOfFame } from "@/components/evox/HallOfFame";

export default function HallOfFamePage() {
  return (
    <div className="min-h-screen bg-base text-white">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border-default">
        <Link href="/?view=team" className="text-tertiary hover:text-secondary text-sm transition-colors">
          &larr; Dashboard
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Hall of Fame</h1>
      </header>
      <HallOfFame />
    </div>
  );
}
