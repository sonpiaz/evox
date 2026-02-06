"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// AGT-137: Unified activityEvents schema
interface ActivityEvent {
  _id: string;
  agentId: string;
  agentName: string;
  agent?: { name?: string; avatar?: string } | null;
  eventType: string;
  title: string;
  linearIdentifier?: string;
  timestamp: number;
}

interface ActivityFeedProps {
  activities: ActivityEvent[] | Array<Record<string, unknown>>;
}

const eventTypeToVerb: Record<string, string> = {
  created: "created",
  status_change: "moved",
  assigned: "assigned",
  updated: "updated",
  deleted: "deleted",
  completed: "completed",
  started: "started",
  commented: "commented on",
  push: "pushed",
  pr_opened: "opened PR",
  pr_merged: "merged PR",
  deploy_success: "deployed",
  deploy_failed: "deployment failed",
  sync_completed: "synced",
};

/** AGT-180: Color-coded action verbs */
const verbColors: Record<string, string> = {
  completed: "text-emerald-400",
  created: "text-blue-400",
  moved: "text-yellow-400",
  assigned: "text-purple-400",
};

/** AGT-180: Agent avatar colors — MAX amber, SAM emerald, LEO blue */
function getAgentAvatarColor(agentName: string): string {
  const name = agentName.toLowerCase();
  if (name === "max") return "bg-amber-500/20 border-amber-500/30";
  if (name === "sam") return "bg-emerald-500/20 border-emerald-500/30";
  if (name === "leo") return "bg-blue-500/20 border-blue-500/30";
  return "bg-zinc-900 border-zinc-800";
}

/** AGT-163: Spec 5.5 — 40px row, ticket ID + title, no raw Convex IDs */
export function ActivityFeed({ activities }: ActivityFeedProps) {
  const safe = Array.isArray(activities) ? activities : [];
  const list = safe.slice(0, 20);

  if (list.length === 0) {
    return <p className="text-sm text-zinc-500">No recent activity</p>;
  }

  return (
    <ul className="space-y-0">
      {list.map((activity, index) => {
        const raw = activity as Record<string, unknown>;
        const ts = typeof raw.timestamp === "number" ? raw.timestamp : 0;
        const key = raw._id && String(raw._id).length > 0 ? String(raw._id) : `activity-${index}`;
        const agent = raw.agent as { name?: string; avatar?: string } | null | undefined;
        const agentName = String(agent?.name ?? raw.agentName ?? "Unknown");
        const avatar = agent?.avatar ?? (typeof raw.agentName === "string" ? String(raw.agentName).charAt(0).toUpperCase() : "?");
        const verb = eventTypeToVerb[String(raw.eventType ?? "")] ?? String(raw.eventType ?? "updated");
        const ticketId = typeof raw.linearIdentifier === "string" ? raw.linearIdentifier : "—";
        const title = typeof raw.title === "string" ? raw.title : "—";
        const metadata = raw.metadata as { commitHash?: string } | undefined;
        const commitHash = typeof metadata?.commitHash === "string" ? metadata.commitHash : null;

        const verbColor = verbColors[verb] ?? "text-white/50";
        const avatarColor = getAgentAvatarColor(agentName);

        return (
          <li
            key={key}
            className="flex min-h-[3.5rem] flex-col justify-center gap-0.5 border-b border-white/[0.04] py-2.5 px-3 transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex min-h-[1.25rem] items-center gap-2">
              <Avatar className={cn("h-5 w-5 shrink-0 border", avatarColor)}>
                <AvatarFallback className={cn("text-[10px] text-zinc-400", avatarColor)}>{avatar}</AvatarFallback>
              </Avatar>
              <span className="w-12 shrink-0 truncate text-xs font-medium text-white/80" title={agentName}>
                {agentName}
              </span>
              <span className={cn("shrink-0 truncate text-xs", verbColor)}>{verb}</span>
              <span className="min-w-0 shrink-0 font-mono text-xs text-white/70 whitespace-nowrap">{ticketId}</span>
              <span className="min-w-0 flex-1" aria-hidden />
              <span className="shrink-0 text-[10px] text-white/30 ml-auto">
                {formatDistanceToNow(ts, { addSuffix: true })}
              </span>
            </div>
            <div className="flex min-h-[1rem] items-center gap-2 pl-6">
              <span className="min-w-0 max-w-full flex-1 truncate text-xs text-white/40" title={title}>
                {title}
              </span>
              {commitHash && (
                <span className="shrink-0 font-mono text-[10px] text-amber-400/70" title="Commit">
                  {commitHash.slice(0, 7)}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
