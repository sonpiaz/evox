"use client";

import { cn } from "@/lib/utils";

interface AgentStat {
  name: string;
  avatar: string;
  tasksCompleted: number;
  cost: number;
}

interface AgentBreakdownProps {
  agents: AgentStat[];
  className?: string;
}

/**
 * AGT-205: Per-agent task completion and cost breakdown
 */
export function AgentBreakdown({ agents, className }: AgentBreakdownProps) {
  // Sort by tasks completed (descending)
  const sorted = [...agents].sort((a, b) => b.tasksCompleted - a.tasksCompleted);
  const maxTasks = Math.max(...agents.map((a) => a.tasksCompleted), 1);

  if (agents.length === 0) {
    return (
      <div className={cn("text-center text-zinc-500 py-4", className)}>
        No agent data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 sm:space-y-3", className)}>
      {sorted.map((agent) => {
        const barWidth = (agent.tasksCompleted / maxTasks) * 100;
        return (
          <div key={agent.name} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            {/* Agent avatar, name + stats row on mobile */}
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg">{agent.avatar}</span>
                <span className="text-xs sm:text-sm font-medium text-white uppercase">
                  {agent.name}
                </span>
              </div>
              {/* Stats shown inline on mobile */}
              <div className="flex sm:hidden items-center gap-2 text-right">
                <span className="text-xs text-white font-medium">
                  {agent.tasksCompleted}
                </span>
                <span className="text-xs text-emerald-400">
                  ${agent.cost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 h-3 sm:h-5 rounded bg-zinc-900 overflow-hidden">
              <div
                className="h-full rounded bg-gradient-to-r from-blue-600 to-blue-400 transition-[width] duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {/* Stats - hidden on mobile, shown on larger screens */}
            <div className="hidden sm:flex items-center gap-4 w-32 flex-shrink-0 text-right">
              <span className="text-sm text-white font-medium">
                {agent.tasksCompleted} tasks
              </span>
              <span className="text-sm text-emerald-400 w-16">
                ${agent.cost.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
