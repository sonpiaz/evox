"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { CostBarChart } from "./CostBarChart";
import { TrendBadge } from "./TrendBadge";
import { BudgetAlert } from "./BudgetAlert";

interface CostDashboardProps {
  agentId?: Id<"agents">;
  agentName?: string;
  className?: string;
  budget?: number;
}

type TimeFilter = "today" | "7days" | "30days";

/**
 * AGT-200: Full cost dashboard for Agent Profile Costs tab
 */
export function CostDashboard({
  agentId,
  agentName,
  className,
  budget = 100,
}: CostDashboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");

  const days = timeFilter === "today" ? 1 : timeFilter === "7days" ? 7 : 30;
  const startTs = startOfDay(subDays(new Date(), days - 1)).getTime();
  const endTs = endOfDay(new Date()).getTime();

  // Fetch cost data for agent
  const dailyCosts = useQuery(api.costs.getCostsByDateRange, {
    startTs,
    endTs,
    agentName: agentName?.toLowerCase(),
  });

  // Fetch all agents costs for comparison
  const allAgentCosts = useQuery(api.costs.getCostsByAgent, {
    startTs,
    endTs,
  });

  const stats = useMemo(() => {
    if (!dailyCosts) return null;

    // Daily breakdown
    const daily = dailyCosts.dailyBreakdown.map((d: { date: string; cost: number }) => ({
      label: format(new Date(d.date), "MMM d"),
      value: d.cost,
    }));

    // Token stats
    const inputTokens = dailyCosts.totals.inputTokens;
    const outputTokens = dailyCosts.totals.outputTokens;
    const totalCost = dailyCosts.totals.cost;

    return {
      daily,
      inputTokens,
      outputTokens,
      totalCost,
    };
  }, [dailyCosts]);

  // Agent comparison
  const agentComparison = useMemo(() => {
    if (!allAgentCosts) return [];
    return allAgentCosts.agents.map((a: { agentName: string; totalCost: number }) => ({
      label: a.agentName.toUpperCase(),
      value: a.totalCost,
    }));
  }, [allAgentCosts]);

  if (!stats) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <span className="animate-pulse text-sm text-zinc-500">Loading cost data...</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with time filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-semibold text-white">COST BREAKDOWN</span>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="today">Today</option>
          <option value="7days">7 days</option>
          <option value="30days">30 days</option>
        </select>
      </div>

      {/* Budget Alert */}
      <BudgetAlert current={stats.totalCost} budget={budget} />

      {/* Daily cost breakdown */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Daily Costs {agentName && `(${agentName.toUpperCase()})`}
        </h4>
        {stats.daily.length > 0 ? (
          <CostBarChart data={stats.daily} />
        ) : (
          <p className="text-sm text-zinc-500">No cost data for this period</p>
        )}
      </div>

      {/* Agent comparison (if not filtered to specific agent) */}
      {!agentName && agentComparison.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            By Agent
          </h4>
          <CostBarChart data={agentComparison} />
        </div>
      )}

      {/* Token usage */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          🔢 TOKEN USAGE
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Input</p>
            <p className="text-lg font-semibold text-white">
              {(stats.inputTokens / 1000).toFixed(1)}K
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Output</p>
            <p className="text-lg font-semibold text-white">
              {(stats.outputTokens / 1000).toFixed(1)}K
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Total Cost</span>
          <span className="text-xl font-bold text-emerald-400">
            ${stats.totalCost.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-500">Budget Remaining</span>
          <span
            className={cn(
              "text-sm font-medium",
              budget - stats.totalCost > 0 ? "text-zinc-300" : "text-red-400"
            )}
          >
            ${(budget - stats.totalCost).toFixed(2)} / ${budget.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
