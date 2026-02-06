"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type DateFilterMode = "day" | "week" | "30days";

const LABELS: Record<DateFilterMode, string> = {
  day: "Today",
  week: "This Week",
  "30days": "30 Days",
};

interface DateFilterProps {
  mode: DateFilterMode;
  onModeChange: (mode: DateFilterMode) => void;
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onGoToToday?: () => void;
  showArrows?: boolean;
}

export function DateFilter({
  mode,
  onModeChange,
  date,
  onPrev,
  onNext,
  onGoToToday,
  showArrows = true,
}: DateFilterProps) {
  const isToday =
    date.getDate() === new Date().getDate() &&
    date.getMonth() === new Date().getMonth() &&
    date.getFullYear() === new Date().getFullYear();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(LABELS) as DateFilterMode[]).map((m) => (
        <Button
          key={m}
          variant={mode === m ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange(m)}
          className={
            mode === m
              ? "bg-gray-500 text-primary hover:bg-gray-600"
              : "border-border-default bg-surface-1/50 text-secondary hover:bg-surface-1 hover:text-primary"
          }
        >
          {LABELS[m]}
        </Button>
      ))}
      {showArrows && mode === "day" && (
        <>
          <button
            type="button"
            onClick={onPrev}
            className="rounded-lg border border-border-default bg-surface-1/50 p-2 text-secondary hover:bg-surface-1 hover:text-primary"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {!isToday && onGoToToday && (
            <Button variant="outline" size="sm" onClick={onGoToToday} className="border-border-default bg-surface-1/50 text-secondary hover:bg-surface-1 hover:text-primary">
              Go to today
            </Button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg border border-border-default bg-surface-1/50 p-2 text-secondary hover:bg-surface-1 hover:text-primary"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
