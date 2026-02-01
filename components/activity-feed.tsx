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
    status: "online" | "idle" | "offline" | "busy";
  } | null;
  action: string;
  target: string;
  /** Resolved task display: linearIdentifier + title when target is a task (AGT-99) */
  targetDisplay?: string;
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
  const safeActivities = Array.isArray(activities) ? activities : [];
  const displayActivities = safeActivities.slice(0, 20);

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
                <div key={activity._id ?? `activity-${index}`} className="relative flex gap-4">
                  {/* Avatar with timeline dot */}
                  <div className="relative z-10">
                    <Avatar className="h-8 w-8 border-2 border-zinc-900 bg-zinc-800">
                      <AvatarFallback className="bg-zinc-800 text-xs text-zinc-50">
                        {typeof activity.agent === "object" && activity.agent !== null && "avatar" in activity.agent
                          ? (activity.agent as { avatar?: string }).avatar ?? "?"
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Activity content — always show agent NAME never agent ID (Phase 0 bug 1) */}
                  <div className="flex-1 pb-2">
                    <p className="text-sm text-zinc-300">
                      <span className="font-medium text-zinc-50">
                        {typeof activity.agent === "object" && activity.agent !== null && "name" in activity.agent
                          ? (activity.agent as { name?: string }).name ?? "Unknown"
                          : "Unknown"}
                      </span>{" "}
                      {actionLabels[activity.action] || activity.action}
                      {(() => {
                        const raw = activity.target;
                        const looksLikeConvexId =
                          typeof raw === "string" &&
                          raw.length >= 26 &&
                          /^[a-z0-9]+$/i.test(raw);
                        const display =
                          activity.targetDisplay && activity.targetDisplay.length > 0
                            ? activity.targetDisplay
                            : looksLikeConvexId
                              ? "—"
                              : raw;
                        return display ? (
                          <>
                            {" "}
                            <span className="text-zinc-500">{display}</span>
                          </>
                        ) : null;
                      })()}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDistanceToNow(Number(activity.createdAt) || 0, { addSuffix: true })}
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
