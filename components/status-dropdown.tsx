"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "backlog" | "todo" | "in_progress" | "done";

interface StatusDropdownProps {
  value: TaskStatus;
  onChange?: (status: TaskStatus) => void;
}

const statusOptions: { value: TaskStatus; label: string; color: string }[] = [
  { value: "backlog", label: "Backlog", color: "text-secondary" },
  { value: "todo", label: "Todo", color: "text-blue-400" },
  { value: "in_progress", label: "In Progress", color: "text-yellow-400" },
  { value: "done", label: "Done", color: "text-green-400" },
];

export function StatusDropdown({ value, onChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentStatus = statusOptions.find((opt) => opt.value === value);

  const handleSelect = (status: TaskStatus) => {
    onChange?.(status);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border-default bg-surface-1/50 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-1",
          currentStatus?.color
        )}
      >
        {currentStatus?.label}
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-border-default bg-surface-1 p-1 shadow-lg">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors hover:bg-surface-4",
                  option.color
                )}
              >
                {option.label}
                {value === option.value && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
