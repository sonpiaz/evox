"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { NotificationPanel } from "@/components/notification-panel";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "mention" | "assignment" | "status_change";
  agentName: string;
  agentAvatar: string;
  title: string;
  timestamp: Date;
  isUnread: boolean;
}

interface NotificationBellProps {
  notifications?: Notification[];
  onMarkAllRead?: () => void;
  onNotificationClick?: (id: string) => void;
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "mention",
    agentName: "Sam",
    agentAvatar: "SM",
    title: "Sam mentioned you in AGT-70",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isUnread: true,
  },
  {
    id: "2",
    type: "assignment",
    agentName: "Max",
    agentAvatar: "MX",
    title: "Max assigned you to AGT-73",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isUnread: true,
  },
  {
    id: "3",
    type: "status_change",
    agentName: "Leo",
    agentAvatar: "LO",
    title: "AGT-69 status changed to Done",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isUnread: false,
  },
];

export function NotificationBell({
  notifications = mockNotifications,
  onMarkAllRead,
  onNotificationClick,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        buttonRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-50"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2"
        >
          <NotificationPanel
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onNotificationClick={(id) => {
              onNotificationClick?.(id);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
