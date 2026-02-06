"use client";

import { cn } from "@/lib/utils";

/** AGT-172: Right context panel shell 400px — default content Activity (AGT-173 switches content) */
interface ContextPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextPanel({ children, className = "" }: ContextPanelProps) {
  return (
    <aside
      className={cn(
        "flex w-[400px] shrink-0 flex-col border-l border-white/[0.06] bg-base",
        className
      )}
    >
      {children}
    </aside>
  );
}
