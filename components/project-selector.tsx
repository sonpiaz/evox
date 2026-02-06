"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Check, ChevronDown, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectSelectorProps {
  selectedProjectId: Id<"projects"> | null;
  onSelectProject: (projectId: Id<"projects"> | null) => void;
}

export function ProjectSelector({ selectedProjectId, onSelectProject }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const projects = useQuery(api.projects.list);

  const selectedProject = projects?.find((p: { _id: Id<"projects">; name: string }) => p._id === selectedProjectId);

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-border-default bg-surface-1/50 px-3 py-2 text-sm text-primary hover:bg-surface-4 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-secondary" />
          <span className="font-medium">
            {selectedProject ? selectedProject.name : "All Projects"}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-secondary transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-3 right-3 top-full z-20 mt-1 rounded-lg border border-border-default bg-surface-1 shadow-lg">
            <div className="max-h-64 overflow-y-auto py-1">
              {/* All Projects option */}
              <button
                onClick={() => {
                  onSelectProject(null);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface-4 transition-colors",
                  selectedProjectId === null ? "text-purple-400" : "text-primary"
                )}
              >
                <span>All Projects</span>
                {selectedProjectId === null && (
                  <Check className="h-4 w-4" />
                )}
              </button>

              {/* Project list */}
              {projects?.map((project: { _id: Id<"projects">; name: string }) => (
                <button
                  key={project._id}
                  onClick={() => {
                    onSelectProject(project._id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface-4 transition-colors",
                    selectedProjectId === project._id ? "text-purple-400" : "text-primary"
                  )}
                >
                  <span>{project.name}</span>
                  {selectedProjectId === project._id && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
