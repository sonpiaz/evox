"use client";

import { useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AgentProfile } from "./agent-profile";
import { cn } from "@/lib/utils";

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
};

const statusDot: Record<string, string> = {
  online: "bg-green-500",
  busy: "bg-yellow-500",
  idle: "bg-gray-500",
  offline: "bg-gray-500",
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

  const dot = statusDot[status?.toLowerCase() ?? "offline"] ?? statusDot.offline;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a2e] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Agent emoji + name + role + status */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-white/[0.08]">
              <AvatarFallback className="bg-[#111] text-sm text-zinc-50">{avatar}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-zinc-50">{name}</p>
                <span className={cn("h-2 w-2 shrink-0 rounded-full", dot)} aria-hidden />
              </div>
              <p className="text-xs text-zinc-400">{roleLabels[role] ?? role}</p>
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
