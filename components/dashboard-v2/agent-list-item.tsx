"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type AgentStatus = "online" | "idle" | "offline" | "busy";

const statusDotColors: Record<AgentStatus, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
};

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
};

interface AgentListItemProps {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  avatar: string;
  isSelected?: boolean;
  onClick?: () => void;
}


export function AgentListItem({ name, role, status, avatar, isSelected, onClick }: AgentListItemProps) {
  const normalizedStatus = (status?.toLowerCase?.() ?? "offline") as AgentStatus;
  const dotColor = statusDotColors[normalizedStatus] ?? statusDotColors.offline;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        isSelected ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9 border-2 border-gray-800">
          <AvatarFallback className="bg-zinc-800 text-xs text-zinc-50">{avatar}</AvatarFallback>
        </Avatar>
        <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a]", dotColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-gray-500">{roleLabels[role] ?? role}</p>
      </div>
    </button>
  );
}
