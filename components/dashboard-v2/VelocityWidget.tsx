"use client";

/**
 * VelocityWidget - Velocity tracking
 * Shows: Tasks completed, rate, trend, per-agent breakdown
 */

interface AgentVelocity {
  name: string;
  tasksToday: number;
  tasksWeek: number;
}

interface VelocityWidgetProps {
  tasksToday: number;
  tasksWeek: number;
  tasksPerHour: number;
  previousTasksPerHour?: number; // For trend calculation
  agentVelocities?: AgentVelocity[];
}

type TrendDirection = "up" | "down" | "stable";

function calculateTrend(current: number, previous?: number): TrendDirection {
  if (!previous || previous === 0) return "stable";
  const diff = current - previous;
  if (diff > 0.1) return "up";
  if (diff < -0.1) return "down";
  return "stable";
}

const trendConfig: Record<TrendDirection, { icon: string; color: string }> = {
  up: { icon: "↑", color: "text-green-400" },
  down: { icon: "↓", color: "text-red-400" },
  stable: { icon: "→", color: "text-secondary" },
};

export function VelocityWidget({
  tasksToday,
  tasksWeek,
  tasksPerHour,
  previousTasksPerHour,
  agentVelocities = [],
}: VelocityWidgetProps) {
  const trend = calculateTrend(tasksPerHour, previousTasksPerHour);
  const trendStyle = trendConfig[trend];

  return (
    <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary">Velocity</h3>
        <div className="flex items-center gap-1">
          <span className={`text-lg font-bold ${trendStyle.color}`}>
            {trendStyle.icon}
          </span>
          <span className="text-xs text-primary0">
            {trend === "up" ? "Improving" : trend === "down" ? "Slowing" : "Steady"}
          </span>
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{tasksToday}</div>
          <div className="text-[10px] text-primary0 uppercase">Today</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{tasksWeek}</div>
          <div className="text-[10px] text-primary0 uppercase">This Week</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {tasksPerHour.toFixed(1)}
          </div>
          <div className="text-[10px] text-primary0 uppercase">Tasks/hr</div>
        </div>
      </div>

      {/* Per-agent breakdown */}
      {agentVelocities.length > 0 && (
        <div className="border-t border-border-default pt-3">
          <div className="text-[10px] text-primary0 uppercase mb-2">By Agent</div>
          <div className="space-y-1.5">
            {agentVelocities.slice(0, 4).map((agent) => (
              <div key={agent.name} className="flex items-center justify-between">
                <span className="text-xs text-secondary">{agent.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-primary">
                    {agent.tasksToday} today
                  </span>
                  <div className="w-16 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (agent.tasksToday / Math.max(tasksToday, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
