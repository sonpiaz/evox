"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActivityFeed } from "@/components/activity-feed";
import { normalizeActivities } from "@/lib/activity-utils";

export function LiveFeed() {
  const raw = useQuery(api.activityEvents.list, { limit: 20 });
  const activities = normalizeActivities(raw ?? []);

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">Live Feed</h3>
      <ActivityFeed activities={activities} />
    </div>
  );
}
