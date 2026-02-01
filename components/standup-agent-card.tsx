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
  blocked,
}: StandupAgentCardProps) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      {/* Agent Header */}
      <div className="flex items-center gap-3">
        <Avatar className={cn("h-10 w-10 border-2", colorClasses[color])}>
          <AvatarFallback className={cn("text-sm text-white", colorClasses[color])}>
            {avatar}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-zinc-50">{name}</h3>
      </div>

      {/* Done Section */}
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
          <p className="px-3 py-2 text-xs text-zinc-600">No completed tasks</p>
        )}
      </div>

      {/* WIP Section */}
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
          <p className="px-3 py-2 text-xs text-zinc-600">No tasks in progress</p>
        )}
      </div>

      {/* Blocked Section */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-red-500">
          Blocked ({blocked.length})
        </h4>
        {blocked.length > 0 ? (
          <div className="space-y-1">
            {blocked.map((task) => (
              <StandupTaskItem key={task.id} {...task} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-2 text-xs text-zinc-600">No blocked tasks</p>
        )}
      </div>
    </div>
  );
}
