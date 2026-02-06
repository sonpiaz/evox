"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { Id } from "@/convex/_generated/dataModel";
import type { MainViewTab } from "@/components/evox/ViewTabs";

interface UseKeyboardShortcutsProps {
  agents: { _id: Id<"agents"> }[];
  onAgentSwitch: (agentId: Id<"agents">) => void;
  onToggleScratchPad: () => void;
  onToggleHelp: () => void;
  onCloseModals: () => void;
  onViewTabChange?: (tab: MainViewTab) => void;
}

export function useKeyboardShortcuts({
  agents,
  onAgentSwitch,
  onToggleScratchPad,
  onToggleHelp,
  onCloseModals,
  onViewTabChange,
}: UseKeyboardShortcutsProps) {
  // Cmd+0/1/2/3 = switch view tabs
  useHotkeys(
    "meta+0",
    (e) => {
      e.preventDefault();
      onViewTabChange?.("ceo");
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    "meta+1",
    (e) => {
      e.preventDefault();
      onViewTabChange?.("kanban");
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    "meta+2",
    (e) => {
      e.preventDefault();
      onViewTabChange?.("health");
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    "meta+3",
    (e) => {
      e.preventDefault();
      onViewTabChange?.("comms");
    },
    { enableOnFormTags: false }
  );

  // Cmd+Shift+1/2/3 = switch to agent 1/2/3
  useHotkeys(
    "meta+shift+1",
    (e) => {
      e.preventDefault();
      if (agents[0]) onAgentSwitch(agents[0]._id);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    "meta+shift+2",
    (e) => {
      e.preventDefault();
      if (agents[1]) onAgentSwitch(agents[1]._id);
    },
    { enableOnFormTags: false }
  );

  useHotkeys(
    "meta+shift+3",
    (e) => {
      e.preventDefault();
      if (agents[2]) onAgentSwitch(agents[2]._id);
    },
    { enableOnFormTags: false }
  );

  // Cmd+Shift+N = toggle scratch pad
  useHotkeys(
    "meta+shift+n",
    (e) => {
      e.preventDefault();
      onToggleScratchPad();
    },
    { enableOnFormTags: false }
  );

  // Cmd+/ = toggle help modal
  useHotkeys(
    "meta+/",
    (e) => {
      e.preventDefault();
      onToggleHelp();
    },
    { enableOnFormTags: false }
  );

  // Esc = close modals
  useHotkeys(
    "escape",
    (e) => {
      e.preventDefault();
      onCloseModals();
    },
    { enableOnFormTags: true }
  );
}
