"use client";

/**
 * ActivityFeed - Last 10 activities
 * Shows: Commits, task completions, relative timestamps
 */

interface Activity {
  id: string;
  agentName?: string;
  eventType?: string;
  description?: string;
  title?: string;
  timestamp: number;
}

interface ActivityFeedProps {
  activities: Activity[];
  limit?: number;
}

const eventColors: Record<string, string> = {
  channel_message: "bg-blue-500",
  dm_sent: "bg-purple-500",
  dm_received: "bg-blue-500",
  dm_read: "bg-gray-500",
  dm_replied: "bg-cyan-500",
  task_completed: "bg-green-500",
  commit: "bg-emerald-500",
  push: "bg-emerald-500",
  pr_merged: "bg-purple-500",
  deploy: "bg-green-500",
};

const eventIcons: Record<string, string> = {
  dm_sent: "\u{1F4E8}",
  dm_received: "\u{1F4EC}",
  dm_read: "\u{1F441}\uFE0F",
  dm_replied: "\u{21A9}\uFE0F",
};

function getEventIcon(eventType?: string): string | null {
  if (!eventType) return null;
  const type = eventType.toLowerCase();
  for (const [key, icon] of Object.entries(eventIcons)) {
    if (type.includes(key)) return icon;
  }
  return null;
}

function getEventColor(eventType?: string): string {
  if (!eventType) return "bg-gray-600";
  const type = eventType.toLowerCase();
  for (const [key, color] of Object.entries(eventColors)) {
    if (type.includes(key)) return color;
  }
  return "bg-gray-600";
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ActivityFeed({ activities, limit = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, limit);

  if (displayActivities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-primary0">
        No recent activity
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-secondary">Live Activity</h2>
        <span className="text-[10px] text-tertiary">{activities.length} events</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayActivities.map((activity, i) => (
          <div
            key={activity.id || i}
            className="bg-surface-1/50 active:bg-surface-4 sm:hover:bg-surface-1 rounded-lg p-4 sm:p-3 flex items-start gap-3 transition-colors border border-transparent sm:hover:border-border-default min-h-[56px]"
          >
            {/* Event indicator: icon for DMs, dot for others */}
            {getEventIcon(activity.eventType) ? (
              <span className="text-sm sm:text-xs mt-0.5 shrink-0">{getEventIcon(activity.eventType)}</span>
            ) : (
              <div
                className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full mt-1 shrink-0 ${getEventColor(activity.eventType)}`}
              />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm sm:text-xs text-primary">
                  {activity.agentName || "System"}
                </span>
                <span className="text-tertiary text-xs sm:text-[10px]">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
              <div className="text-secondary text-sm sm:text-xs line-clamp-2 sm:truncate mt-0.5">
                {activity.description || activity.title || "Activity"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
