import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  agentName: string;
  agentAvatar: string;
  agentColor: "blue" | "green" | "purple";
  content: string;
  timestamp: Date;
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export function MessageBubble({
  agentName,
  agentAvatar,
  agentColor,
  content,
  timestamp,
}: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    const now = new Date().getTime();
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
    <div className="flex gap-3">
      <Avatar className={cn("h-8 w-8 border-2 border-border-default", colorClasses[agentColor])}>
        <AvatarFallback className={cn("text-xs text-white", colorClasses[agentColor])}>
          {agentAvatar}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-primary">{agentName}</span>
          <span className="text-xs text-tertiary">{formatTime(timestamp)}</span>
        </div>
        <p className="text-sm text-primary whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
