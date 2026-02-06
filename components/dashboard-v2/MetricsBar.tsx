"use client";

/**
 * MetricsBar - Key metrics at a glance
 * Shows: Tasks Done Today, Velocity, Active Agents, Blockers
 */

interface MetricsBarProps {
  tasksToday: number;
  velocity: number;
  activeAgents: number;
  totalAgents: number;
  blockers: number;
}

export function MetricsBar({
  tasksToday,
  velocity,
  activeAgents,
  totalAgents,
  blockers,
}: MetricsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Tasks Done Today */}
      <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
        <div className="text-3xl sm:text-2xl font-bold text-white">
          {tasksToday}
        </div>
        <div className="text-primary0 text-xs uppercase tracking-wide mt-1">
          Tasks Today
        </div>
      </div>

      {/* Velocity */}
      <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
        <div className="text-3xl sm:text-2xl font-bold text-blue-400">
          {velocity.toFixed(1)}
        </div>
        <div className="text-primary0 text-xs uppercase tracking-wide mt-1">
          Tasks/Hour
        </div>
      </div>

      {/* Active Agents */}
      <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
        <div className="text-3xl sm:text-2xl font-bold text-green-400">
          {activeAgents}/{totalAgents}
        </div>
        <div className="text-primary0 text-xs uppercase tracking-wide mt-1">
          Agents Online
        </div>
      </div>

      {/* Blockers */}
      <div className={`rounded-xl p-4 border ${
        blockers > 0
          ? "bg-red-950/50 border-red-900/50"
          : "bg-surface-1/80 border-border-default"
      }`}>
        <div className={`text-3xl sm:text-2xl font-bold ${
          blockers > 0 ? "text-red-400" : "text-secondary"
        }`}>
          {blockers}
        </div>
        <div className={`text-xs uppercase tracking-wide mt-1 ${
          blockers > 0 ? "text-red-400/70" : "text-primary0"
        }`}>
          Blockers
        </div>
      </div>
    </div>
  );
}
