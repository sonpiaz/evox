"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DailyNoteCard } from "./DailyNoteCard";

interface DailyNote {
  _id: string;
  date?: string;
  content?: string;
  updatedAt?: number;
}

interface DailyNotesListProps {
  notes: DailyNote[];
  className?: string;
}

/**
 * AGT-113: Daily notes timeline with search and date picker
 */
export function DailyNotesList({ notes, className }: DailyNotesListProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Filter notes by search
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const lower = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.content?.toLowerCase().includes(lower) ||
        n.date?.toLowerCase().includes(lower)
    );
  }, [notes, search]);

  // Show first 5 by default
  const displayNotes = showAll ? filteredNotes : filteredNotes.slice(0, 5);
  const hasMore = filteredNotes.length > 5;

  if (notes.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border-default bg-surface-1 p-4", className)}>
        <p className="text-sm text-tertiary">No daily notes yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            DAILY NOTES
          </span>
          <span className="text-xs text-tertiary">({notes.length})</span>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-32 rounded border border-border-default bg-base px-2 py-1 text-xs text-primary placeholder:text-tertiary focus:border-gray-500 focus:outline-none"
        />
      </div>

      {/* Notes list */}
      <div className="space-y-2">
        {displayNotes.map((note) => (
          <DailyNoteCard
            key={note._id}
            date={note.date ?? ""}
            content={note.content ?? ""}
            updatedAt={note.updatedAt}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full rounded border border-border-default py-2 text-xs text-tertiary hover:bg-surface-1 hover:text-secondary"
        >
          Load more ({filteredNotes.length - 5} more notes)
        </button>
      )}

      {/* Search results info */}
      {search && (
        <p className="text-xs text-tertiary">
          {filteredNotes.length} of {notes.length} notes match "{search}"
        </p>
      )}
    </div>
  );
}
