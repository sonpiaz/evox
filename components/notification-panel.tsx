"use client";

import { NotificationItem, type NotificationType } from "@/components/notification-item";

/** AGT-116: Single notification row from Convex */
export interface DashboardNotification {
  _id: string;
  type: string;
  title: string;
  message?: string;
  read: boolean;
  createdAt: number;
  taskSummary?: {
    id: string;
    title?: string;
    linearIdentifier?: string;
    linearUrl?: string;
    status?: string;
    priority?: string;
  } | null;
}

/** AGT-116: Group by agent — "Sam (3 unread)", "Leo (1 unread)" */
export interface NotificationGroupByAgent {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  unreadCount: number;
  notifications: DashboardNotification[];
}

interface NotificationPanelProps {
  byAgent: NotificationGroupByAgent[];
  onMarkAllReadForAgent?: (agentId: string) => void;
  onNotificationClick?: (notificationId: string, taskSummary?: DashboardNotification["taskSummary"]) => void;
}

export function NotificationPanel({
  byAgent,
  onMarkAllReadForAgent,
  onNotificationClick,
}: NotificationPanelProps) {
  return (
    <div className="w-80 rounded-lg border border-border-default bg-surface-1 shadow-xl">
      <div className="border-b border-border-default p-3">
        <h3 className="font-semibold text-primary">Notifications</h3>
      </div>
      <div className="max-h-[480px] overflow-y-auto">
        {byAgent.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-primary0">No notifications</p>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {byAgent.map((group) => (
              <div key={group.agentId}>
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-semibold text-secondary">
                    {group.agentName}
                    {group.unreadCount > 0 && (
                      <span className="ml-1.5 text-blue-400">({group.unreadCount} unread)</span>
                    )}
                  </span>
                  {group.unreadCount > 0 && onMarkAllReadForAgent && (
                    <button
                      type="button"
                      onClick={() => onMarkAllReadForAgent(group.agentId)}
                      className="text-[10px] text-blue-500 hover:text-blue-400"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="space-y-0.5">
                  {group.notifications.map((n) => (
                    <NotificationItem
                      key={n._id}
                      id={n._id}
                      type={(n.type as NotificationType) ?? "comment"}
                      agentName={group.agentName}
                      agentAvatar={group.agentAvatar}
                      title={n.title}
                      timestamp={n.createdAt}
                      isUnread={!n.read}
                      taskSummary={n.taskSummary}
                      onClick={() => onNotificationClick?.(n._id, n.taskSummary)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
