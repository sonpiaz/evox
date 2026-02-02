"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AgentProfileProps {
  agentId: Id<"agents">;
  name: string;
  role: string;
  status: string;
  avatar: string;
  onClose: () => void;
  /** AGT-173: When true, omit header (used inside context panel) */
  embedded?: boolean;
}

/** AGT-155: Status dots — green / yellow / gray only (spec 5.6) */
const statusDot: Record<string, string> = {
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

type TabId = "overview" | "tasks" | "activity" | "memory" | "heartbeat" | "messages";

const TABS: { id: TabId; label: string; count?: number }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "activity", label: "Activity" },
  { id: "memory", label: "Memory" },
  { id: "heartbeat", label: "Heartbeat" },
  { id: "messages", label: "Messages" },
];

/** AGT-155: Agent Profile v2 — 6 tabs, surface all available data */
export function AgentProfile({
  agentId,
  name,
  role,
  status,
  avatar,
  onClose,
  embedded = false,
}: AgentProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sendAsName, setSendAsName] = useState<string>("max");
  const [messageDraft, setMessageDraft] = useState("");

  const agent = useQuery(api.agents.get, { id: agentId });
  const soulMemory = useQuery(api.agentMemory.getMemory, { agentId, type: "soul" });
  const workingMemory = useQuery(api.agentMemory.getMemory, { agentId, type: "working" });
  const dailyNotes = useQuery(api.agentMemory.listDailyNotes, { agentId, limit: 10 });
  const agentSkills = useQuery(api.skills.getByAgent, { agentId });
  const tasksForAgent = useQuery(api.tasks.getByAssignee, { assignee: agentId });
  const currentTaskId = (agent as { currentTask?: Id<"tasks"> } | null)?.currentTask;
  const currentTask = useQuery(api.tasks.get, currentTaskId ? { id: currentTaskId } : "skip");
  const activityForAgent = useQuery(api.activityEvents.getByAgent, { agentId, limit: 30 });
  const messagesForAgent = useQuery(api.agentMessages.listForAgent, { agentId, limit: 30 });
  const notificationsForAgent = useQuery(api.notifications.getByAgent, { agent: agentId });
  const agentsList = useQuery(api.agents.list);
  const sendMessage = useMutation(api.agentMessages.sendMessage);

  const full = agent as {
    soul?: string;
    about?: string;
    statusReason?: string;
    statusSince?: number;
    currentTask?: Id<"tasks">;
    lastSeen?: number;
    lastHeartbeat?: number;
  } | null;
  const statusReason = full?.statusReason ?? null;
  const statusSince = full?.statusSince;
  const soulFromAgent = full?.soul ?? full?.about ?? null;
  const soulContent = soulMemory?.content ?? soulFromAgent ?? "—";
  const workingContent = workingMemory?.content ?? "—";
  const dot = statusDot[status?.toLowerCase() ?? "offline"] ?? statusDot.offline;

  const taskStatusesForCount = ["todo", "in_progress", "backlog"];
  const tasksInScope =
    Array.isArray(tasksForAgent) &&
    tasksForAgent.filter((t: { status?: string }) =>
      taskStatusesForCount.includes((t.status ?? "").toLowerCase())
    );
  const taskCount = Array.isArray(tasksInScope) ? tasksInScope.length : 0;
  const notificationCount = Array.isArray(notificationsForAgent) ? notificationsForAgent.length : 0;

  const otherAgents = Array.isArray(agentsList)
    ? (agentsList as { _id: Id<"agents">; name: string }[])
        .filter((a) => a._id !== agentId)
        .map((a) => a.name.toLowerCase())
    : [];

  const handleSendMessage = async () => {
    const content = messageDraft.trim();
    if (!content || !otherAgents?.includes(sendAsName)) return;
    try {
      await sendMessage({
        fromAgentName: sendAsName,
        toAgentName: name.toLowerCase(),
        type: "fyi",
        content,
      });
      setMessageDraft("");
    } catch {
      // leave draft on error
    }
  };

  const currentTaskDoc = currentTask as { title?: string; linearIdentifier?: string; linearUrl?: string } | null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#222] px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Agent Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-[#222] hover:text-zinc-50"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {/* Identity + Status — compact */}
      <div className="shrink-0 border-b border-[#222] px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-[#222]">
            <AvatarFallback className="bg-[#111] text-sm text-zinc-50">{avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-zinc-50">{name}</p>
            <p className="text-xs text-zinc-500">{roleLabels[role] ?? role}</p>
          </div>
          <span className={cn("h-2 w-2 shrink-0 rounded-full border border-[#0a0a0a]", dot)} />
        </div>
        {statusReason && <p className="mt-1 text-xs italic text-zinc-500">{statusReason}</p>}
        {statusSince != null && (
          <p className="text-xs text-[#555]">Since {formatDistanceToNow(statusSince, { addSuffix: true })}</p>
        )}
        {full?.lastSeen != null && (
          <p className="text-xs text-[#555]">Last seen {formatDistanceToNow(full.lastSeen, { addSuffix: true })}</p>
        )}
        {currentTaskDoc && (
          <p className="mt-1 text-xs text-zinc-500">
            Current:{" "}
            <a
              href={currentTaskDoc.linearUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#888] hover:text-zinc-400"
            >
              {currentTaskDoc.linearIdentifier ?? "—"}
            </a>{" "}
            {currentTaskDoc.title ?? ""}
          </p>
        )}
      </div>

      {/* 6 Tabs */}
      <div className="flex shrink-0 border-b border-[#222] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
              activeTab === tab.id
                ? "border-b-2 border-zinc-50 text-zinc-50"
                : "text-zinc-500 hover:text-zinc-400"
            )}
          >
            {tab.id === "tasks" && taskCount > 0 ? `Tasks (${taskCount})` : tab.label}
            {tab.id === "messages" && Array.isArray(messagesForAgent) && messagesForAgent.length > 0 ? ` (${messagesForAgent.length})` : ""}
            {tab.id === "memory" && Array.isArray(dailyNotes) && dailyNotes.length > 0 ? ` (${dailyNotes.length})` : ""}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">SOUL</h4>
              <div className="mt-2 text-sm text-zinc-500 whitespace-pre-wrap">
                {soulContent}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Skills</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {agentSkills?.skills?.length ? (
                  agentSkills.skills.map((s: { name: string; proficiency?: number; verified?: boolean }) => (
                    <span
                      key={s.name}
                      className="rounded-[10px] border border-[#222] bg-[#111] px-2 py-0.5 text-[10px] text-zinc-400"
                    >
                      {s.name}
                      {s.proficiency != null ? ` ${s.proficiency}%` : ""}
                      {s.verified && " ✓"}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">—</span>
                )}
              </div>
            </div>
            {agentSkills && (
              <p className="text-sm text-zinc-500">
                {agentSkills.autonomyLevelName ?? "—"} · {agentSkills.tasksCompleted ?? 0} completed
              </p>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-4">
            {["todo", "in_progress", "backlog", "review", "done"].map((groupStatus) => {
              const group = Array.isArray(tasksForAgent)
                ? tasksForAgent.filter((t: { status?: string }) => (t.status ?? "").toLowerCase() === groupStatus)
                : [];
              const label = groupStatus === "backlog" ? "Blocked" : groupStatus.replace("_", " ");
              return (
                <div key={groupStatus}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">
                    {label} ({group.length})
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {group.length === 0 ? (
                      <li className="text-xs text-zinc-600">—</li>
                    ) : (
                      group.map((t: { _id: Id<"tasks">; title?: string; linearIdentifier?: string; linearUrl?: string }) => (
                        <li key={t._id}>
                          <a
                            href={t.linearUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-zinc-400 hover:text-zinc-50"
                          >
                            <span className="font-mono text-xs text-[#888]">{t.linearIdentifier ?? "—"}</span>{" "}
                            {t.title ?? "—"}
                          </a>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "activity" && (
          <ul className="space-y-1">
            {Array.isArray(activityForAgent) && activityForAgent.length > 0 ? (
              activityForAgent.slice(0, 25).map((e: { _id: string; title?: string; linearIdentifier?: string; timestamp?: number }) => (
                <li key={e._id} className="flex items-center gap-2 border-b border-[#1a1a1a] py-1.5 text-sm text-zinc-500">
                  {e.linearIdentifier && <span className="font-mono text-xs text-[#888]">{e.linearIdentifier}</span>}
                  <span className="truncate flex-1">{e.title ?? "—"}</span>
                  {e.timestamp != null && (
                    <span className="shrink-0 text-xs text-[#555]">{formatDistanceToNow(e.timestamp, { addSuffix: true })}</span>
                  )}
                </li>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No activity</p>
            )}
          </ul>
        )}

        {activeTab === "messages" && (
          <ul className="space-y-2">
            {Array.isArray(messagesForAgent) && messagesForAgent.length > 0 ? (
              messagesForAgent.slice(0, 20).map((m: { _id: Id<"agentMessages">; content?: string; fromAgent?: { name: string } | null; toAgent?: { name: string } | null; type?: string; timestamp?: number }) => (
                <li key={m._id} className="rounded border border-[#222] bg-[#111] px-2 py-1.5 text-sm text-zinc-400">
                  <span className="text-xs text-zinc-500">
                    {m.fromAgent?.name ?? "?"} → {m.toAgent?.name ?? "?"}
                    {m.type && ` · ${m.type}`}
                    {m.timestamp != null && ` · ${formatDistanceToNow(m.timestamp, { addSuffix: true })}`}
                  </span>
                  <p className="mt-0.5">{m.content ?? "—"}</p>
                </li>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No messages</p>
            )}
          </ul>
        )}

        {activeTab === "memory" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Working (current session)</h4>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-500">{workingContent}</div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Daily notes</h4>
              {Array.isArray(dailyNotes) && dailyNotes.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {dailyNotes.map((note: { _id: string; date?: string; content?: string; updatedAt?: number }) => (
                    <li key={note._id} className="rounded border border-[#222] bg-[#111] px-2 py-2">
                      <span className="font-mono text-xs text-[#888]">{note.date ?? "—"}</span>
                      {note.updatedAt != null && (
                        <span className="ml-2 text-xs text-[#555]">{formatDistanceToNow(note.updatedAt, { addSuffix: true })}</span>
                      )}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{note.content ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No daily notes</p>
              )}
            </div>
            {Array.isArray(notificationsForAgent) && notificationsForAgent.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Notifications ({notificationCount})</h4>
                <ul className="mt-2 space-y-1">
                  {notificationsForAgent.slice(0, 10).map((n: { _id: string; type?: string; title?: string; message?: string; read?: boolean; createdAt?: number }) => (
                    <li key={n._id} className="flex items-center gap-2 border-b border-[#1a1a1a] py-1.5 text-sm">
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-zinc-50" />}
                      <span className="text-xs text-[#888]">{n.type ?? "—"}</span>
                      <span className="truncate flex-1">{n.title ?? n.message ?? "—"}</span>
                      {n.createdAt != null && <span className="text-xs text-[#555]">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "heartbeat" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Last heartbeat</h4>
              <p className="mt-1 text-sm text-zinc-400">
                {full?.lastHeartbeat != null
                  ? formatDistanceToNow(full.lastHeartbeat, { addSuffix: true })
                  : "—"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Uptime since last beat</h4>
              <p className="mt-1 text-sm text-zinc-400">
                {full?.lastHeartbeat != null
                  ? formatDistanceToNow(full.lastHeartbeat)
                  : "—"}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Status</h4>
              <p className="mt-1 text-sm text-zinc-400">
                {full?.lastHeartbeat != null
                  ? (() => {
                      const ageMs = Date.now() - full.lastHeartbeat;
                      if (ageMs < 5 * 60 * 1000) return "healthy";
                      if (ageMs < 15 * 60 * 1000) return "stale";
                      return "offline";
                    })()
                  : "offline"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Send message — fixed at bottom */}
      <div className="shrink-0 border-t border-[#222] p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">Send message</h4>
        {Array.isArray(otherAgents) && otherAgents.length > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <label className="text-xs text-zinc-500">Send as:</label>
            <select
              value={sendAsName}
              onChange={(e) => setSendAsName(e.target.value)}
              className="rounded-md border border-[#222] bg-[#111] px-2 py-1 text-xs text-zinc-50"
            >
              {otherAgents.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
        <textarea
          placeholder="Type a message..."
          value={messageDraft}
          onChange={(e) => setMessageDraft(e.target.value)}
          className="mt-2 w-full rounded-md border border-[#222] bg-[#111] px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          rows={2}
        />
        <Button
          type="button"
          onClick={handleSendMessage}
          disabled={!messageDraft.trim()}
          className="mt-2 bg-zinc-50 text-[#0a0a0a] hover:bg-zinc-200"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
