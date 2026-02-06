"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useViewerMode } from "@/contexts/ViewerModeContext";

interface AgentSettingsModalProps {
  open: boolean;
  agentId: Id<"agents"> | null;
  onClose: () => void;
}

const EMOJI_OPTIONS = ["🤖", "👨‍💻", "👩‍💻", "🧑‍💼", "🦾", "🧠", "⚡", "🎯", "🔧", "💡"];
const STATUS_OPTIONS = ["online", "idle", "busy", "offline"];
const MODEL_OPTIONS = ["claude", "codex"] as const;

/**
 * AGT-230: Agent Settings Modal — hidden in demo mode
 */
export function AgentSettingsModal({ open, agentId, onClose }: AgentSettingsModalProps) {
  const { isViewerMode } = useViewerMode();
  const agent = useQuery(api.agents.get, agentId ? { id: agentId } : "skip");
  const updateAgent = useMutation(api.agents.update);
  const updateStatus = useMutation(api.agents.updateStatus);
  const updatePreferredModel = useMutation(api.agents.updatePreferredModel);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [role, setRole] = useState<"pm" | "backend" | "frontend">("pm");
  const [status, setStatus] = useState<"online" | "idle" | "busy" | "offline">("idle");
  const [model, setModel] = useState<"claude" | "codex">("claude");
  const [isSaving, setIsSaving] = useState(false);

  // Track original values to only update what changed
  const originalValues = useRef<{
    name: string;
    avatar: string;
    role: "pm" | "backend" | "frontend";
    status: "online" | "idle" | "busy" | "offline";
    model: "claude" | "codex";
  } | null>(null);

  useEffect(() => {
    if (agent) {
      const agentStatus = (agent.status ?? "idle") as "online" | "idle" | "busy" | "offline";
      const agentModel = ((agent as { metadata?: { preferredModel?: string } }).metadata?.preferredModel === "codex" ? "codex" : "claude") as "claude" | "codex";
      setName(agent.name);
      setAvatar(agent.avatar);
      setRole(agent.role as "pm" | "backend" | "frontend");
      setStatus(agentStatus);
      setModel(agentModel);
      originalValues.current = {
        name: agent.name,
        avatar: agent.avatar,
        role: agent.role as "pm" | "backend" | "frontend",
        status: agentStatus,
        model: agentModel,
      };
    }
  }, [agent]);

  // AGT-230: Don't render modal in demo mode
  if (!open || !agentId || isViewerMode) return null;

  const handleSave = async () => {
    if (!agentId) return;
    setIsSaving(true);
    try {
      const orig = originalValues.current;
      const promises: Promise<unknown>[] = [];

      // Update basic info if changed
      if (!orig || name !== orig.name || avatar !== orig.avatar || role !== orig.role) {
        promises.push(updateAgent({ id: agentId, name, avatar, role }));
      }

      // Update status if changed
      if (!orig || status !== orig.status) {
        promises.push(updateStatus({ id: agentId, status }));
      }

      // Update model if changed
      if (!orig || model !== orig.model) {
        promises.push(updatePreferredModel({ agentId, model }));
      }

      await Promise.all(promises);
      onClose();
    } catch (e) {
      console.error("Failed to save agent settings:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="w-full max-w-md rounded-lg border border-border-default bg-surface-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Agent Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs text-secondary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-border-default bg-base px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Avatar */}
          <div>
            <label className="mb-1 block text-xs text-secondary">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded border text-xl transition-colors ${
                    avatar === emoji
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-border-default hover:border-gray-500"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-xs text-secondary">Role</label>
            <div className="flex gap-2">
              {(["pm", "backend", "frontend"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded border px-3 py-2 text-sm capitalize transition-colors ${
                    role === r
                      ? "border-blue-500 bg-blue-500/20 text-primary"
                      : "border-border-default text-secondary hover:border-gray-500"
                  }`}
                >
                  {r === "pm" ? "PM" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="mb-1 block text-xs text-secondary">Model</label>
            <div className="flex gap-2">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`flex-1 rounded border px-3 py-2 text-sm capitalize transition-colors ${
                    model === m
                      ? "border-blue-500 bg-blue-500/20 text-primary"
                      : "border-border-default text-secondary hover:border-gray-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs text-secondary">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "online" | "idle" | "busy" | "offline")}
              className="w-full rounded border border-border-default bg-base px-3 py-2 text-sm text-primary focus:border-blue-500 focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border-default px-4 py-2 text-sm text-secondary hover:border-gray-500 hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
