"use client";

/**
 * DispatchList - Recent dispatches
 * Shows: 5 most recent dispatches with status
 */

interface Dispatch {
  id: string;
  agentName?: string;
  command?: string;
  status: "pending" | "running" | "completed" | "failed";
  priority?: number;
  createdAt?: number;
}

interface DispatchListProps {
  dispatches: Dispatch[];
  limit?: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  running: "bg-blue-500 animate-pulse",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Done",
  failed: "Failed",
};

function formatTime(timestamp?: number): string {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h`;
}

export function DispatchList({ dispatches, limit = 5 }: DispatchListProps) {
  const displayDispatches = dispatches.slice(0, limit);

  if (displayDispatches.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-primary0">
        No dispatches in queue
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-secondary">Dispatch Queue</h2>
        <span className="text-[10px] text-tertiary">{dispatches.length} total</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {displayDispatches.map((dispatch, i) => (
          <div
            key={dispatch.id || i}
            className="bg-surface-1/50 rounded-lg p-3 flex items-center gap-3 min-h-[48px]"
          >
            {/* Status dot */}
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${statusColors[dispatch.status] || "bg-gray-600"}`}
            />

            {/* Agent */}
            <span className="text-xs font-semibold text-primary w-12 shrink-0">
              {dispatch.agentName || "?"}
            </span>

            {/* Command */}
            <span className="flex-1 text-xs text-secondary truncate">
              {dispatch.command || "No command"}
            </span>

            {/* Status label */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded ${
                dispatch.status === "running"
                  ? "bg-blue-900/50 text-blue-400"
                  : dispatch.status === "pending"
                  ? "bg-yellow-900/50 text-yellow-400"
                  : dispatch.status === "completed"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-red-900/50 text-red-400"
              }`}
            >
              {statusLabels[dispatch.status] || dispatch.status}
            </span>

            {/* Time */}
            {dispatch.createdAt && (
              <span className="text-[10px] text-tertiary shrink-0">
                {formatTime(dispatch.createdAt)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
