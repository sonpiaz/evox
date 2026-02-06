import Link from "next/link";
import { cn } from "@/lib/utils";

interface StandupTaskItemProps {
  id: string;
  title: string;
  identifier: string; // e.g., "AGT-70"
  className?: string;
}

export function StandupTaskItem({ id, title, identifier, className }: StandupTaskItemProps) {
  return (
    <Link
      href={`/tasks/${id}`}
      className={cn(
        "block rounded px-3 py-2 text-sm transition-colors hover:bg-surface-4",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 font-mono text-xs text-primary0">{identifier}</span>
        <span className="text-primary">{title}</span>
      </div>
    </Link>
  );
}
