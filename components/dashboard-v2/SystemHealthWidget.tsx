"use client";

/**
 * SystemHealthWidget - System health overview
 * Shows: Overall status, agent breakdown, uptime, last incident
 */

interface Agent {
  computedStatus: string;
}

interface SystemHealthWidgetProps {
  agents: Agent[];
  uptime?: number; // percentage 0-100
  lastIncident?: number; // timestamp
}

type HealthStatus = "healthy" | "degraded" | "critical";

function calculateHealthStatus(agents: Agent[]): HealthStatus {
  if (agents.length === 0) return "critical";

  const onlineCount = agents.filter(
    (a) => a.computedStatus === "online" || a.computedStatus === "busy"
  ).length;

  const ratio = onlineCount / agents.length;

  if (ratio >= 0.8) return "healthy";
  if (ratio >= 0.5) return "degraded";
  return "critical";
}

const statusConfig: Record<HealthStatus, { color: string; bg: string; label: string }> = {
  healthy: {
    color: "text-green-400",
    bg: "bg-green-500",
    label: "All Systems Operational",
  },
  degraded: {
    color: "text-yellow-400",
    bg: "bg-yellow-500",
    label: "Partial Outage",
  },
  critical: {
    color: "text-red-400",
    bg: "bg-red-500",
    label: "Major Outage",
  },
};

function formatLastIncident(timestamp?: number): string {
  if (!timestamp) return "No incidents";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SystemHealthWidget({
  agents,
  uptime = 99.9,
  lastIncident,
}: SystemHealthWidgetProps) {
  const healthStatus = calculateHealthStatus(agents);
  const config = statusConfig[healthStatus];

  const onlineCount = agents.filter(
    (a) => a.computedStatus === "online"
  ).length;
  const busyCount = agents.filter(
    (a) => a.computedStatus === "busy"
  ).length;
  const offlineCount = agents.filter(
    (a) => a.computedStatus === "offline" || a.computedStatus === "idle"
  ).length;

  return (
    <div className="bg-surface-1/80 rounded-xl p-4 border border-border-default">
      {/* Header with overall status */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-secondary">System Health</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.bg} ${healthStatus !== "critical" ? "" : "animate-pulse"}`} />
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Agent breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{onlineCount}</div>
          <div className="text-[10px] text-primary0 uppercase">Online</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{busyCount}</div>
          <div className="text-[10px] text-primary0 uppercase">Busy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{offlineCount}</div>
          <div className="text-[10px] text-primary0 uppercase">Offline</div>
        </div>
      </div>

      {/* Uptime and last incident */}
      <div className="flex items-center justify-between text-xs border-t border-border-default pt-3">
        <div>
          <span className="text-primary0">Uptime: </span>
          <span className={uptime >= 99 ? "text-green-400" : uptime >= 95 ? "text-yellow-400" : "text-red-400"}>
            {uptime.toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-primary0">Last incident: </span>
          <span className="text-primary">{formatLastIncident(lastIncident)}</span>
        </div>
      </div>
    </div>
  );
}
