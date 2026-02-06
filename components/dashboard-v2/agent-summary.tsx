"use client";

interface AgentSummaryProps {
  total: number;
  active: number;
}

export function AgentSummary({ total, active }: AgentSummaryProps) {
  return (
    <p className="px-3 py-2 text-xs text-primary0">
      {total} total, {active} active
    </p>
  );
}
