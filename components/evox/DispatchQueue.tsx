"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useViewerMode } from "@/contexts/ViewerModeContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DispatchQueueProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

type Dispatch = {
  _id: string;
  agentName?: string;
  command: string;
  payload?: string;
  status: string;
  createdAt?: number;
  priority?: "urgent" | "high" | "normal" | "low";
  blocked?: boolean;
  blockedReason?: string;
};

/** Status colors */
const statusConfig: Record<string, { dot: string; text: string }> = {
  pending: { dot: "bg-yellow-500", text: "text-yellow-500" },
  running: { dot: "bg-blue-500 agent-pulse", text: "text-blue-500" },
  completed: { dot: "bg-green-500", text: "text-green-500" },
  failed: { dot: "bg-red-500", text: "text-red-500" },
  blocked: { dot: "bg-orange-500", text: "text-orange-500" },
};

/** Priority badges */
const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: "URGENT", color: "bg-red-500/20 text-red-400" },
  high: { label: "HIGH", color: "bg-orange-500/20 text-orange-400" },
  normal: { label: "", color: "" },
  low: { label: "LOW", color: "bg-gray-500/20 text-gray-400" },
};

/**
 * AGT-203: Dispatch Queue v2
 * - Drag-drop reorder
 * - Blocked status indicator
 * - Priority badges
 * - Add Task button
 */
export function DispatchQueue({ className, collapsed = false, onToggle }: DispatchQueueProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const { isViewerMode } = useViewerMode();

  const pending = useQuery(api.dispatches.listActive) as Dispatch[] | undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const count = pending?.length ?? 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !pending) return;

    // For now, just log the reorder - backend mutation would be needed
    const oldIndex = pending.findIndex((d) => d._id === active.id);
    const newIndex = pending.findIndex((d) => d._id === over.id);
    console.log(`Reorder: ${oldIndex} -> ${newIndex}`);
    // TODO: Call reorderDispatch mutation when backend supports it
  };

  // Header only mode when collapsed
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-10 w-full items-center justify-between border-t border-border-default bg-surface-1 px-3 text-tertiary transition-colors hover:bg-surface-1",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <span>⚡</span>
          <span className="text-xs">Dispatch Queue</span>
        </span>
        {count > 0 && (
          <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-col border-t border-border-default bg-surface-1", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 transition-colors hover:text-white"
        >
          <span>⚡</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-tertiary">
            Dispatch Queue
          </span>
          {count > 0 && (
            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
              {count}
            </span>
          )}
        </button>
        {!isViewerMode && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded px-2 py-0.5 text-[10px] text-tertiary transition-colors hover:bg-white/5 hover:text-tertiary"
          >
            + Add Dispatch
          </button>
        )}
      </div>

      {/* Add form (placeholder) */}
      {showAddForm && (
        <div className="border-b border-border-default bg-base px-3 py-2">
          <div className="text-[10px] text-tertiary">
            Add task form (dispatch via OpenClaw CLI)
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="openclaw dispatch sam work_ticket AGT-XXX"
              className="flex-1 rounded border border-gray-500 bg-surface-1 px-2 py-1 text-xs text-white placeholder-tertiary focus:border-gray-500 focus:outline-none"
            />
            <button
              type="button"
              className="rounded bg-blue-500/20 px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/30"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Queue items with drag-drop */}
      {count === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-tertiary">
          No pending dispatches
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pending?.map((d) => d._id) ?? []}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-40 overflow-y-auto">
              {pending?.map((dispatch) => (
                <SortableDispatchItem key={dispatch._id} dispatch={dispatch} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/** Sortable dispatch item */
function SortableDispatchItem({ dispatch }: { dispatch: Dispatch }) {
  const { isViewerMode } = useViewerMode();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dispatch._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = dispatch.blocked
    ? statusConfig.blocked
    : statusConfig[dispatch.status] ?? statusConfig.pending;
  const agentName = (dispatch.agentName ?? "?").toUpperCase();
  const waitTime = dispatch.createdAt
    ? formatDistanceToNow(dispatch.createdAt, { addSuffix: false })
    : "—";

  // Parse payload for display
  let payloadSummary = "";
  try {
    const payload = dispatch.payload ? JSON.parse(dispatch.payload) : null;
    payloadSummary = payload?.ticketId ?? payload?.linearIdentifier ?? "";
  } catch {
    payloadSummary = dispatch.payload?.slice(0, 20) ?? "";
  }

  const priority = dispatch.priority ?? "normal";
  const priorityBadge = priorityConfig[priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 border-b border-border-default px-3 py-2 text-xs transition-colors",
        isDragging && "bg-surface-1 opacity-80 shadow-lg",
        dispatch.blocked && "bg-orange-500/5"
      )}
    >
      {/* Drag handle — hidden in viewer mode (AGT-230) */}
      {!isViewerMode && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-tertiary hover:text-tertiary active:cursor-grabbing"
        >
          ⠿
        </button>
      )}

      {/* Status dot */}
      <span className={cn("h-2 w-2 shrink-0 rounded-full", config.dot)} />

      {/* Priority badge */}
      {priorityBadge.label && (
        <span className={cn("shrink-0 rounded px-1 py-0.5 text-[9px] font-medium", priorityBadge.color)}>
          {priorityBadge.label}
        </span>
      )}

      {/* Agent */}
      <span className="w-10 shrink-0 truncate font-medium text-primary">
        {agentName}
      </span>

      {/* Command */}
      <span className="shrink-0 font-mono text-tertiary">
        {dispatch.command}
      </span>

      {/* Payload summary */}
      {payloadSummary && (
        <span className="shrink-0 font-mono text-primary">
          {payloadSummary}
        </span>
      )}

      {/* Status */}
      <span className={cn("shrink-0", config.text)}>
        {dispatch.blocked ? "blocked" : dispatch.status}
      </span>

      {/* Blocked indicator */}
      {dispatch.blocked && dispatch.blockedReason && (
        <span className="shrink-0 text-[10px] text-orange-400" title={dispatch.blockedReason}>
          ({dispatch.blockedReason})
        </span>
      )}

      {/* Spacer */}
      <span className="flex-1" />

      {/* Wait time */}
      <span className="shrink-0 text-[10px] text-tertiary">
        {waitTime}
      </span>
    </div>
  );
}
