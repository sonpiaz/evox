"use client";

import { Id } from "@/convex/_generated/dataModel";
import { AgentProfile } from "./agent-profile";
import { cn } from "@/lib/utils";

interface AgentDetailSlidePanelProps {
  open: boolean;
  agentId: Id<"agents"> | null;
  name: string;
  role: string;
  status: string;
  avatar: string;
  onClose: () => void;
}

/** AGT-170: Slide from right 420px, bg-surface, dim backdrop (opacity-50), 200ms ease-out, ✕ top-right. */
export function AgentDetailSlidePanel({
  open,
  agentId,
  name,
  role,
  status,
  avatar,
  onClose,
}: AgentDetailSlidePanelProps) {
  if (!agentId) return null;

  return (
    <>
      <div
        role="presentation"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ease-out",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[420px] shrink-0 border-l border-border-default bg-surface-1 shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-panel-title"
      >
        <div className="flex h-full flex-col min-h-0">
          <div className="flex shrink-0 items-center justify-end border-b border-border-default px-4 py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-primary0 transition-colors hover:bg-surface-4 hover:text-primary"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentProfile
              agentId={agentId}
              name={name}
              role={role}
              status={status}
              avatar={avatar}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}
