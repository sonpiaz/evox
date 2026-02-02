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
}

/** AGT-155: Status dots — green / yellow / gray only (Vercel/Notion minimal, spec 5.6) */
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

/** AGT-155: Agent Profile v2 — Spec 5.6 Detail Panel: SOUL, skills, status reason, tabs, messaging */
export function AgentProfile({
  agentId,
  name,
  role,
  status,
  avatar,
  onClose,
}: AgentProfileProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "activity" | "messages">("tasks");
  const [soulExpanded, setSoulExpanded] = useState(false);
  const [sendAsName, setSendAsName] = useState<string>("max");
  const [messageDraft, setMessageDraft] = useState("");

  const agent = useQuery(api.agents.get, { id: agentId });
  const soulMemory = useQuery(api.agentMemory.getMemory, {
    agentId,
    type: "soul",
  });
  const agentSkills = useQuery(api.skills.getByAgent, { agentId });
  const tasksForAgent = useQuery(api.tasks.getByAssignee, { assignee: agentId });
  const activityForAgent = useQuery(api.activityEvents.getByAgent, {
    agentId,
    limit: 30,
  });
  const messagesForAgent = useQuery(api.agentMessages.listForAgent, {
    agentId,
    limit: 30,
  });
  const agentsList = useQuery(api.agents.list);
  const sendMessage = useMutation(api.agentMessages.sendMessage);

  const full = agent as {
    soul?: string;
    about?: string;
    statusReason?: string;
    statusSince?: number;
    currentTask?: Id<"tasks">;
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

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#0a0a0a]">
      {/* Header: close */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#222] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Agent Profile
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-[#222] hover:text-zinc-50"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Section 1: Identity — spec 5.6: Avatar 32px + Name 20px/600 + Role small secondary */}
        <div className="flex items-center gap-3 border-b border-[#222] pb-4">
          <Avatar className="h-8 w-8 border border-[#222]">
            <AvatarFallback className="bg-[#111] text-zinc-50 text-sm">
              {avatar}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold text-zinc-50">{name}</p>
            <p className="text-xs text-zinc-500">{roleLabels[role] ?? role}</p>
          </div>
        </div>

        {/* Section 2: Status + Reason — 8px dot, status text, Since, statusReason italic */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-[#222] pb-4">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full border border-[#0a0a0a]",
              dot
            )}
          />
          <span className="text-xs capitalize text-zinc-400">{status}</span>
          {statusSince != null && (
            <span className="text-xs text-zinc-500">
              Since {formatDistanceToNow(statusSince, { addSuffix: true })}
            </span>
          )}
          {statusReason && (
            <p className="w-full text-sm italic text-zinc-500">{statusReason}</p>
          )}
        </div>

        {/* Section 3: ABOUT (SOUL) — UPPERCASE header, body secondary, max 3 lines + expand */}
        <div className="mt-4 border-b border-[#222] pb-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">
            About
          </h4>
          <div
            className={cn(
              "mt-1 text-sm text-zinc-500 whitespace-pre-wrap",
              !soulExpanded && "line-clamp-3"
            )}
          >
            {soulContent}
          </div>
          {soulContent !== "—" && soulContent.length > 120 && (
            <button
              type="button"
              onClick={() => setSoulExpanded(!soulExpanded)}
              className="mt-1 text-xs text-zinc-500 underline hover:text-zinc-400"
            >
              {soulExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Section 4: SKILLS — pills: 2px 8px, #111 bg, #222 border, 10px radius, text-tiny */}
        <div className="mt-4 border-b border-[#222] pb-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">
            Skills
          </h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agentSkills?.skills?.length ? (
              agentSkills.skills.map((s: { name: string; proficiency?: number }) => (
                <span
                  key={s.name}
                  className="rounded-[10px] border border-[#222] bg-[#111] px-2 py-0.5 text-[10px] text-zinc-400"
                >
                  {s.name}
                  {s.proficiency != null ? ` ${s.proficiency}%` : ""}
                </span>
              ))
            ) : (
              <span className="text-xs text-zinc-500">—</span>
            )}
          </div>
        </div>

        {/* Section 5: Tabs — Tasks | Activity | Messages (underline active) */}
        <div className="mt-4">
          <div className="flex border-b border-[#222]">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                activeTab === "tasks"
                  ? "border-b-2 border-zinc-50 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Tasks {taskCount > 0 && `(${taskCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={cn(
                "px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                activeTab === "activity"
                  ? "border-b-2 border-zinc-50 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Activity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("messages")}
              className={cn(
                "px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                activeTab === "messages"
                  ? "border-b-2 border-zinc-50 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-400"
              )}
            >
              Messages
            </button>
          </div>

          <div className="mt-3 min-h-[120px]">
            {activeTab === "tasks" && (
              <ul className="space-y-1.5">
                {Array.isArray(tasksForAgent) && tasksForAgent.length > 0 ? (
                  tasksForAgent
                    .filter((t: { status?: string }) =>
                      taskStatusesForCount.includes((t.status ?? "").toLowerCase())
                    )
                    .slice(0, 15)
                    .map((t: { _id: Id<"tasks">; title?: string; linearIdentifier?: string; linearUrl?: string; status?: string }) => (
                      <li key={t._id}>
                        <a
                          href={t.linearUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-zinc-400 hover:text-zinc-50"
                        >
                          <span className="font-mono text-xs text-[#888]">
                            {t.linearIdentifier ?? "—"}
                          </span>{" "}
                          {t.title ?? "—"}
                        </a>
                      </li>
                    ))
                ) : (
                  <p className="text-sm text-zinc-500">No tasks in queue</p>
                )}
              </ul>
            )}

            {activeTab === "activity" && (
              <ul className="space-y-1">
                {Array.isArray(activityForAgent) && activityForAgent.length > 0 ? (
                  activityForAgent.slice(0, 20).map((e: { _id: string; title?: string; linearIdentifier?: string; timestamp?: number }) => (
                    <li
                      key={e._id}
                      className="flex items-center gap-2 text-sm text-zinc-500"
                    >
                      {e.linearIdentifier && (
                        <span className="font-mono text-xs text-[#888]">
                          {e.linearIdentifier}
                        </span>
                      )}
                      <span className="truncate">{e.title ?? "—"}</span>
                      {e.timestamp != null && (
                        <span className="shrink-0 text-xs text-[#555]">
                          {formatDistanceToNow(e.timestamp, { addSuffix: true })}
                        </span>
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
                  messagesForAgent.slice(0, 15).map((m: { _id: Id<"agentMessages">; content?: string; fromAgent?: { name: string } | null; toAgent?: { name: string } | null; type?: string; timestamp?: number }) => (
                    <li
                      key={m._id}
                      className="rounded border border-[#222] bg-[#111] px-2 py-1.5 text-sm text-zinc-400"
                    >
                      <span className="text-xs text-zinc-500">
                        {m.fromAgent?.name ?? "?"} → {m.toAgent?.name ?? "?"}
                        {m.timestamp != null &&
                          ` · ${formatDistanceToNow(m.timestamp, { addSuffix: true })}`}
                      </span>
                      <p className="mt-0.5">{m.content ?? "—"}</p>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No messages</p>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Section 6: Send Message — input #111/#222, button primary */}
        <div className="mt-4 border-t border-[#222] pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-zinc-500">
            Send message
          </h4>
          {Array.isArray(otherAgents) && otherAgents.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <label className="text-xs text-zinc-500">Send as:</label>
              <select
                value={sendAsName}
                onChange={(e) => setSendAsName(e.target.value)}
                className="rounded-md border border-[#222] bg-[#111] px-2 py-1 text-xs text-zinc-50"
              >
                {otherAgents.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
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
    </div>
  );
}
