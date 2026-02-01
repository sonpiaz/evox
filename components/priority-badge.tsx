import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Priority = "p1" | "p2" | "p3" | "p4";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const priorityConfig = {
  p1: {
    label: "P1",
    className: "border-red-500/20 bg-red-500/10 text-red-500",
  },
  p2: {
    label: "P2",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-500",
  },
  p3: {
    label: "P3",
    className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
  },
  p4: {
    label: "P4",
    className: "border-zinc-600/20 bg-zinc-600/10 text-zinc-500",
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
