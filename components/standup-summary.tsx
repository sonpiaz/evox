import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface StandupSummaryProps {
  doneCount: number;
  wipCount: number;
  blockedCount: number;
}

export function StandupSummary({ doneCount, wipCount, blockedCount }: StandupSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-zinc-50">{doneCount}</p>
            <p className="text-xs text-zinc-500">Completed</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold text-zinc-50">{wipCount}</p>
            <p className="text-xs text-zinc-500">In Progress</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-zinc-50">{blockedCount}</p>
            <p className="text-xs text-zinc-500">Blocked</p>
          </div>
        </div>
      </div>
    </div>
  );
}
