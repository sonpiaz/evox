"use client";

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: "⌘ + 1", description: "Switch to Agent 1 (Max)" },
  { keys: "⌘ + 2", description: "Switch to Agent 2 (Sam)" },
  { keys: "⌘ + 3", description: "Switch to Agent 3 (Leo)" },
  { keys: "⌘ + ⇧ + N", description: "Toggle Scratch Pad" },
  { keys: "⌘ + /", description: "Show this help" },
  { keys: "Esc", description: "Close modals" },
];

export function ShortcutsHelpModal({ open, onClose }: ShortcutsHelpModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map(({ keys, description }) => (
            <div key={keys} className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">{description}</span>
              <kbd className="rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-50">
                {keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
