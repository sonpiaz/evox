"use client";

import { Bell } from "lucide-react";

/** AGT-181: Bell icon opens Activity drawer. Badge shows total unread count. */
interface NotificationBellProps {
  totalUnread: number;
  onBellClick?: () => void;
}

export function NotificationBell({
  totalUnread = 0,
  onBellClick,
}: NotificationBellProps) {
  return (
    <button
      onClick={onBellClick}
      className="relative rounded-lg p-2 text-primary0 transition-colors hover:bg-surface-4 hover:text-primary"
      aria-label="Open Activity"
    >
      <Bell className="h-5 w-5" />
      {totalUnread > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </button>
  );
}
