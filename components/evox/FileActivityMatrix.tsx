"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface FileActivityMatrixProps {
  className?: string;
  limit?: number;
}

type FileActivity = {
  _id: string;
  agentName: string;
  filePath: string;
  action: "read" | "write" | "create" | "delete";
  timestamp: number;
  linesChanged?: number;
};

/** Action colors */
const actionColors: Record<string, { dot: string; text: string; glow: string }> = {
  read: { dot: "bg-blue-500", text: "text-blue-400", glow: "shadow-blue-500/50" },
  write: { dot: "bg-emerald-500", text: "text-emerald-400", glow: "shadow-emerald-500/50" },
  create: { dot: "bg-purple-500", text: "text-purple-400", glow: "shadow-purple-500/50" },
  delete: { dot: "bg-red-500", text: "text-red-400", glow: "shadow-red-500/50" },
};

/** Group files by first directory level */
function groupByFolder(files: FileActivity[]): Map<string, FileActivity[]> {
  const groups = new Map<string, FileActivity[]>();

  for (const file of files) {
    const parts = file.filePath.split("/");
    const folder = parts.length > 1 ? parts[0] : "(root)";

    if (!groups.has(folder)) {
      groups.set(folder, []);
    }
    groups.get(folder)!.push(file);
  }

  return groups;
}

/** Get unique files with latest activity */
function getUniqueFiles(activities: FileActivity[]): Map<string, FileActivity> {
  const fileMap = new Map<string, FileActivity>();

  // Sort by timestamp desc to get latest first
  const sorted = [...activities].sort((a, b) => b.timestamp - a.timestamp);

  for (const activity of sorted) {
    if (!fileMap.has(activity.filePath)) {
      fileMap.set(activity.filePath, activity);
    }
  }

  return fileMap;
}

/** Check if activity is recent (within 5 minutes) */
function isRecent(timestamp: number): boolean {
  const currentTime = new Date().getTime();
  return currentTime - timestamp < 5 * 60 * 1000;
}

/**
 * AGT-195: File Activity Matrix
 * Dot matrix visualization showing files being read/written in realtime
 */
export function FileActivityMatrix({ className, limit = 50 }: FileActivityMatrixProps) {
  const [viewMode, setViewMode] = useState<"matrix" | "tree">("matrix");
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);

  // Real-time subscription to file activity
  const activities = useQuery(api.execution.getRecentFileActivity, { limit }) as FileActivity[] | undefined;

  // Get unique files and group by folder
  const { fileMap, folderGroups } = useMemo(() => {
    if (!activities || activities.length === 0) {
      return { fileMap: new Map(), folderGroups: new Map() };
    }

    const fileMap = getUniqueFiles(activities);
    const folderGroups = groupByFolder(Array.from(fileMap.values()));

    return { fileMap, folderGroups };
  }, [activities]);

  // Get hovered file details
  const hoveredActivity = hoveredFile ? fileMap.get(hoveredFile) : null;

  if (!activities || activities.length === 0) {
    return (
      <div className={cn("flex flex-col border border-border-default bg-surface-1 rounded-lg", className)}>
        <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-secondary">
            <span>📁</span>
            <span className="uppercase tracking-wider">File Activity</span>
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center py-8 text-xs text-tertiary">
          No recent file activity
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col border border-border-default bg-surface-1 rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <span className="flex items-center gap-2 text-xs text-secondary">
          <span>📁</span>
          <span className="uppercase tracking-wider">File Activity</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium">
            {fileMap.size}
          </span>
        </span>

        {/* View toggle */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={cn(
              "rounded px-2 py-1 text-[10px] transition-colors",
              viewMode === "matrix"
                ? "bg-white/10 text-white"
                : "text-tertiary hover:text-secondary"
            )}
          >
            Matrix
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={cn(
              "rounded px-2 py-1 text-[10px] transition-colors",
              viewMode === "tree"
                ? "bg-white/10 text-white"
                : "text-tertiary hover:text-secondary"
            )}
          >
            Tree
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {viewMode === "matrix" ? (
          <MatrixView
            folderGroups={folderGroups}
            fileMap={fileMap}
            hoveredFile={hoveredFile}
            onHover={setHoveredFile}
          />
        ) : (
          <TreeView
            folderGroups={folderGroups}
            fileMap={fileMap}
            hoveredFile={hoveredFile}
            onHover={setHoveredFile}
          />
        )}
      </div>

      {/* Tooltip */}
      {hoveredActivity && (
        <div className="border-t border-border-default px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("font-medium", actionColors[hoveredActivity.action]?.text)}>
              {hoveredActivity.action.toUpperCase()}
            </span>
            <span className="font-mono text-primary">{hoveredActivity.filePath}</span>
            <span className="text-tertiary">by</span>
            <span className="font-medium text-primary">{hoveredActivity.agentName.toUpperCase()}</span>
            <span className="text-[10px] text-tertiary">
              {formatDistanceToNow(hoveredActivity.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-border-default px-3 py-2">
        {Object.entries(actionColors).map(([action, colors]) => (
          <div key={action} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", colors.dot)} />
            <span className="text-[10px] text-tertiary capitalize">{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Matrix view - dots grouped by folder */
function MatrixView({
  folderGroups,
  fileMap,
  hoveredFile,
  onHover,
}: {
  folderGroups: Map<string, FileActivity[]>;
  fileMap: Map<string, FileActivity>;
  hoveredFile: string | null;
  onHover: (file: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {Array.from(folderGroups.entries()).map(([folder, files]) => (
        <div key={folder} className="flex items-start gap-3">
          {/* Folder name */}
          <div className="w-24 shrink-0 truncate text-xs text-secondary">
            {folder}/
          </div>

          {/* Dots grid */}
          <div className="flex flex-wrap gap-1.5">
            {files.map((file) => {
              const recent = isRecent(file.timestamp);
              const colors = actionColors[file.action] ?? actionColors.read;
              const isHovered = hoveredFile === file.filePath;

              return (
                <button
                  key={file.filePath}
                  type="button"
                  onMouseEnter={() => onHover(file.filePath)}
                  onMouseLeave={() => onHover(null)}
                  className={cn(
                    "h-3 w-3 rounded-full transition-all",
                    colors.dot,
                    recent && "animate-pulse shadow-lg",
                    recent && colors.glow,
                    isHovered && "ring-2 ring-white/50 scale-125"
                  )}
                  title={file.filePath}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tree view - file tree with activity indicators */
function TreeView({
  folderGroups,
  fileMap,
  hoveredFile,
  onHover,
}: {
  folderGroups: Map<string, FileActivity[]>;
  fileMap: Map<string, FileActivity>;
  hoveredFile: string | null;
  onHover: (file: string | null) => void;
}) {
  return (
    <div className="space-y-2 font-mono text-xs">
      {Array.from(folderGroups.entries()).map(([folder, files]) => (
        <div key={folder}>
          {/* Folder */}
          <div className="flex items-center gap-2 text-secondary">
            <span>📁</span>
            <span>{folder}/</span>
          </div>

          {/* Files */}
          <div className="ml-4 mt-1 space-y-1">
            {files.map((file, idx) => {
              const fileName = file.filePath.split("/").pop() ?? file.filePath;
              const recent = isRecent(file.timestamp);
              const colors = actionColors[file.action] ?? actionColors.read;
              const isHovered = hoveredFile === file.filePath;
              const isLast = idx === files.length - 1;

              return (
                <button
                  key={file.filePath}
                  type="button"
                  onMouseEnter={() => onHover(file.filePath)}
                  onMouseLeave={() => onHover(null)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors",
                    isHovered && "bg-white/5"
                  )}
                >
                  <span className="text-tertiary">{isLast ? "└─" : "├─"}</span>
                  <span className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    colors.dot,
                    recent && "animate-pulse"
                  )} />
                  <span className={cn(
                    "truncate",
                    recent ? "text-primary" : "text-secondary"
                  )}>
                    {fileName}
                  </span>
                  <span className={cn("shrink-0 text-[10px]", colors.text)}>
                    {file.agentName.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
