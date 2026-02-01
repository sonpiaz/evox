"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, ChevronRight, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StandupSummary } from "@/components/standup-summary";
import { StandupAgentCard } from "@/components/standup-agent-card";

/** Map agent role to StandupAgentCard color */
const roleToColor = {
  backend: "green" as const,
  frontend: "purple" as const,
  pm: "blue" as const,
};

/** User's local day as UTC timestamps (start and end of day) for Convex standup */
function toDayRange(d: Date): { startTs: number; endTs: number } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const end = start + 24 * 60 * 60 * 1000 - 1;
  return { startTs: start, endTs: end };
}

export default function StandupPage() {
  const [date, setDate] = useState(new Date());
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success">("idle");
  const dayRange = useMemo(() => toDayRange(date), [date]);

  const standupData = useQuery(api.standup.getDaily, dayRange);
  const standupSummary = useQuery(api.standup.getDailySummary, dayRange);
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

  // Map Convex standup data to StandupAgentCard props
  const agentCards = useMemo(() => {
    if (!standupData?.agents) return [];
    return standupData.agents.map((report) => {
      const color = roleToColor[report.agent.role] ?? "blue";
      const toTask = (t: { id: string; title: string; linearIdentifier?: string }) => ({
        id: t.id,
        title: t.title,
        identifier: t.linearIdentifier ?? t.id,
      });
      return {
        name: report.agent.name,
        avatar: report.agent.avatar,
        color,
        done: report.completed.map(toTask),
        wip: report.inProgress.map(toTask),
        blocked: report.blocked.map(toTask),
      };
    });
  }, [standupData]);

  const totalDone = standupSummary?.tasksCompleted ?? 0;
  const totalWip = standupSummary?.tasksInProgress ?? 0;
  const totalBlocked = standupSummary?.tasksBlocked ?? 0;

  const isLoading = standupData === undefined || standupSummary === undefined;

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

        {/* Agent Cards Grid - live data from Convex (synced from Linear) */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-900 p-4"
              >
                <div className="mb-4 h-10 w-24 rounded bg-zinc-700" />
                <div className="space-y-3">
                  <div className="h-4 rounded bg-zinc-700" />
                  <div className="h-4 rounded bg-zinc-700" />
                  <div className="h-4 w-3/4 rounded bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        ) : agentCards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {agentCards.map((card) => (
              <StandupAgentCard key={card.name} {...card} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
            No agents or tasks for this date. Run seed and sync Linear, then try Sync Now.
          </div>
        )}
      </div>
    </div>
  );
}
