"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AgentStatusIndicator } from "@/components/evox/AgentStatusIndicator";

type AgentStatus = "online" | "idle" | "offline" | "busy";

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 w-full items-center gap-3 border-b border-border-default px-4 py-3 text-left transition-colors",
        isSelected
          ? "border-l-2 border-l-white bg-surface-4 text-primary"
          : "hover:bg-surface-1 text-secondary"
      )}
    >
      <AgentStatusIndicator status={status} size="sm" />
      <Avatar className="h-5 w-5 shrink-0 border border-border-default">
        <AvatarFallback className="bg-surface-1 text-[10px] text-secondary">{avatar}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{name}</p>
      </div>
      <span className="shrink-0 rounded-[10px] border border-border-default bg-surface-1 px-2 py-0.5 text-[11px] text-secondary">
        {roleLabels[role] ?? role}
      </span>
    </button>
  );
}
