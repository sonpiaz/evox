"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";

/**
 * LIVE Dashboard — Elon-style simplified view
 * Shows only what matters: Agents working in real-time
 */
export function LiveDashboard() {
  const agents = useQuery(api.agents.list);
  const recentActivity = useQuery(api.activityEvents.list, { limit: 10 });
  const doneTasks = useQuery(api.tasks.getByStatus, { status: "done" });
  const costData = useQuery(api.costs.getCostsByAgent, {});

  const activeAgents = agents?.filter(
    (a) => a.status?.toLowerCase() === "online" || a.status?.toLowerCase() === "busy"
  );

  const todayCompleted = doneTasks?.length ?? 0;
  const totalCost = costData?.totalCost ?? 0;

  return (
    <div className="min-h-screen bg-black p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">EVOX</h1>
        <p className="text-sm text-zinc-500">AI Agents at Work</p>
      </div>

      {/* Agent Cards */}
      <div className="mx-auto max-w-2xl space-y-4">
        {agents?.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="text-zinc-500">No agents configured</p>
          </div>
        )}

        {agents?.map((agent) => (
          <AgentLiveCard key={agent._id} agent={agent} />
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="mx-auto mt-8 max-w-2xl">
        <h2 className="mb-4 text-sm font-medium text-zinc-500">LIVE ACTIVITY</h2>
        <div className="space-y-2">
          {recentActivity?.slice(0, 5).map((event) => (
            <div
              key={event._id}
              className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm"
            >
              <span className="text-zinc-500">
                {formatDistanceToNow(event.timestamp, { addSuffix: true })}
              </span>
              <span className="text-zinc-400">{event.title}</span>
            </div>
          ))}
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="text-center text-sm text-zinc-600">No recent activity</p>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mx-auto mt-8 max-w-2xl border-t border-zinc-800 pt-6">
        <div className="flex justify-center gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{todayCompleted}</div>
            <div className="text-xs text-zinc-500">Tasks Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              ${totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-zinc-500">Total Cost</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {activeAgents?.length ?? 0}
            </div>
            <div className="text-xs text-zinc-500">Active Agents</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgentLiveCardProps {
  agent: {
    _id: string;
    name: string;
    role: string;
    status: string;
    statusReason?: string;
    currentTask?: string;
    lastHeartbeat?: number;
  };
}

function AgentLiveCard({ agent }: AgentLiveCardProps) {
  // AGT-285: Use consistent status colors per AGT-273
  const statusColors: Record<string, string> = {
    online: "bg-green-500",
    busy: "bg-yellow-500",
    idle: "bg-zinc-500",
    offline: "bg-red-500",
  };

  const status = agent.status?.toLowerCase() || "offline";
  const isActive = status === "online" || status === "busy";

  return (
    <div
      className={`rounded-lg border bg-zinc-900 p-4 transition-all ${
        isActive ? "border-green-500/30" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div
            className={`h-3 w-3 rounded-full ${statusColors[status] ?? "bg-gray-500"} ${
              isActive ? "animate-pulse" : ""
            }`}
          />

          {/* Name & Role */}
          <div>
            <div className="font-semibold text-white">{agent.name}</div>
            <div className="text-xs text-zinc-500">{agent.role}</div>
          </div>
        </div>

        {/* Status */}
        <div className="text-right">
          <div
            className={`text-sm ${isActive ? "text-green-400" : "text-zinc-500"}`}
          >
            {status.toUpperCase()}
          </div>
          {agent.statusReason && (
            <div className="text-xs text-zinc-500">{agent.statusReason}</div>
          )}
        </div>
      </div>

      {/* Progress bar simulation for active agents */}
      {isActive && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full animate-pulse rounded-full bg-green-500/50"
              style={{ width: "65%" }}
            />
          </div>
          {agent.currentTask && (
            <div className="mt-1 text-xs text-zinc-500">{agent.currentTask}</div>
          )}
        </div>
      )}

      {/* Last seen for offline */}
      {!isActive && agent.lastHeartbeat && (
        <div className="mt-2 text-xs text-zinc-600">
          Last seen {formatDistanceToNow(agent.lastHeartbeat, { addSuffix: true })}
        </div>
      )}
    </div>
  );
}
