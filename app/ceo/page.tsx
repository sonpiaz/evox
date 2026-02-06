"use client";

/**
 * CEO Dashboard v2
 *
 * Elon Standard: Understand the entire system state in 3 seconds.
 *
 * Mobile-first. Glanceable. Signal, not noise.
 *
 * Key Metrics (only 3):
 * 1. Agents Online - Team health
 * 2. Tasks Done Today - Velocity
 * 3. Cost Today - Budget
 *
 * Sections:
 * 1. Status Bar (agents + metrics)
 * 2. Blockers (if any) - RED
 * 3. Wins (if any) - GREEN
 * 4. Live Feed - What's happening
 * 5. Agent Terminals (collapsed on mobile)
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { LiveFeed } from "@/components/ceo/LiveFeed";
import { BlockersCard } from "@/components/ceo/BlockersCard";
import { WinsCard } from "@/components/ceo/WinsCard";
import { LoopSummaryCard } from "@/components/ceo/LoopSummaryCard";
import { AccountabilityGrid } from "@/components/ceo/AccountabilityGrid";
import { UnresolvedAlerts } from "@/components/ceo/UnresolvedAlerts";
import { useState } from "react";

export default function CEODashboardPage() {
  const [showTerminals, setShowTerminals] = useState(false);

  const agentStatus = useQuery(api.ceoMetrics.getAgentStatus);
  const todayMetrics = useQuery(api.ceoMetrics.getTodayMetrics);
  const northStar = useQuery(api.ceoMetrics.getNorthStarProgress);

  const isLoading = !agentStatus || !todayMetrics;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Status Bar - Fixed at top */}
      <header className="sticky top-0 z-50 bg-surface-1/95 backdrop-blur border-b border-border-default">
        <div className="px-4 py-3">
          {/* Top row: Agent dots + key metrics */}
          <div className="flex items-center justify-between gap-4">
            {/* Agent Status */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="h-5 w-24 bg-surface-4 animate-pulse rounded" />
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    {agentStatus?.agents.map((agent) => (
                      <div
                        key={agent.name}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          agent.status === "online" && "bg-green-500",
                          agent.status === "busy" && "bg-yellow-500 animate-pulse",
                          agent.status === "offline" && "bg-red-500"
                        )}
                        title={`${agent.name}: ${agent.status}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-secondary">
                    {agentStatus?.online}/{agentStatus?.total}
                  </span>
                </>
              )}
            </div>

            {/* Key Metrics */}
            <div className="flex items-center gap-4 text-sm">
              {isLoading ? (
                <>
                  <div className="h-5 w-16 bg-surface-4 animate-pulse rounded" />
                  <div className="h-5 w-16 bg-surface-4 animate-pulse rounded" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">
                      {todayMetrics?.completed}
                    </span>
                    <span className="text-primary0">done</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400 font-bold">
                      ${todayMetrics?.cost.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* North Star Progress (compact) */}
          {northStar && northStar.percentage > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${northStar.percentage}%` }}
                />
              </div>
              <span className="text-xs text-secondary shrink-0">
                {northStar.percentage}%
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Alert: In Progress count */}
        {!isLoading && todayMetrics && todayMetrics.inProgress > 0 && (
          <div className="flex items-center gap-2 text-sm text-secondary">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{todayMetrics.inProgress} tasks in progress</span>
          </div>
        )}

        {/* The Loop — Glanceable loop health */}
        <LoopSummaryCard />

        {/* Blockers - Show first if any (RED) */}
        <BlockersCard />

        {/* Unresolved Loop Alerts — Active SLA breaches */}
        <UnresolvedAlerts />

        {/* Wins - Celebrate (GREEN) */}
        <WinsCard />

        {/* Accountability Grid — Per-agent loop performance */}
        <AccountabilityGrid />

        {/* Live Feed - What's happening */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary0 mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </h2>
          <div className="bg-surface-1 border border-border-default rounded-lg p-2">
            <LiveFeed limit={8} />
          </div>
        </section>

        {/* Agent Terminals - Collapsed by default on mobile */}
        <section>
          <button
            onClick={() => setShowTerminals(!showTerminals)}
            className="w-full flex items-center justify-between py-2 text-sm"
          >
            <span className="text-primary0 uppercase tracking-wider text-xs font-bold">
              Terminals
            </span>
            <span className="text-tertiary">{showTerminals ? "-" : "+"}</span>
          </button>

          {showTerminals && (
            <div className="space-y-2 mt-2">
              {agentStatus?.agents.map((agent) => (
                <div
                  key={agent.name}
                  className="bg-surface-1 border border-border-default rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{agent.avatar}</span>
                    <span className="font-semibold text-white uppercase text-sm">
                      {agent.name}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full ml-auto",
                        agent.status === "online" && "bg-green-500",
                        agent.status === "busy" && "bg-yellow-500",
                        agent.status === "offline" && "bg-red-500"
                      )}
                    />
                  </div>
                  <div className="bg-black rounded p-2 font-mono text-xs text-secondary">
                    {agent.status === "offline" ? (
                      <span className="text-tertiary">Offline</span>
                    ) : (
                      <span>Ready...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Quick Actions FAB - Mobile */}
      <div className="fixed bottom-4 right-4 md:hidden">
        <button
          className="h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center text-xl hover:bg-blue-500 transition-colors"
          title="Quick actions"
        >
          +
        </button>
      </div>
    </div>
  );
}
