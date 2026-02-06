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
  embedded?: boolean;
}

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

type TabId = "profile" | "stats" | "tasks" | "activity" | "memory" | "messages";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "stats", label: "Stats" },
  { id: "tasks", label: "Tasks" },
  { id: "activity", label: "Activity" },
  { id: "memory", label: "Memory" },
  { id: "messages", label: "Messages" },
];

/**
 * AGT-155/AGT-342: Agent Profile — Career profile as default tab
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
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [sendAsName, setSendAsName] = useState<string>("max");
  const [messageDraft, setMessageDraft] = useState("");

  // Core agent data
  const agent = useQuery(api.agents.get, { id: agentId });
  const currentTaskId = (agent as { currentTask?: Id<"tasks"> } | null)?.currentTask;
  const currentTask = useQuery(api.tasks.get, currentTaskId ? { id: currentTaskId } : "skip");

  // Career profile data (for Profile tab)
  const careerProfile = useQuery(
    api.agentProfiles.getCareerProfile,
    activeTab === "profile" ? { agentName: name.toLowerCase() } : "skip"
  );

  // Tasks + messages (always loaded for tab counts)
  const tasksForAgent = useQuery(api.tasks.getByAssignee, { assignee: agentId, limit: 50 });
  const messagesForAgent = useQuery(api.agentMessages.listForAgent, { agentId, limit: 30 });

  // Stats tab data (lazy loaded)
  const now = new Date().getTime();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const agentSkills = useQuery(
    api.skills.getByAgent,
    activeTab === "stats" || activeTab === "profile" ? { agentId } : "skip"
  );
  const costData = useQuery(
    api.costs.getCostsByDateRange,
    activeTab === "stats" ? { startTs: sevenDaysAgo, endTs: now, agentName: name.toLowerCase() } : "skip"
  );
  const executionSummary = useQuery(
    api.execution.getExecutionSummary,
    activeTab === "stats" ? { agentName: name.toLowerCase(), timeRangeMs: 24 * 60 * 60 * 1000 } : "skip"
  );
  const alertStats = useQuery(
    api.alerts.getAlertStats,
    activeTab === "stats" ? { since: sevenDaysAgo } : "skip"
  );
  const notificationsForAgent = useQuery(
    api.notifications.getByAgent,
    activeTab === "stats" ? { agent: agentId } : "skip"
  );

  // Memory/Activity tab data (lazy loaded)
  const soulMemory = useQuery(
    api.agentMemory.getMemory,
    activeTab === "stats" ? { agentId, type: "soul" } : "skip"
  );
  const dailyNotes = useQuery(
    api.agentMemory.listDailyNotes,
    activeTab === "memory" ? { agentId, limit: 10 } : "skip"
  );
  const activityForAgent = useQuery(
    api.activityEvents.getByAgent,
    activeTab === "activity" ? { agentId, limit: 30 } : "skip"
  );

  const agentsList = useQuery(api.agents.list);
  const sendMessage = useMutation(api.agentMessages.sendMessage);

  const full = agent as {
    soul?: string; about?: string; statusReason?: string;
    statusSince?: number; currentTask?: Id<"tasks">;
  } | null;
  const statusReason = full?.statusReason ?? null;
  const statusSince = full?.statusSince;
  const soulFromAgent = full?.soul ?? full?.about ?? null;
  const soulContent = soulMemory?.content ?? soulFromAgent ?? "—";
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
    <div className="flex h-full flex-col overflow-hidden bg-base">
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">Agent Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-secondary transition-colors hover:bg-surface-4 hover:text-primary"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {/* Identity Header — compact */}
      <div className="shrink-0 border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Avatar className="h-10 w-10 border border-border-default">
            <AvatarFallback className="bg-surface-1 text-base text-primary">{avatar}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-primary">{name}</p>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border border-base shadow-lg", dot)} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{roleLabels[role] ?? role}</p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn(
            "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            status?.toLowerCase() === "online" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
            status?.toLowerCase() === "busy" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
            "bg-gray-500/20 text-gray-400 border border-gray-500/30"
          )}>
            {status}
          </span>
          {statusSince != null && (
            <span className="rounded bg-surface-1 border border-border-default px-2 py-0.5 text-[10px] text-secondary">
              {formatDistanceToNow(statusSince, { addSuffix: false })}
            </span>
          )}
        </div>

        {statusReason && (
          <p className="mt-2 text-xs italic text-secondary border-l-2 border-gray-500 pl-2">{statusReason}</p>
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

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-border-default overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
              activeTab === tab.id
                ? "border-b-2 border-white text-primary"
                : "text-secondary hover:text-secondary"
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

        {/* ─── PROFILE TAB (default) — Career profile from AGT-342 ─── */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            {!careerProfile ? (
              <div className="text-xs text-tertiary">Loading career profile...</div>
            ) : (
              <>
                {/* Soul quote */}
                {careerProfile.soul && (
                  <div className="text-sm text-secondary italic border-l-2 border-border-default pl-3">
                    {careerProfile.soul}
                  </div>
                )}

                {/* Stats Grid (2x3) */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">{careerProfile.tasksCompleted}</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Done</div>
                  </div>
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">{Math.round(careerProfile.successRate * 100)}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Success</div>
                  </div>
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">{Math.round(careerProfile.loopCompletionRate * 100)}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Loop</div>
                  </div>
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">{careerProfile.avgRating > 0 ? careerProfile.avgRating.toFixed(1) : "—"}</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Rating</div>
                  </div>
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">${careerProfile.totalCost7d.toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Cost 7d</div>
                  </div>
                  <div className="rounded border border-border-default bg-surface-1 px-2 py-2 text-center">
                    <div className="text-2xl font-bold text-primary">{careerProfile.totalLearnings}</div>
                    <div className="text-[10px] uppercase tracking-wider text-secondary">Learnings</div>
                  </div>
                </div>

                {/* Autonomy + Tenure */}
                <div className="flex items-center gap-3">
                  <span className="rounded bg-surface-1 border border-border-default px-2 py-0.5 text-[10px] text-secondary">
                    {careerProfile.autonomyLevelName}
                  </span>
                  {careerProfile.daysSinceFirstTask > 0 && (
                    <span className="text-[10px] text-tertiary">
                      {careerProfile.daysSinceFirstTask}d tenure
                    </span>
                  )}
                  <span className="text-[10px] text-tertiary">
                    {careerProfile.tasksCompleted7d} done this week
                  </span>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Skills</h4>
                  <div className="mt-2 space-y-1.5">
                    {careerProfile.skills.length > 0 ? (
                      careerProfile.skills.map((s: { name: string; proficiency: number; verified: boolean }) => (
                        <div key={s.name} className="flex items-center gap-2">
                          <span className="text-xs text-secondary w-24 truncate">{s.name}</span>
                          <div className="flex-1 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${s.proficiency}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-tertiary w-8 text-right">{s.proficiency}%</span>
                          {s.verified && <span className="text-[10px] text-green-400">✓</span>}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-tertiary">No skills recorded</span>
                    )}
                  </div>
                </div>

                {/* Feedback by Category */}
                {Object.keys(careerProfile.feedbackByCategory).length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
                      Feedback ({careerProfile.totalFeedbackCount} reviews)
                    </h4>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(careerProfile.feedbackByCategory).map(([cat, rating]) => (
                        <div key={cat} className="flex items-center justify-between rounded border border-border-default bg-surface-1 px-2 py-1.5">
                          <span className="text-[10px] text-secondary capitalize">{cat}</span>
                          <span className="text-xs font-bold text-primary">{(rating as number).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── STATS TAB — Performance metrics (old Overview) ─── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-border-default bg-base p-3">
                <div className="text-3xl font-bold text-primary">{agentSkills?.tasksCompleted ?? 0}</div>
                <div className="text-xs uppercase tracking-wider text-secondary mt-1">Tasks Completed</div>
              </div>
              <div className="rounded border border-border-default bg-base p-3">
                <div className="text-3xl font-bold text-primary">{taskCount}</div>
                <div className="text-xs uppercase tracking-wider text-secondary mt-1">Active Tasks</div>
              </div>
            </div>

            {costData && (
              <div className="rounded border border-border-default bg-base p-3">
                <div className="text-xs uppercase tracking-wider text-secondary mb-2">Cost (7d)</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-2xl font-bold text-primary">${costData.totals.cost.toFixed(2)}</div>
                    <div className="text-[10px] text-tertiary">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{Math.round(costData.totals.inputTokens / 1000)}k</div>
                    <div className="text-[10px] text-tertiary">Input Tokens</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{Math.round(costData.totals.outputTokens / 1000)}k</div>
                    <div className="text-[10px] text-tertiary">Output Tokens</div>
                  </div>
                </div>
              </div>
            )}

            {executionSummary && (
              <div className="rounded border border-border-default bg-base p-3">
                <div className="text-xs uppercase tracking-wider text-secondary mb-2">Execution (24h)</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-2xl font-bold text-primary">{executionSummary.files.totalActions}</div>
                    <div className="text-[10px] text-tertiary">File Actions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{executionSummary.files.uniqueFiles}</div>
                    <div className="text-[10px] text-tertiary">Unique Files</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{executionSummary.logs.error}</div>
                    <div className="text-[10px] text-tertiary">Errors</div>
                  </div>
                </div>
                {executionSummary.recentErrors.length > 0 && (
                  <div className="rounded bg-red-500/10 border border-red-500/30 px-2 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">Recent Errors</div>
                    {executionSummary.recentErrors.slice(0, 3).map((err: { message: string }, i: number) => (
                      <div key={i} className="text-[11px] text-red-300 truncate">{err.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {notificationCount > 0 && (
              <div className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-400 text-sm">⚡</span>
                  <span className="text-[11px] font-semibold text-orange-300">{notificationCount} pending notification{notificationCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Skills</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {agentSkills?.skills?.length ? (
                  agentSkills.skills.map((s: { name: string; proficiency?: number; verified?: boolean }) => (
                    <span
                      key={s.name}
                      className="rounded-[10px] border border-border-default bg-surface-1 px-2 py-0.5 text-[10px] text-secondary"
                    >
                      {s.name}
                      {s.proficiency != null ? ` ${s.proficiency}%` : ""}
                      {s.verified && " ✓"}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-secondary">—</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">SOUL</h4>
              <div className="mt-2 text-sm text-secondary whitespace-pre-wrap border-l-2 border-border-default pl-3">
                {soulContent}
              </div>
            </div>
          </div>
        )}

        {/* ─── TASKS TAB ─── */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {["todo", "in_progress", "backlog", "review", "done"].map((groupStatus) => {
              const group = Array.isArray(tasksForAgent)
                ? tasksForAgent.filter((t: { status?: string }) => (t.status ?? "").toLowerCase() === groupStatus)
                : [];
              const label = groupStatus === "backlog" ? "Blocked" : groupStatus.replace("_", " ");
              return (
                <div key={groupStatus}>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">
                    {label} ({group.length})
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {group.length === 0 ? (
                      <li className="text-xs text-tertiary">—</li>
                    ) : (
                      group.map((t: { _id: Id<"tasks">; title?: string; linearIdentifier?: string; linearUrl?: string }) => (
                        <li key={t._id}>
                          <a
                            href={t.linearUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-secondary hover:text-primary"
                          >
                            <span className="font-mono text-xs text-secondary">{t.linearIdentifier ?? "—"}</span>{" "}
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

        {/* ─── ACTIVITY TAB ─── */}
        {activeTab === "activity" && (
          <ul className="space-y-1">
            {Array.isArray(activityForAgent) && activityForAgent.length > 0 ? (
              activityForAgent.slice(0, 25).map((e: { _id: string; title?: string; linearIdentifier?: string; timestamp?: number }) => (
                <li key={e._id} className="flex items-center gap-2 border-b border-border-default py-1.5 text-sm text-secondary">
                  {e.linearIdentifier && <span className="font-mono text-xs text-secondary">{e.linearIdentifier}</span>}
                  <span className="truncate flex-1">{e.title ?? "—"}</span>
                  {e.timestamp != null && (
                    <span className="shrink-0 text-xs text-secondary">{formatDistanceToNow(e.timestamp, { addSuffix: true })}</span>
                  )}
                </li>
              ))
            ) : (
              <p className="text-sm text-secondary">No activity</p>
            )}
          </ul>
        )}

        {/* ─── MESSAGES TAB ─── */}
        {activeTab === "messages" && (
          <ul className="space-y-2">
            {Array.isArray(messagesForAgent) && messagesForAgent.length > 0 ? (
              messagesForAgent.slice(0, 20).map((m: { _id: Id<"agentMessages">; content?: string; fromAgent?: { name: string } | null; toAgent?: { name: string } | null; type?: string; timestamp?: number }) => (
                <li key={m._id} className="rounded border border-border-default bg-surface-1 px-2 py-1.5 text-sm text-secondary">
                  <span className="text-xs text-secondary">
                    {m.fromAgent?.name ?? "?"} → {m.toAgent?.name ?? "?"}
                    {m.type && ` · ${m.type}`}
                    {m.timestamp != null && ` · ${formatDistanceToNow(m.timestamp, { addSuffix: true })}`}
                  </span>
                  <p className="mt-0.5">{m.content ?? "—"}</p>
                </li>
              ))
            ) : (
              <p className="text-sm text-secondary">No messages</p>
            )}
          </ul>
        )}

        {/* ─── MEMORY TAB ─── */}
        {activeTab === "memory" && (
          <MemoryTab agentId={agentId} agentName={name} />
        )}

      </div>

      {/* Send message — fixed at bottom, hidden in demo mode (AGT-230) */}
      {!isViewerMode && (
        <div className="shrink-0 border-t border-border-default p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-secondary">Send message</h4>
          {Array.isArray(otherAgents) && otherAgents.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <label className="text-xs text-secondary">Send as:</label>
              <select
                value={sendAsName}
                onChange={(e) => setSendAsName(e.target.value)}
                className="rounded-md border border-border-default bg-surface-1 px-2 py-1 text-xs text-primary"
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
            className="mt-2 w-full rounded-md border border-border-default bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-secondary focus:border-gray-500 focus:outline-none"
            rows={2}
          />
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={!messageDraft.trim()}
            className="mt-2 bg-white text-black hover:bg-gray-200"
          >
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
