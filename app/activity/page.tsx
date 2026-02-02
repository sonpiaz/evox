"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActivityFeed } from "@/components/activity-feed";
import { normalizeActivities } from "@/lib/activity-utils";

export default function ActivityPage() {
  // AGT-137: Unified activity feed from activityEvents (single table)
  const activities = useQuery(api.activityEvents.listWithAgents, { limit: 50 });
  const displayActivities = normalizeActivities(activities);

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
