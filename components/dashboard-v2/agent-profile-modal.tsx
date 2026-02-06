"use client";

import { useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AgentProfile } from "./agent-profile";
import { AgentStatusIndicator } from "@/components/evox/AgentStatusIndicator";

interface AgentProfileModalProps {
  open: boolean;
  agentId: Id<"agents"> | null;
  name: string;
  role: string;
  status: string;
  avatar: string;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  pm: "PM",
  backend: "Backend",
  frontend: "Frontend",
  qa: "QA",
  design: "Design",
};

/** AGT-181: Agent Profile Modal — opens on sidebar agent click, matches Settings modal style */
export function AgentProfileModal({
  open,
  agentId,
  name,
  role,
  status,
  avatar,
  onClose,
}: AgentProfileModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open || !agentId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-surface-1 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Agent emoji + name + role + status — AGT-245 Brutal */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-base">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-white/[0.08]">
              <AvatarFallback className="bg-surface-1 text-base font-bold text-primary">{avatar}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-primary">{name}</p>
                <AgentStatusIndicator status={status} size="md" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary0">{roleLabels[role] ?? role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/40 transition-colors hover:text-white/90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {/* Agent Profile content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AgentProfile
            agentId={agentId}
            name={name}
            role={role}
            status={status}
            avatar={avatar}
            onClose={onClose}
            embedded
          />
        </div>
      </div>
    </div>
  );
}
