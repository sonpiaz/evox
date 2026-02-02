"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

/** AGT-138: Standup range — Today (single day), This Week (last 7 days), 30 Days (last 30 days) */
export type StandupRangeMode = "day" | "week" | "30days";

/** Full day range for a given date (UTC ms) */
function getDayRange(d: Date): { startTs: number; endTs: number } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const start = new Date(y, m, day).getTime();
  return { startTs: start, endTs: start + 24 * 60 * 60 * 1000 - 1 };
}

/** AGT-138: Compute startTs/endTs for Today / This Week / 30 Days; summary cards filter by this range */
function getRangeForMode(rangeMode: StandupRangeMode, date: Date): { startTs: number; endTs: number } {
  if (rangeMode === "day") {
    return getDayRange(date);
  }
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const daysAgo = rangeMode === "week" ? 7 : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysAgo);
  const startOfRange = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  return { startTs: startOfRange, endTs: endOfToday };
}

const RANGE_BUTTON_LABELS: Record<StandupRangeMode, string> = {
  day: "Today",
  week: "This Week",
  "30days": "30 Days",
};

const SYNC_INTERVAL_MS = 60 * 1000; // 60s (AGT-133)

/** Never show raw Convex _id — identifier column only linearIdentifier or "—" (BUG 2) */
function sanitizeIdentifier(linearIdentifier?: string | null): string {
  if (!linearIdentifier || typeof linearIdentifier !== "string") return "—";
  if (linearIdentifier.length >= 26 && /^[a-z0-9]+$/i.test(linearIdentifier)) return "—";
  return linearIdentifier;
}

export default function StandupPage() {
  const [date, setDate] = useState(new Date());
  const [rangeMode, setRangeMode] = useState<StandupRangeMode>("day");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "success">("idle");
  const dayRange = useMemo(() => getRangeForMode(rangeMode, date), [rangeMode, date]);

  const standupData = useQuery(api.standup.getDaily, dayRange);
  const standupSummary = useQuery(api.standup.getDailySummary, dayRange);
  const triggerSync = useAction(api.linearSync.triggerSync);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AGT-133: Auto-sync on mount + every 60s (manual Sync Now still available)
  useEffect(() => {
    const runSync = () => {
      triggerSync({}).catch((err) => console.warn("Standup auto-sync failed:", err));
    };
    runSync();
    syncIntervalRef.current = setInterval(runSync, SYNC_INTERVAL_MS);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [triggerSync]);

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

  // AGT-142: Canonical standup agents — display "Max" not "Son", order Max → Sam → Leo
  const STANDUP_DISPLAY_NAMES: Record<string, string> = {
    Son: "Max",
    son: "Max",
    Max: "Max",
    SAM: "Sam",
    Sam: "Sam",
    sam: "Sam",
    LEO: "Leo",
    Leo: "Leo",
    leo: "Leo",
  };
  const STANDUP_ORDER = ["Max", "Sam", "Leo"];

  interface StandupTask {
    id: string;
    title: string;
    linearIdentifier?: string | null;
  }
  interface StandupAgent {
    name: string;
    role: "pm" | "backend" | "frontend";
    avatar?: string;
  }
  interface StandupReport {
    agent: StandupAgent;
    completed: StandupTask[];
    inProgress: StandupTask[];
    backlog: StandupTask[];
    blocked: StandupTask[];
  }

  const agentCards = useMemo(() => {
    if (!standupData?.agents) return [];
    const toTask = (t: StandupTask) => ({
      id: t.id,
      title: t.title,
      identifier: sanitizeIdentifier(t.linearIdentifier),
    });
    const cards = (standupData.agents as StandupReport[]).map((report) => {
      const color = roleToColor[report.agent.role] ?? "blue";
      const rawName = report.agent.name ?? "Unknown";
      const displayName = STANDUP_DISPLAY_NAMES[rawName] ?? rawName;
      return {
        displayName,
        rawName,
        avatar: report.agent.avatar ?? "?",
        color,
        done: report.completed.map(toTask),
        wip: report.inProgress.map(toTask),
        backlog: report.backlog.map(toTask),
        blocked: report.blocked.map(toTask),
      };
    });
    // Sort: Max, Sam, Leo (fill missing with empty so we always show 3)
    const byDisplay = new Map(cards.map((c) => [c.displayName, c]));
    return STANDUP_ORDER.map((name) => {
      const existing = byDisplay.get(name);
      if (existing)
        return {
          name: existing.displayName,
          avatar: existing.avatar,
          color: existing.color,
          done: existing.done,
          wip: existing.wip,
          backlog: existing.backlog,
          blocked: existing.blocked,
        };
      return {
        name,
        avatar: name.charAt(0),
        color: "blue" as const,
        done: [],
        wip: [],
        backlog: [],
        blocked: [],
      };
    });
  }, [standupData]);

  const totalDone = standupSummary?.tasksCompleted ?? 0;
  const totalWip = standupSummary?.tasksInProgress ?? 0;
  const totalBacklog = standupSummary?.tasksBacklog ?? 0;
  const totalBlocked = standupSummary?.tasksBlocked ?? 0;

  const isLoading = standupData === undefined || standupSummary === undefined;

  return (
    <div className="h-full overflow-y-auto bg-black p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header with Range (Day/Week/30 Days) + Date Navigation — AGT-138 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-50">Standup</h1>
              <p className="text-sm text-zinc-500">
                {rangeMode === "day" && formatDate(date)}
                {rangeMode === "week" && "This week"}
                {rangeMode === "30days" && "Last 30 days"}
              </p>
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

          <div className="flex flex-wrap items-center gap-2">
            {/* AGT-138: [Today] [This Week] [30 Days] buttons */}
            {(Object.keys(RANGE_BUTTON_LABELS) as StandupRangeMode[]).map((mode) => (
              <Button
                key={mode}
                variant={rangeMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setRangeMode(mode)}
                className={
                  rangeMode === mode
                    ? "bg-zinc-700 text-zinc-50 hover:bg-zinc-600"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
                }
              >
                {RANGE_BUTTON_LABELS[mode]}
              </Button>
            ))}

            {/* ← → arrows: only when Today (day navigation) */}
            {rangeMode === "day" && (
              <>
                <button
                  onClick={goToPrevDay}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {!isToday(date) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50"
                  >
                    Go to today
                  </Button>
                )}
                <button
                  onClick={goToNextDay}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <StandupSummary
          doneCount={totalDone}
          wipCount={totalWip}
          backlogCount={totalBacklog}
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
            {rangeMode === "day"
              ? "No agents or tasks for this date. Run seed and sync Linear, then try Sync Now."
              : "No agents or tasks for this range. Run seed and sync Linear, then try Sync Now."}
          </div>
        )}
      </div>
    </div>
  );
}
