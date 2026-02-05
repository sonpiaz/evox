"use client";

/**
 * DashboardV2 - Lean & Clean Dashboard
 *
 * Assembles all v0.2 components:
 * 1. MetricsBar - Key metrics
 * 2. AgentGrid - Agent status
 * 3. AlertsBanner - Critical alerts
 * 4. ActivityFeed - Live activity
 * 5. DispatchList - Queue status
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricsBar } from "./MetricsBar";
import { AgentGrid } from "./AgentGrid";
import { AlertsBanner } from "./AlertsBanner";
import { ActivityFeed } from "./ActivityFeed";
import { DispatchList } from "./DispatchList";
import { AgentCommsWidget } from "./AgentCommsWidget";
import { ProposalList } from "./ProposalList";

export function DashboardV2() {
  const status = useQuery(api.http.getStatus);

  if (!status) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Extract data
  const agents = (status.agents || []).map((a: any) => ({
    name: a.name,
    computedStatus: a.computedStatus || "offline",
    currentTask: a.currentTask,
    lastSeen: a.lastSeen || a.lastHeartbeat,
  }));

  const activities = (status.recentActivity || []).map((a: any, i: number) => ({
    id: a._id || `activity-${i}`,
    agentName: a.agentName,
    eventType: a.eventType,
    description: a.description,
    title: a.title,
    timestamp: a.timestamp || Date.now(),
  }));

  // Calculate metrics
  const onlineAgents = agents.filter(
    (a: any) => a.computedStatus === "online" || a.computedStatus === "busy"
  ).length;

  const offlineAgents = agents
    .filter((a: any) => a.computedStatus === "offline")
    .map((a: any) => a.name);

  // Mock data for now - TODO: Connect to real APIs
  const tasksToday = activities.filter(
    (a: any) => a.eventType?.includes("completed")
  ).length;

  const velocity = tasksToday > 0 ? tasksToday / 8 : 0; // Assume 8 hour day

  // Dispatches - TODO: Connect to real dispatch API
  const dispatches: any[] = [];

  // Alerts - TODO: Connect to real alerts API
  const alerts: any[] = [];

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-safe-area-inset-bottom max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 sticky top-0 bg-black/95 backdrop-blur-sm -mx-4 px-4 pt-4 -mt-4 z-10">
        <div>
          <h1 className="text-2xl sm:text-xl font-bold tracking-tight">EVOX</h1>
          <span className="text-zinc-600 text-xs">v0.2 Mission Control</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 text-xs font-medium">Live</span>
        </div>
      </header>

      {/* Metrics Bar */}
      <section className="mb-6">
        <MetricsBar
          tasksToday={tasksToday}
          velocity={velocity}
          activeAgents={onlineAgents}
          totalAgents={agents.length}
          blockers={offlineAgents.length + alerts.length}
        />
      </section>

      {/* Alerts Banner */}
      {(offlineAgents.length > 0 || alerts.length > 0) && (
        <section className="mb-6">
          <AlertsBanner alerts={alerts} offlineAgents={offlineAgents} />
        </section>
      )}

      {/* Agent Grid */}
      <section className="mb-6">
        <AgentGrid agents={agents} />
      </section>

      {/* Agent Comms */}
      <section className="mb-6">
        <AgentCommsWidget limit={8} />
      </section>

      {/* Two-column layout for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <section>
          <ActivityFeed activities={activities} limit={10} />
        </section>

        {/* Proposals + Dispatch */}
        <div className="space-y-6">
          <section>
            <ProposalList limit={5} />
          </section>
          <section>
            <DispatchList dispatches={dispatches} limit={5} />
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 pb-6 border-t border-zinc-800/50 text-center">
        <span className="text-zinc-700 text-xs sm:text-[10px] tracking-wider uppercase">
          EVOX Mission Control v0.2
        </span>
      </footer>
    </div>
  );
}
