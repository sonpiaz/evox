import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clipboard, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "mention" | "assignment" | "status_change";

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  agentName: string;
  agentAvatar: string;
  title: string;
  timestamp: Date;
  isUnread: boolean;
  onClick?: () => void;
}

const typeIcons = {
  mention: MessageSquare,
  assignment: Clipboard,
  status_change: RefreshCw,
};

const typeColors = {
  mention: "text-blue-500",
  assignment: "text-green-500",
  status_change: "text-yellow-500",
};

export function NotificationItem({
  type,
  agentName,
  agentAvatar,
  title,
  timestamp,
  isUnread,
  onClick,
}: NotificationItemProps) {
  const Icon = typeIcons[type];

  const formatTime = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-zinc-800/50",
        isUnread && "bg-zinc-800"
      )}
    >
      {/* Unread dot */}
      {isUnread && (
        <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
      )}
      {!isUnread && <div className="mt-1 h-2 w-2 flex-shrink-0" />}

      {/* Avatar */}
      <Avatar className="h-8 w-8 border border-zinc-800">
        <AvatarFallback className="bg-zinc-800 text-xs text-zinc-50">
          {agentAvatar}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <p className="text-sm text-zinc-300">{title}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Icon className={cn("h-3 w-3", typeColors[type])} />
          <span>{formatTime(timestamp)}</span>
        </div>
      </div>
    </button>
  );
}
