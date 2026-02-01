"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Check, X, Brain, FileText, StickyNote, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

/**
 * AGT-111: Context Boot Protocol — Boot Status indicator
 * AGT-113: Memory UI — SOUL (read-only), WORKING (editable), Daily Notes (timeline)
 */
export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as Id<"agents">;
  const [activeTab, setActiveTab] = useState<"overview" | "memory">("overview");
  const [workingContent, setWorkingContent] = useState("");
  const [workingInitialized, setWorkingInitialized] = useState(false);
  const [isSavingWorking, setIsSavingWorking] = useState(false);

  const agent = useQuery(api.agents.get, agentId ? { id: agentId } : "skip");
  const bootContext = useQuery(api.agentMemory.getBootContext, agentId ? { agentId } : "skip");
  const soulMemory = useQuery(
    api.agentMemory.getMemory,
    agentId ? { agentId, type: "soul" } : "skip"
  );
  const workingMemory = useQuery(
    api.agentMemory.getMemory,
    agentId ? { agentId, type: "working" } : "skip"
  );
  const dailyNotes = useQuery(
    api.agentMemory.listDailyNotes,
    agentId ? { agentId, limit: 10 } : "skip"
  );
  const inProgressTasks = useQuery(
    api.tasks.getByAssignee,
    agentId ? { assignee: agentId } : "skip"
  );
  const tasksInProgress = inProgressTasks?.filter((t) => t.status === "in_progress") ?? [];

  const upsertMemory = useMutation(api.agentMemory.upsertMemory);

  const soulLoaded = !!bootContext?.soul;
  const workingLoaded = !!bootContext?.working;
  const last3Daily = (dailyNotes?.length ?? 0) >= 3;
  const currentTasksLoaded = true;

  const bootChecklist = [
    { label: "SOUL loaded", ok: soulLoaded },
    { label: "WORKING loaded", ok: workingLoaded },
    { label: "Last 3 daily notes", ok: last3Daily },
    { label: "Current tasks", ok: currentTasksLoaded },
  ];

  const workingDisplay = workingMemory?.content ?? "";
  useEffect(() => {
    if (workingDisplay && !workingInitialized) {
      setWorkingContent(workingDisplay);
      setWorkingInitialized(true);
    }
  }, [workingDisplay, workingInitialized]);

  const handleSaveWorking = async () => {
    if (!agentId) return;
    setIsSavingWorking(true);
    try {
      await upsertMemory({
        agentId,
        type: "working",
        content: workingContent,
        expectedVersion: workingMemory?.version,
      });
    } finally {
      setIsSavingWorking(false);
    }
  };

  if (!agentId) {
    return (
      <div className="h-full bg-black p-8">
        <p className="text-zinc-500">Invalid agent</p>
        <Link href="/agents" className="text-zinc-400 hover:text-zinc-50 mt-2 inline-block">
          ← Back to Agents
        </Link>
      </div>
    );
  }

  if (agent === undefined) {
    return (
      <div className="h-full bg-black p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (agent === null) {
    return (
      <div className="h-full bg-black p-8">
        <p className="text-zinc-500">Agent not found</p>
        <Link href="/agents" className="text-zinc-400 hover:text-zinc-50 mt-2 inline-block">
          ← Back to Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full bg-black p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16 border-2 border-zinc-800">
            <AvatarFallback className="bg-zinc-800 text-xl text-zinc-50">
              {agent.avatar}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-50">{agent.name}</h1>
            <Badge variant="outline" className="mt-1 text-zinc-400 border-zinc-700">
              {agent.role}
            </Badge>
          </div>
        </div>

        {/* AGT-111: Context Boot Protocol — checklist when data present */}
        <Card className="mb-6 border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-zinc-50 text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Boot Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {bootChecklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                  <span className={cn("text-sm", item.ok ? "text-zinc-300" : "text-zinc-500")}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "border-zinc-700",
              activeTab === "overview" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400"
            )}
          >
            Overview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("memory")}
            className={cn(
              "border-zinc-700",
              activeTab === "memory" ? "bg-zinc-800 text-zinc-50" : "text-zinc-400"
            )}
          >
            Memory
          </Button>
        </div>

        {activeTab === "overview" && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-50">Current Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksInProgress.length > 0 ? (
                <ul className="space-y-2">
                  {tasksInProgress.map((t) => (
                    <li key={t._id} className="text-sm text-zinc-300">
                      {t.linearIdentifier ?? "—"}: {t.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No tasks in progress</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "memory" && (
          <div className="space-y-6">
            {/* SOUL.md — read-only */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-50 text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  SOUL.md
                </CardTitle>
                <p className="text-xs text-zinc-500">Identity & role — read-only</p>
              </CardHeader>
              <CardContent>
                {soulMemory?.content ? (
                  <div className="prose prose-invert prose-zinc max-w-none prose-headings:text-zinc-50 prose-p:text-zinc-300 prose-pre:bg-zinc-800 rounded-lg p-4 text-sm">
                    <ReactMarkdown>{soulMemory.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No SOUL loaded. Run seedSoulMemories.</p>
                )}
              </CardContent>
            </Card>

            {/* WORKING.md — editable */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-50 text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  WORKING.md
                </CardTitle>
                <p className="text-xs text-zinc-500">Current task, status, blockers — editable</p>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full min-h-[200px] rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-200 font-mono resize-y"
                  value={workingContent}
                  onChange={(e) => setWorkingContent(e.target.value)}
                  placeholder="Current task, status, blockers..."
                />
                <Button
                  onClick={handleSaveWorking}
                  disabled={isSavingWorking}
                  className="mt-3 border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                >
                  {isSavingWorking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Daily Notes — timeline */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader>
                <CardTitle className="text-zinc-50 text-base">Daily Notes</CardTitle>
                <p className="text-xs text-zinc-500">Reverse-chronological</p>
              </CardHeader>
              <CardContent>
                {dailyNotes && dailyNotes.length > 0 ? (
                  <ul className="space-y-4">
                    {dailyNotes.map((note) => (
                      <li key={note._id} className="border-l-2 border-zinc-700 pl-4">
                        <p className="text-xs text-zinc-500">
                          {note.date ?? "—"} · {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                        </p>
                        <div className="prose prose-invert prose-zinc max-w-none prose-p:text-zinc-300 text-sm mt-1">
                          <ReactMarkdown>{note.content}</ReactMarkdown>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No daily notes yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
