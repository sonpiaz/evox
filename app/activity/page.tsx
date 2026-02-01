"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActivityFeed } from "@/components/activity-feed";

export default function ActivityPage() {
  const activities = useQuery(api.activities.listWithAgents, { limit: 50 });
  const displayActivities = Array.isArray(activities) ? activities : [];

  return (
    <div className="h-full bg-black p-8">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold text-zinc-50">Activity</h1>
        <p className="text-sm text-zinc-500">System-wide activity feed (no raw Convex IDs)</p>
      </div>
      <div className="mt-8">
        <ActivityFeed activities={displayActivities} />
      </div>
    </div>
  );
}
