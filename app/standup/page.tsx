"use client";

import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, ChevronRight, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StandupSummary } from "@/components/standup-summary";
import { StandupAgentCard } from "@/components/standup-agent-card";

// Mock data
const mockStandupData = {
  sam: {
    name: "Sam",
    avatar: "SM",
    color: "green" as const,
    done: [
      { id: "agt-74", title: "Convex HTTP endpoint for agent heartbeat", identifier: "AGT-74" },
      { id: "agt-75", title: "CLI heartbeat script", identifier: "AGT-75" },
    ],
    wip: [
      { id: "agt-80", title: "Planning Phase 2 features", identifier: "AGT-80" },
    ],
    blocked: [],
  },
  leo: {
    name: "Leo",
    avatar: "LO",
    color: "purple" as const,
    done: [
      { id: "agt-66", title: "Dashboard layout + sidebar nav", identifier: "AGT-66" },
      { id: "agt-67", title: "Agent Cards component", identifier: "AGT-67" },
      { id: "agt-68", title: "Task Board (Kanban)", identifier: "AGT-68" },
      { id: "agt-69", title: "Activity Feed", identifier: "AGT-69" },
    ],
    wip: [
      { id: "agt-70", title: "Task Detail Page", identifier: "AGT-70" },
      { id: "agt-71", title: "Message Thread", identifier: "AGT-71" },
    ],
    blocked: [],
  },
  max: {
    name: "Max",
    avatar: "MX",
    color: "blue" as const,
    done: [],
    wip: [
      { id: "agt-82", title: "Reviewing architecture decisions", identifier: "AGT-82" },
    ],
    blocked: [],
  },
};

export default function StandupPage() {
  const [date, setDate] = useState(new Date());
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success">("idle");
  const triggerSync = useAction(api.linearSync.triggerSync);

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const goToPrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const handleSyncNow = async () => {
    setSyncState("syncing");
    try {
      await triggerSync({});
      setSyncState("success");
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncState("idle");
    }
  };

  // Fade success state back to idle after 2 seconds
  useEffect(() => {
    if (syncState === "success") {
      const timer = setTimeout(() => {
        setSyncState("idle");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  // Calculate totals
  const agents = Object.values(mockStandupData);
  const totalDone = agents.reduce((sum, agent) => sum + agent.done.length, 0);
  const totalWip = agents.reduce((sum, agent) => sum + agent.wip.length, 0);
  const totalBlocked = agents.reduce((sum, agent) => sum + agent.blocked.length, 0);

  return (
    <div className="h-full overflow-y-auto bg-black p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header with Date Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-50">Daily Standup</h1>
              <p className="text-sm text-zinc-500">{formatDate(date)}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncNow}
              disabled={syncState === "syncing"}
              className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
            >
              {syncState === "syncing" ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Syncing...
                </>
              ) : syncState === "success" ? (
                <>
                  <Check className="mr-2 h-3 w-3 text-green-500" />
                  Synced
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Sync Now
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevDay}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {!isToday(date) && (
              <button
                onClick={goToToday}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
              >
                Today
              </button>
            )}

            <button
              onClick={goToNextDay}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <StandupSummary
          doneCount={totalDone}
          wipCount={totalWip}
          blockedCount={totalBlocked}
        />

        {/* Agent Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StandupAgentCard {...mockStandupData.sam} />
          <StandupAgentCard {...mockStandupData.leo} />
          <StandupAgentCard {...mockStandupData.max} />
        </div>
      </div>
    </div>
  );
}
