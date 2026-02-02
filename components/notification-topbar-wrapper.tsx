"use client";

import { Component, type ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TopBar } from "@/components/dashboard-v2/top-bar";
import type { KanbanTask } from "@/components/dashboard-v2/task-card";

/** Error boundary: when notifications query fails (e.g. listAllForDashboard not deployed), render TopBar with empty notifications */
class NotificationTopBarErrorBoundary extends Component<
  {
    fallback: ReactNode;
    children: ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface NotificationTopBarWrapperProps {
  agentsActive?: number;
  tasksInQueue?: number;
  inProgress?: number;
  doneToday?: number;
  totalTasks?: number;
  onSettingsClick?: () => void;
  onBellClick?: () => void;
  onNotificationClick?: (notificationId: string, taskSummary?: { id: string; title?: string; linearIdentifier?: string; linearUrl?: string; status?: string; priority?: string } | null) => void;
}

/** Fetches notifications and renders TopBar. Isolated so missing listAllForDashboard doesn't crash the page. */
function NotificationTopBarInner({
  agentsActive = 0,
  tasksInQueue = 0,
  inProgress = 0,
  doneToday = 0,
  totalTasks = 0,
  onSettingsClick,
  onBellClick,
  onNotificationClick,
}: NotificationTopBarWrapperProps) {
  const dashboardNotifications = useQuery(api.notifications.listAllForDashboard);
  const markNotificationAsRead = useMutation(api.notifications.markAsRead);

  const notificationTotalUnread = dashboardNotifications?.totalUnread ?? 0;

  return (
    <TopBar
      agentsActive={agentsActive}
      tasksInQueue={tasksInQueue}
      inProgress={inProgress}
      doneToday={doneToday}
      totalTasks={totalTasks}
      onSettingsClick={onSettingsClick}
      notificationTotalUnread={notificationTotalUnread}
      onBellClick={onBellClick}
    />
  );
}

/** AGT-116: Wraps notification fetch in error boundary so missing Convex listAllForDashboard doesn't crash the app. */
export function NotificationTopBarWrapper(props: NotificationTopBarWrapperProps) {
  const fallback = (
    <TopBar
      agentsActive={props.agentsActive ?? 0}
      tasksInQueue={props.tasksInQueue ?? 0}
      inProgress={props.inProgress ?? 0}
      doneToday={props.doneToday ?? 0}
      totalTasks={props.totalTasks ?? 0}
      onSettingsClick={props.onSettingsClick}
      notificationTotalUnread={0}
      onBellClick={props.onBellClick}
    />
  );

  return (
    <NotificationTopBarErrorBoundary fallback={fallback}>
      <NotificationTopBarInner {...props} />
    </NotificationTopBarErrorBoundary>
  );
}
