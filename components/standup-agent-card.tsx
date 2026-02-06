import { StandupTaskItem } from "@/components/standup-task-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  identifier: string;
}

interface StandupAgentCardProps {
  name: string;
  avatar: string;
  color: "blue" | "green" | "purple";
  done: Task[];
  wip: Task[];
  /** Backlog = status backlog or todo */
  backlog: Task[];
  /** Blocked = keyword "blocked" in title/description only */
  blocked: Task[];
}

const colorClasses = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
};

export function StandupAgentCard({
  name,
  avatar,
  color,
  done,
  wip,
  backlog,
  blocked,
}: StandupAgentCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border-default bg-surface-1 p-4">
      {/* Agent Header */}
      <div className="flex items-center gap-3">
        <Avatar className={cn("h-10 w-10 border-2", colorClasses[color])}>
          <AvatarFallback className={cn("text-sm text-white", colorClasses[color])}>
            {avatar}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-primary">{name}</h3>
      </div>

      {/* AGT-133 Leo: order In Progress → Backlog → Done */}

      {/* In Progress */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-yellow-500">
          In Progress ({wip.length})
        </h4>
        {wip.length > 0 ? (
          <div className="space-y-1">
            {wip.map((task) => (
              <StandupTaskItem key={task.id} {...task} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-tertiary">No tasks in progress</p>
        )}
      </div>

      {/* Backlog (status backlog or todo) */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-primary0">
          Backlog ({backlog.length})
        </h4>
        {backlog.length > 0 ? (
          <div className="space-y-1">
            {backlog.map((task) => (
              <StandupTaskItem key={task.id} {...task} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-tertiary">No backlog tasks</p>
        )}
      </div>

      {/* Done */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-green-500">
          Done ({done.length})
        </h4>
        {done.length > 0 ? (
          <div className="space-y-1">
            {done.map((task) => (
              <StandupTaskItem key={task.id} {...task} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-tertiary">No completed tasks</p>
        )}
      </div>

      {/* Blocked Section (keyword "blocked" only) */}
      {blocked.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-500">
            Blocked ({blocked.length})
          </h4>
          <div className="space-y-1">
            {blocked.map((task) => (
              <StandupTaskItem key={task.id} {...task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
