"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { CostBarChart } from "./CostBarChart";
import { TrendBadge } from "./TrendBadge";
import { BudgetAlert } from "./BudgetAlert";

interface CostWidgetProps {
  className?: string;
  budget?: number;
}

type TimeFilter = "7days" | "30days";

const agentColors: Record<string, string> = {
  sam: "#8b5cf6", // purple
  leo: "#3b82f6", // blue
  max: "#10b981", // green
};

/**
 * AGT-200: Compact cost widget for sidebar
 */
export function CostWidget({ className, budget = 100 }: CostWidgetProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");

  const days = timeFilter === "7days" ? 7 : 30;
  const startTs = startOfDay(subDays(new Date(), days - 1)).getTime();
  const endTs = endOfDay(new Date()).getTime();

  // Current period
  const costData = useQuery(api.costs.getCostsByAgent, {
    startTs,
    endTs,
  });

  // Previous period for trend
  const prevStartTs = startOfDay(subDays(new Date(), days * 2 - 1)).getTime();
  const prevEndTs = startOfDay(subDays(new Date(), days)).getTime();
  const prevCostData = useQuery(api.costs.getCostsByAgent, {
    startTs: prevStartTs,
    endTs: prevEndTs,
  });

  const stats = useMemo(() => {
    if (!costData) return null;

    const agents = costData.agents.map((a: { agentName: string; totalCost: number }) => ({
      label: a.agentName.toUpperCase(),
      value: a.totalCost,
      color: agentColors[a.agentName.toLowerCase()] || "#666",
    }));

    const totalCost = costData.totalCost;
    const totalTokens = costData.totalTokens;

    // Calculate trend
    const prevTotal = prevCostData?.totalCost ?? 0;
    const trend =
      prevTotal > 0 ? Math.round(((totalCost - prevTotal) / prevTotal) * 100) : 0;

    return {
      agents,
      totalCost,
      totalTokens,
      trend,
    };
  }, [costData, prevCostData]);

  if (!stats) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <span className="animate-pulse text-sm text-zinc-500">Loading costs...</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">💰</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            COSTS
          </span>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="7days">7 days</option>
          <option value="30days">30 days</option>
        </select>
      </div>

      {/* Budget Alert */}
      <BudgetAlert current={stats.totalCost} budget={budget} className="mb-3" />

      {/* Agent breakdown */}
      <CostBarChart data={stats.agents} className="mb-4" />

      {/* Totals */}
      <div className="border-t border-zinc-800 pt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">TOTAL</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              ${stats.totalCost.toFixed(2)}
            </span>
            {stats.trend !== 0 && <TrendBadge value={stats.trend} />}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Tokens</span>
          <span className="text-xs text-zinc-400">
            {(stats.totalTokens / 1000).toFixed(1)}K
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Budget left</span>
          <span
            className={cn(
              "text-xs font-medium",
              budget - stats.totalCost > 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            ${(budget - stats.totalCost).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
