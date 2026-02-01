"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  _id: string;
  agent: {
    name: string;
    avatar: string;
    role: "pm" | "backend" | "frontend";
    status: "online" | "idle" | "offline";
  } | null;
  action: string;
  target: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const actionLabels: Record<string, string> = {
  created_task: "created task",
  updated_task: "updated task",
  updated_task_status: "changed status",
  assigned_task: "assigned task",
  deleted_task: "deleted task",
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  // Limit to 20 items
  const displayActivities = activities.slice(0, 20);

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <CardTitle className="text-zinc-50">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto">
          <div className="relative space-y-6">
            {/* Timeline line */}
            {displayActivities.length > 0 && (
              <div className="absolute left-4 top-6 bottom-6 w-px bg-zinc-800" />
            )}

            {displayActivities.length === 0 ? (
              <p className="text-sm text-zinc-500">No recent activity</p>
            ) : (
              displayActivities.map((activity, index) => (
                <div key={activity._id} className="relative flex gap-4">
                  {/* Avatar with timeline dot */}
                  <div className="relative z-10">
                    <Avatar className="h-8 w-8 border-2 border-zinc-900 bg-zinc-800">
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-50">
                        {activity.agent?.avatar || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 pb-2">
                    <p className="text-sm text-zinc-300">
                      <span className="font-medium text-zinc-50">
                        {activity.agent?.name || "Unknown"}
                      </span>{" "}
                      {actionLabels[activity.action] || activity.action}
                      {activity.target && (
                        <>
                          {" "}
                          <span className="text-zinc-500">{activity.target}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
