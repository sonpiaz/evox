"use client";

/**
 * SimpleCEODashboard — Mobile-first, 3-second glance
 * 
 * Shows ONLY what CEO needs:
 * 1. Team Status (who's online/working)
 * 2. Today's Progress (tasks done, cost)
 * 3. Alerts (if any problems)
 * 4. Live Activity Feed
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, startOfDay, endOfDay } from "date-fns";

// Types
type AgentDoc = {
  _id: string;
  name: string;
  status: string;
  lastHeartbeat?: number;
  lastSeen?: number;
};

type TaskDoc = {
  _id: string;
  status: string;
  title: string;
  agentName?: string;
  completedAt?: number;
};

type ActivityEvent = {
  _id: string;
  agentName: string;
  description: string;
  timestamp: number;
};

type Message = {
  _id: string;
  from: string;
  message: string;
  createdAt: number;
  channel?: string;
};

// Agent status dot
function StatusDot({ isOnline, name }: { isOnline: boolean; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "w-3 h-3 rounded-full",
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
        )}
        title={`${name}: ${isOnline ? "Online" : "Offline"}`}
      />
      <span className="text-[10px] text-zinc-500 uppercase">{name.slice(0, 3)}</span>
    </div>
  );
}

// Alert badge
function Alert({ text, type }: { text: string; type: "critical" | "warning" | "info" }) {
  const colors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    info: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className={cn("px-3 py-2 rounded-lg border text-sm", colors[type])}>
      {text}
    </div>
  );
}

// Activity item
function ActivityItem({ agent, action, time }: { agent: string; action: string; time: number }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-zinc-800 last:border-0">
      <span className="text-xs font-bold text-blue-400 uppercase w-12 shrink-0">{agent}</span>
      <span className="text-sm text-zinc-300 flex-1">{action}</span>
      <span className="text-xs text-zinc-600 shrink-0">
        {formatDistanceToNow(time, { addSuffix: false })}
      </span>
    </div>
  );
}

export function SimpleCEODashboard() {
  const now = Date.now();
  const todayStart = startOfDay(new Date()).getTime();
  const todayEnd = endOfDay(new Date()).getTime();

  // Queries
  const agents = useQuery(api.agents.list) as AgentDoc[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 100 }) as TaskDoc[] | undefined;
  const stats = useQuery(api.dashboard.getStats, { startTs: todayStart, endTs: todayEnd });
  const activity = useQuery(api.activityEvents.list, { limit: 10 }) as ActivityEvent[] | undefined;
  const messages = useQuery(api.messages.getChannelMessages, { channel: "dev", limit: 10 }) as Message[] | undefined;

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!agents || !tasks) {
      return { online: 0, total: 0, done: 0, inProgress: 0, cost: 0 };
    }

    const online = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      return (now - lastSeen < 5 * 60 * 1000) && 
             (a.status?.toLowerCase() === "online" || a.status?.toLowerCase() === "busy");
    }).length;

    const done = stats?.taskCounts?.done || 0;
    const inProgress = (stats?.taskCounts?.inProgress || 0) + (stats?.taskCounts?.review || 0);

    return {
      online,
      total: agents.length,
      done,
      inProgress,
      cost: 0, // TODO: Get from performance metrics
    };
  }, [agents, tasks, stats, now]);

  // Get alerts
  const alerts = useMemo(() => {
    const items: Array<{ text: string; type: "critical" | "warning" | "info" }> = [];

    if (!agents) return items;

    const offlineCount = agents.filter(a => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      return (now - lastSeen > 10 * 60 * 1000);
    }).length;

    if (offlineCount > 0) {
      items.push({
        text: `⚠️ ${offlineCount} agent${offlineCount > 1 ? "s" : ""} offline`,
        type: offlineCount > 2 ? "critical" : "warning",
      });
    }

    if (items.length === 0) {
      items.push({ text: "✅ All systems operational", type: "info" });
    }

    return items;
  }, [agents, now]);

  // Merge activity and messages into unified feed
  const feed = useMemo(() => {
    const items: Array<{ agent: string; action: string; time: number }> = [];

    // Add activity events
    if (activity) {
      activity.forEach(e => {
        items.push({
          agent: e.agentName,
          action: e.description,
          time: e.timestamp,
        });
      });
    }

    // Add channel messages
    if (messages) {
      messages.forEach(m => {
        items.push({
          agent: m.from,
          action: m.message.slice(0, 100) + (m.message.length > 100 ? "..." : ""),
          time: m.createdAt,
        });
      });
    }

    // Sort by time, newest first
    return items.sort((a, b) => b.time - a.time).slice(0, 15);
  }, [activity, messages]);

  // Loading state
  if (!agents) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header: Team Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">EVOX Command</h1>
          <span className="text-sm text-zinc-500">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
        
        {/* Agent dots */}
        <div className="flex items-center gap-4 p-3 bg-zinc-900 rounded-lg overflow-x-auto">
          {agents.map(agent => {
            const lastSeen = agent.lastSeen || agent.lastHeartbeat || 0;
            const isOnline = (now - lastSeen < 5 * 60 * 1000) && 
                            (agent.status?.toLowerCase() === "online" || agent.status?.toLowerCase() === "busy");
            return <StatusDot key={agent._id} name={agent.name} isOnline={isOnline} />;
          })}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-emerald-400">{metrics.online}/{metrics.total}</div>
          <div className="text-xs text-zinc-500 uppercase mt-1">Online</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{metrics.done}</div>
          <div className="text-xs text-zinc-500 uppercase mt-1">Done Today</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{metrics.inProgress}</div>
          <div className="text-xs text-zinc-500 uppercase mt-1">In Progress</div>
        </div>
      </div>

      {/* Alerts */}
      <div className="mb-6 space-y-2">
        {alerts.map((alert, i) => (
          <Alert key={i} text={alert.text} type={alert.type} />
        ))}
      </div>

      {/* Live Feed */}
      <div className="bg-zinc-900 rounded-lg p-4">
        <h2 className="text-sm font-bold uppercase text-zinc-500 mb-3">Live Activity</h2>
        <div className="space-y-0 max-h-[50vh] overflow-y-auto">
          {feed.length > 0 ? (
            feed.map((item, i) => (
              <ActivityItem key={i} agent={item.agent} action={item.action} time={item.time} />
            ))
          ) : (
            <div className="text-zinc-600 text-center py-8">No recent activity</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-3">
        <a
          href="/messages"
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-center py-3 rounded-lg text-sm font-medium transition"
        >
          💬 Messages
        </a>
        <a
          href="/tasks"
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-center py-3 rounded-lg text-sm font-medium transition"
        >
          📋 Tasks
        </a>
        <a
          href="/"
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-center py-3 rounded-lg text-sm font-medium transition"
        >
          📊 Full Dashboard
        </a>
      </div>
    </div>
  );
}

export default SimpleCEODashboard;
