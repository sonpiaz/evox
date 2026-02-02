"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

// AGT-137: New unified activityEvents schema
interface ActivityEvent {
  _id: string;
  agentId: string;
  agentName: string;
  agent?: {
    name: string;
    avatar: string;
    role: "pm" | "backend" | "frontend";
    status: "online" | "idle" | "offline" | "busy";
  } | null;
  category: "task" | "git" | "deploy" | "system" | "message";
  eventType: string;
  title: string;
  description?: string;
  taskId?: string;
  linearIdentifier?: string;
  projectId?: string;
  metadata?: {
    fromStatus?: string;
    toStatus?: string;
    commitHash?: string;
    branch?: string;
    filesChanged?: string[];
    deploymentUrl?: string;
    deploymentStatus?: string;
    errorMessage?: string;
    source?: string;
  };
  timestamp: number;
}

// AGT-140: Accept normalized shape so feed never crashes on backend shape mismatch
interface ActivityFeedProps {
  activities: ActivityEvent[] | Array<Record<string, unknown>>;
}

// AGT-137: Event type labels for display
const eventTypeLabels: Record<string, string> = {
  created: "created",
  status_change: "moved",
  assigned: "assigned",
  updated: "updated",
  deleted: "deleted",
  completed: "completed",
  started: "started",
  commented: "commented on",
  push: "pushed",
  pr_opened: "opened PR",
  pr_merged: "merged PR",
  deploy_success: "deployed",
  deploy_failed: "deployment failed",
  sync_completed: "synced",
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
              displayActivities.map((activity, index) => {
                const ts = typeof activity.timestamp === "number" ? activity.timestamp : 0;
                const key = activity._id && String(activity._id).length > 0 ? String(activity._id) : `activity-${index}`;
                const agent = activity.agent as { name?: string; avatar?: string } | null | undefined;
                const agentName = String(agent?.name ?? activity.agentName ?? "Unknown");
                const avatar = agent?.avatar ?? (typeof activity.agentName === "string" ? activity.agentName.charAt(0).toUpperCase() : "?");
                return (
                  <div key={key} className="relative flex gap-4">
                    <div className="relative z-10">
                      <Avatar className="h-8 w-8 border-2 border-zinc-900 bg-zinc-800">
                        <AvatarFallback className="bg-zinc-800 text-xs text-zinc-50">
                          {avatar}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm text-zinc-300">
                        <span className="font-medium text-zinc-50">{agentName}</span>{" "}
                        {eventTypeLabels[String(activity.eventType ?? "")] ?? String(activity.eventType ?? "")}
                        {typeof activity.linearIdentifier === "string" && activity.linearIdentifier.length > 0 && (
                          <>
                            {" "}
                            <span className="text-zinc-500">{activity.linearIdentifier}</span>
                          </>
                        )}
                        {(activity.metadata as { toStatus?: string })?.toStatus && (
                          <>
                            {" → "}
                            <span className="text-zinc-400">{(activity.metadata as { toStatus?: string }).toStatus}</span>
                          </>
                        )}
                      </p>
                      {activity.description != null && activity.description !== "" && (
                        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{String(activity.description)}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-600">
                        {formatDistanceToNow(ts, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
