"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendBadge } from "./TrendBadge";

interface VelocityDataPoint {
  label: string; // Day label (e.g., "M", "T", "W")
  value: number; // Tasks completed
  date: string;  // Full date for tooltip
}

interface VelocityChartProps {
  data: VelocityDataPoint[];
  className?: string;
}

/**
 * AGT-205: Velocity sparkline chart showing tasks completed per day
 */
export function VelocityChart({ data, className }: VelocityChartProps) {
  // Calculate stats
  const stats = useMemo(() => {
    if (data.length === 0) return { avg: 0, trend: 0, total: 0 };

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const avg = Math.round(total / data.length);

    // Compare last 3 days vs previous 3 days for trend
    if (data.length >= 6) {
      const recent = data.slice(-3).reduce((sum, d) => sum + d.value, 0);
      const previous = data.slice(-6, -3).reduce((sum, d) => sum + d.value, 0);
      const trend = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : 0;
      return { avg, trend, total };
    }

    return { avg, trend: 0, total };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className={cn("text-center text-zinc-500 py-8", className)}>
        No velocity data available
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555555", fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#555555", fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333333",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#888888" }}
              formatter={(value) => [`${value ?? 0} tasks`, "Completed"]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.date;
                }
                return label;
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: "#22c55e", strokeWidth: 0, r: 3 }}
              activeDot={{ fill: "#22c55e", strokeWidth: 0, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-400">
          <span className="text-white font-medium">{stats.avg}</span> tasks/day avg
        </span>
        {stats.trend !== 0 && (
          <TrendBadge value={stats.trend} label="vs last period" />
        )}
      </div>
    </div>
  );
}
