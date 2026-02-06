"use client";

import { cn } from "@/lib/utils";

interface CostBarItem {
  label: string;
  value: number;
  color?: string;
}

interface CostBarChartProps {
  data: CostBarItem[];
  className?: string;
}

/**
 * AGT-200: Horizontal bar chart for cost visualization
 */
export function CostBarChart({ data, className }: CostBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <div className={cn("text-center text-sm text-zinc-500", className)}>
        No cost data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((item, idx) => {
        const width = (item.value / maxValue) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-20 text-xs text-zinc-400 truncate">{item.label}</span>
            <div className="flex-1 h-4 rounded bg-zinc-900 overflow-hidden">
              <div
                className="h-full rounded transition-[width] duration-500"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.color || "#3b82f6",
                }}
              />
            </div>
            <span className="w-16 text-right text-xs font-medium text-emerald-400">
              ${item.value.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
