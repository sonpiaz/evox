"use client";

import { MetricGrid } from "@/components/metrics/MetricGrid";
import { AgentGrid } from "@/components/agents/AgentGrid";
import { ActivityFeed } from "@/components/feed/ActivityFeed";

/**
 * /dashboard — AGT-333 Dashboard Redesign Phase 1
 * CEO understands system health in 3 seconds.
 * "Cockpit, Not Control Panel"
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="h-16 border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          EVOX MISSION CONTROL
        </h1>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--status-online)] animate-pulse-status" />
          <span className="text-xs text-[var(--text-tertiary)]">Live</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        {/* Big 3 Metrics */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
            System Health
          </h2>
          <MetricGrid />
        </section>

        {/* Agent Status */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
            Agent Status
          </h2>
          <AgentGrid />
        </section>

        {/* Live Feed */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">
            Live Feed
          </h2>
          <div className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-default)]">
            <ActivityFeed />
          </div>
        </section>
      </main>
    </div>
  );
}
