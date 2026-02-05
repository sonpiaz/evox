"use client";

/**
 * EVOX Dashboard v0.2 - Lean & Clean
 * 
 * Only what matters:
 * 1. Agent status (dots)
 * 2. Key metrics (tasks, cost)
 * 3. Live activity feed
 * 4. Alerts (if any)
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function V2Dashboard() {
  const status = useQuery(api.http.getStatus);
  
  if (!status) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const agents = status.agents || [];
  const activities = status.recentActivity || [];
  const onlineCount = agents.filter((a: any) => a.computedStatus === "online").length;
  const totalCount = agents.length;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-safe-area-inset-bottom max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 sticky top-0 bg-black/95 backdrop-blur-sm -mx-4 px-4 pt-4 -mt-4 z-10">
        <div>
          <h1 className="text-2xl sm:text-xl font-bold tracking-tight">EVOX</h1>
          <span className="text-zinc-600 text-xs">v0.2 Lean</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-zinc-400 text-xs font-medium">Live</span>
        </div>
      </header>

      {/* Agent Status */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-400">Team Status</h2>
          <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
            {onlineCount}/{totalCount} online
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {agents.slice(0, 6).map((agent: any, i: number) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 p-3 sm:p-2 rounded-lg bg-zinc-900/50 active:bg-zinc-800 sm:hover:bg-zinc-900 transition-colors min-h-[52px]"
            >
              <div
                className={`w-4 h-4 sm:w-3 sm:h-3 rounded-full ${
                  agent.computedStatus === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                  agent.computedStatus === "busy" ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" :
                  "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                }`}
              />
              <span className="text-[11px] sm:text-[10px] font-medium text-zinc-300 truncate w-full text-center">
                {agent.name || "?"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-xl p-5 sm:p-4 border border-zinc-800 active:border-zinc-700 transition-colors">
          <div className="text-4xl sm:text-3xl font-bold text-white">{activities.length}</div>
          <div className="text-zinc-500 text-sm sm:text-xs uppercase tracking-wide mt-1">Activities</div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 rounded-xl p-5 sm:p-4 border border-zinc-800 active:border-zinc-700 transition-colors">
          <div className="text-4xl sm:text-3xl font-bold text-green-400">{onlineCount}</div>
          <div className="text-zinc-500 text-sm sm:text-xs uppercase tracking-wide mt-1">Online</div>
        </div>
      </section>

      {/* Alerts - Only show if agents offline */}
      {onlineCount < totalCount && (
        <section className="mb-6">
          <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-4 min-h-[56px]">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-semibold text-base sm:text-sm">
                {totalCount - onlineCount} agent{totalCount - onlineCount > 1 ? 's' : ''} offline
              </span>
            </div>
            <div className="text-red-300/60 text-sm sm:text-xs mt-2 pl-6">
              {agents
                .filter((a: any) => a.computedStatus !== "online")
                .map((a: any) => a.name)
                .join(", ")}
            </div>
          </div>
        </section>
      )}

      {/* Live Activity */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-400">Live Activity</h2>
          <span className="text-[10px] text-zinc-600">{activities.length} events</span>
        </div>
        <div className="space-y-2">
          {activities.slice(0, 10).map((activity: any, i: number) => (
            <div
              key={i}
              className="bg-zinc-900/50 active:bg-zinc-800 sm:hover:bg-zinc-900 rounded-lg p-4 sm:p-3 flex items-start gap-3 transition-colors border border-transparent sm:hover:border-zinc-800 min-h-[56px]"
            >
              <div className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full mt-1 shrink-0 ${
                activity.eventType === "channel_message" ? "bg-blue-500" :
                activity.eventType === "dm_sent" ? "bg-purple-500" :
                activity.eventType === "task_completed" ? "bg-green-500" :
                "bg-zinc-600"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm sm:text-xs text-zinc-200">
                    {activity.agentName || "System"}
                  </span>
                  <span className="text-zinc-600 text-xs sm:text-[10px]">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                <div className="text-zinc-400 text-sm sm:text-xs line-clamp-2 sm:truncate mt-0.5">
                  {activity.description || activity.title || "Activity"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 pt-4 pb-6 border-t border-zinc-800/50 text-center">
        <span className="text-zinc-700 text-xs sm:text-[10px] tracking-wider uppercase">
          EVOX Mission Control v0.2
        </span>
      </footer>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
