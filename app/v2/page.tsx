"use client";

/**
 * Dashboard v0.2 - Minimal, Lean
 *
 * Only 3 things:
 * 1. Agent status (dots)
 * 2. Activity feed (commits, completions)
 * 3. Core metrics (done, cost)
 *
 * No fluff. No complexity.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";

// Types
type Agent = {
  _id: string;
  name: string;
  avatar?: string;
  status?: string;
  lastSeen?: number;
  lastHeartbeat?: number;
};

type Task = {
  _id: string;
  status?: string;
  completedAt?: number;
};

type GitCommit = {
  _id: string;
  shortHash?: string;
  message?: string;
  agentName?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  pushedAt?: number;
};

type ActivityEvent = {
  _id: string;
  eventType?: string;
  agentName?: string;
  linearIdentifier?: string;
  description?: string;
  timestamp?: number;
};

export default function DashboardV2() {
  const agents = useQuery(api.agents.list) as Agent[] | undefined;
  const tasks = useQuery(api.tasks.list, { limit: 200 }) as Task[] | undefined;
  const commits = useQuery(api.gitActivity.getRecent, { limit: 8 }) as GitCommit[] | undefined;
  const activities = useQuery(api.activityEvents.list, { limit: 10 }) as ActivityEvent[] | undefined;

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!agents || !tasks) return { online: 0, total: 0, done: 0, cost: 0 };

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const online = agents.filter((a) => {
      const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
      const status = a.status?.toLowerCase() || "offline";
      return (status === "online" || status === "busy") && now - lastSeen < 5 * 60 * 1000;
    }).length;

    const done = tasks.filter(
      (t) => t.status?.toLowerCase() === "done" && t.completedAt && t.completedAt >= todayStart
    ).length;

    return { online, total: agents.length, done, cost: 0 };
  }, [agents, tasks]);

  // Merge activity feed
  const feed = useMemo(() => {
    type FeedItem = {
      id: string;
      agent: string;
      action: string;
      detail: string;
      meta?: string;
      timestamp: number;
      isCommit: boolean;
    };

    const items: FeedItem[] = [];

    // Add commits
    commits?.forEach((c) => {
      const meta = [];
      if (c.filesChanged) meta.push(`${c.filesChanged}f`);
      if (c.additions) meta.push(`+${c.additions}`);
      if (c.deletions) meta.push(`-${c.deletions}`);

      items.push({
        id: c._id,
        agent: c.agentName?.toUpperCase() || "?",
        action: "shipped",
        detail: c.message?.split("\n")[0]?.slice(0, 40) || c.shortHash || "",
        meta: meta.join(" "),
        timestamp: c.pushedAt || 0,
        isCommit: true,
      });
    });

    // Add completions only
    activities
      ?.filter((a) => {
        const t = a.eventType?.toLowerCase() || "";
        return t.includes("completed") || t.includes("deploy");
      })
      .forEach((a) => {
        items.push({
          id: a._id,
          agent: a.agentName?.toUpperCase() || "?",
          action: a.eventType?.includes("deploy") ? "deployed" : "done",
          detail: a.linearIdentifier || a.description?.slice(0, 30) || "",
          timestamp: a.timestamp || 0,
          isCommit: false,
        });
      });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [commits, activities]);

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header: Metrics */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
        {/* Agent dots */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {agents?.map((a) => {
              const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
              const status = a.status?.toLowerCase() || "offline";
              const isOnline =
                (status === "online" || status === "busy") &&
                Date.now() - lastSeen < 5 * 60 * 1000;

              return (
                <div
                  key={a._id}
                  className={cn(
                    "w-3 h-3 rounded-full",
                    isOnline ? "bg-green-500" : "bg-zinc-700"
                  )}
                  title={`${a.name}: ${isOnline ? "online" : "offline"}`}
                />
              );
            })}
          </div>
          <span className="text-sm text-zinc-500">
            {metrics.online}/{metrics.total}
          </span>
        </div>

        {/* Core metrics */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-emerald-400 font-bold text-lg">{metrics.done}</span>
            <span className="text-zinc-500 ml-1">done</span>
          </div>
        </div>
      </header>

      {/* Agent Status */}
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Agents</h2>
        <div className="flex flex-wrap gap-2">
          {agents?.map((a) => {
            const lastSeen = a.lastSeen || a.lastHeartbeat || 0;
            const status = a.status?.toLowerCase() || "offline";
            const isOnline =
              (status === "online" || status === "busy") &&
              Date.now() - lastSeen < 5 * 60 * 1000;

            return (
              <div
                key={a._id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded border",
                  isOnline
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-zinc-800 bg-zinc-900/50 opacity-50"
                )}
              >
                <span>{a.avatar || "?"}</span>
                <span className="text-sm font-medium">{a.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Activity Feed */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-zinc-600 mb-2">Activity</h2>
        <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
          {feed.length === 0 ? (
            <div className="p-4 text-center text-zinc-600">No activity</div>
          ) : (
            feed.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  item.isCommit && "bg-zinc-900/50"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold w-4",
                    item.isCommit ? "text-emerald-400" : "text-blue-400"
                  )}
                >
                  {item.isCommit ? "!" : "+"}
                </span>
                <span className="text-xs font-semibold w-12 truncate">{item.agent}</span>
                <span
                  className={cn(
                    "text-xs",
                    item.isCommit ? "text-emerald-400" : "text-blue-400"
                  )}
                >
                  {item.action}
                </span>
                <span className="text-xs text-zinc-400 flex-1 truncate">{item.detail}</span>
                {item.meta && (
                  <span className="text-[10px] font-mono text-zinc-600">{item.meta}</span>
                )}
                <span className="text-[10px] text-zinc-700">
                  {formatDistanceToNow(item.timestamp, { addSuffix: false })}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
