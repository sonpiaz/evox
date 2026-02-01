"use client";

import { NotificationItem } from "@/components/notification-item";

interface Notification {
  id: string;
  type: "mention" | "assignment" | "status_change";
  agentName: string;
  agentAvatar: string;
  title: string;
  timestamp: Date;
  isUnread: boolean;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAllRead?: () => void;
  onNotificationClick?: (id: string) => void;
}

export function NotificationPanel({
  notifications,
  onMarkAllRead,
  onNotificationClick,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="w-80 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <h3 className="font-semibold text-zinc-50">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-blue-500 hover:text-blue-400"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[480px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-600">No notifications</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                {...notification}
                onClick={() => onNotificationClick?.(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
