"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MemoryTab } from "@/components/evox/MemoryTab";
import { useViewerMode } from "@/contexts/ViewerModeContext";

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
  qa: "QA",
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

/**
 * AGT-155: Agent Profile v2 — 6 tabs, surface all available data
 * AGT-230: Send message section hidden in demo mode
 */
export function AgentProfile({
  agentId,
  name,
  role,
  status,
  avatar,
  onClose,
  embedded = false,
}: AgentProfileProps) {
  const { isViewerMode } = useViewerMode();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sendAsName, setSendAsName] = useState<string>("max");
  const [messageDraft, setMessageDraft] = useState("");

  // Core agent data - always loaded
  const agent = useQuery(api.agents.get, { id: agentId });
  const currentTaskId = (agent as { currentTask?: Id<"tasks"> } | null)?.currentTask;
  const currentTask = useQuery(api.tasks.get, currentTaskId ? { id: currentTaskId } : "skip");

  // AGT-245: Load metrics data upfront for brutal metrics header
  // Load always: skills (for tasksCompleted), tasks (for count), messages (for count), notifications (for alerts)
  const agentSkills = useQuery(api.skills.getByAgent, { agentId });
  const tasksForAgent = useQuery(api.tasks.getByAssignee, { assignee: agentId, limit: 50 });
  const messagesForAgent = useQuery(api.agentMessages.listForAgent, { agentId, limit: 30 });
  const notificationsForAgent = useQuery(api.notifications.getByAgent, { agent: agentId });

  // AGT-245: Brutal metrics - Cost tracking (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const costData = useQuery(
    api.costs.getCostsByDateRange,
    activeTab === "overview" ? { startTs: sevenDaysAgo, endTs: Date.now(), agentName: name.toLowerCase() } : "skip"
  );

  // AGT-245: Brutal metrics - Execution stats (last 24 hours)
  const executionSummary = useQuery(
    api.execution.getExecutionSummary,
    activeTab === "overview" ? { agentName: name.toLowerCase(), timeRangeMs: 24 * 60 * 60 * 1000 } : "skip"
  );

  // AGT-245: Brutal metrics - Alert stats (last 7 days)
  const alertStats = useQuery(
    api.alerts.getAlertStats,
    activeTab === "overview" ? { since: sevenDaysAgo } : "skip"
  );

  // Lazy load tab-specific data
  const soulMemory = useQuery(
    api.agentMemory.getMemory,
    activeTab === "overview" || activeTab === "memory" ? { agentId, type: "soul" } : "skip"
  );
  const workingMemory = useQuery(
    api.agentMemory.getMemory,
    activeTab === "memory" ? { agentId, type: "working" } : "skip"
  );
  const dailyNotes = useQuery(
    api.agentMemory.listDailyNotes,
    activeTab === "memory" ? { agentId, limit: 10 } : "skip"
  );
  const activityForAgent = useQuery(
    api.activityEvents.getByAgent,
    activeTab === "activity" ? { agentId, limit: 30 } : "skip"
  );
  // Remove duplicate agents.list - parent already has this data
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

      {/* Identity + Brutal Metrics Header — AGT-245 */}
      <div className="shrink-0 border-b border-[#222] px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 border border-[#222]">
            <AvatarFallback className="bg-[#111] text-base text-zinc-50">{avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-zinc-50">{name}</p>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border border-[#0a0a0a] shadow-lg", dot)} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{roleLabels[role] ?? role}</p>
          </div>
        </div>

        {/* Brutal Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="rounded border border-[#222] bg-[#111] px-2 py-1.5">
            <div className="text-2xl font-bold text-zinc-50">{taskCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Tasks</div>
          </div>
          <div className="rounded border border-[#222] bg-[#111] px-2 py-1.5">
            <div className="text-2xl font-bold text-zinc-50">{agentSkills?.tasksCompleted ?? 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Done</div>
          </div>
          <div className="rounded border border-[#222] bg-[#111] px-2 py-1.5">
            <div className="text-2xl font-bold text-zinc-50">{Array.isArray(messagesForAgent) ? messagesForAgent.length : 0}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Msgs</div>
          </div>
          <div className="rounded border border-[#222] bg-[#111] px-2 py-1.5">
            <div className="text-2xl font-bold text-zinc-50">{notificationCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Alerts</div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            status?.toLowerCase() === "online" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
            status?.toLowerCase() === "busy" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
            "bg-gray-500/20 text-gray-400 border border-gray-500/30"
          )}>
            {status}
          </span>
          {statusSince != null && (
            <span className="rounded bg-[#111] border border-[#222] px-2 py-0.5 text-[10px] text-zinc-500">
              {formatDistanceToNow(statusSince, { addSuffix: false })}
            </span>
          )}
          {full?.lastHeartbeat != null && (() => {
            const ageMs = Date.now() - full.lastHeartbeat;
            const isStale = ageMs >= 5 * 60 * 1000;
            return isStale ? (
              <span className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase">
                ⚠ Stale
              </span>
            ) : null;
          })()}
          {agentSkills?.autonomyLevelName && (
            <span className="rounded bg-[#111] border border-[#222] px-2 py-0.5 text-[10px] text-zinc-500">
              {agentSkills.autonomyLevelName}
            </span>
          )}
        </div>

        {/* Alerts Section */}
        {notificationCount > 0 && (
          <div className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1.5 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-orange-400 text-sm">⚡</span>
              <span className="text-[11px] font-semibold text-orange-300">{notificationCount} pending notification{notificationCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}

        {statusReason && (
          <p className="mt-2 text-xs italic text-zinc-500 border-l-2 border-zinc-700 pl-2">{statusReason}</p>
        )}

        {currentTaskDoc && (
          <div className="mt-2 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-blue-400 mb-0.5">Current Task</div>
            <a
              href={currentTaskDoc.linearUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-300 hover:text-blue-200 font-medium"
            >
              {currentTaskDoc.linearIdentifier ?? "—"} {currentTaskDoc.title ?? ""}
            </a>
          </div>
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
            {/* Performance Metrics — AGT-245 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-[#222] bg-[#0a0a0a] p-3">
                <div className="text-3xl font-bold text-zinc-50">{agentSkills?.tasksCompleted ?? 0}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1">Tasks Completed</div>
              </div>
              <div className="rounded border border-[#222] bg-[#0a0a0a] p-3">
                <div className="text-3xl font-bold text-zinc-50">{taskCount}</div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1">Active Tasks</div>
              </div>
            </div>

            {/* Cost Metrics (7d) — AGT-245 */}
            {costData && (
              <div className="rounded border border-[#222] bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Cost (7d)</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-zinc-50">${costData.totals.cost.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-50">{Math.round(costData.totals.inputTokens / 1000)}k</div>
                    <div className="text-[10px] text-zinc-600">Input Tokens</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-50">{Math.round(costData.totals.outputTokens / 1000)}k</div>
                    <div className="text-[10px] text-zinc-600">Output Tokens</div>
                  </div>
                </div>
              </div>
            )}

            {/* Execution Stats (24h) — AGT-245 */}
            {executionSummary && (
              <div className="rounded border border-[#222] bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Execution (24h)</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-zinc-50">{executionSummary.files.totalActions}</div>
                    <div className="text-[10px] text-zinc-600">File Actions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-50">{executionSummary.files.uniqueFiles}</div>
                    <div className="text-[10px] text-zinc-600">Unique Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{executionSummary.logs.error}</div>
                    <div className="text-[10px] text-zinc-600">Errors</div>
                  </div>
                </div>
                {executionSummary.recentErrors.length > 0 && (
                  <div className="rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Recent Errors</div>
                    {executionSummary.recentErrors.slice(0, 3).map((err, i) => (
                      <div key={i} className="text-[11px] text-red-300 truncate">{err.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Alert Stats (7d) — AGT-245 */}
            {alertStats && alertStats.total > 0 && (
              <div className="rounded border border-orange-500/30 bg-orange-500/10 p-3">
                <div className="text-xs uppercase tracking-wider text-orange-400 mb-2">Alerts (7d)</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-orange-300">{alertStats.total}</div>
                    <div className="text-[10px] text-orange-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{alertStats.bySeverity.critical ?? 0}</div>
                    <div className="text-[10px] text-orange-600">Critical</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">{alertStats.bySeverity.warning ?? 0}</div>
                    <div className="text-[10px] text-orange-600">Warnings</div>
                  </div>
                </div>
              </div>
            )}

            {/* Heartbeat Status */}
            {full?.lastHeartbeat != null && (
              <div className="rounded border border-[#222] bg-[#0a0a0a] p-3">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Heartbeat</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-zinc-50">
                      {(() => {
                        const ageMs = Date.now() - full.lastHeartbeat;
                        if (ageMs < 5 * 60 * 1000) return "Healthy";
                        if (ageMs < 15 * 60 * 1000) return "Stale";
                        return "Offline";
                      })()}
                    </div>
                    <div className="text-xs text-zinc-500">{formatDistanceToNow(full.lastHeartbeat, { addSuffix: true })}</div>
                  </div>
                  <div className={cn(
                    "h-4 w-4 rounded-full",
                    (() => {
                      const ageMs = Date.now() - full.lastHeartbeat;
                      if (ageMs < 5 * 60 * 1000) return "bg-green-500";
                      if (ageMs < 15 * 60 * 1000) return "bg-yellow-500";
                      return "bg-gray-500";
                    })()
                  )} />
                </div>
              </div>
            )}

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

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">SOUL</h4>
              <div className="mt-2 text-sm text-zinc-500 whitespace-pre-wrap border-l-2 border-zinc-800 pl-3">
                {soulContent}
              </div>
            </div>
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
          <MemoryTab agentId={agentId} agentName={name} />
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

      {/* Send message — fixed at bottom, hidden in demo mode (AGT-230) */}
      {!isViewerMode && (
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
      )}
    </div>
  );
}
