"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useViewerMode } from "@/contexts/ViewerModeContext";

const MENTION_REGEX = /@(Max|Sam|Leo|Son|Ella|all)/gi;

/** Comment type */
type TaskComment = {
  _id: string;
  agentName?: string;
  agentAvatar?: string;
  content: string;
  createdAt?: number;
};

/** Inline text: highlight @mentions in blue */
function TextWithMentions({ children }: { children?: React.ReactNode }) {
  const s = children != null ? String(children) : "";
  const parts = s.split(MENTION_REGEX);
  if (parts.length <= 1) return <>{children}</>;
  return (
    <>
      {parts.map((p, i) =>
        /@(?:Max|Sam|Leo|Son|Ella|all)/i.test(p) ? (
          <span key={i} className="text-blue-400 font-medium">
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  );
}

interface TaskCommentThreadProps {
  taskId: Id<"tasks">;
}

/**
 * AGT-114: Comment thread — chat-style, oldest first, add comment as Son, markdown + @mention highlight
 * AGT-230: Add comment form hidden in demo mode
 */
export function TaskCommentThread({ taskId }: TaskCommentThreadProps) {
  const { isViewerMode } = useViewerMode();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  const comments = useQuery(api.taskComments.listByTask, { taskId });
  const postComment = useMutation(api.taskComments.postComment);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    try {
      await postComment({ taskId, agentName: "Son", content });
      setDraft("");
    } catch {
      // keep draft on error
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h4 className="text-xs font-semibold uppercase tracking-[0.05em] text-primary0 mb-2">Comments</h4>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 border border-border-default rounded-lg bg-base p-3">
        {!comments || comments.length === 0 ? (
          <p className="text-sm text-primary0 py-4">No comments yet. Agents will post updates here.</p>
        ) : (
          (comments as TaskComment[]).map((c) => (
            <div key={c._id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0 border border-border-default">
                <AvatarFallback className="bg-surface-1 text-[10px] text-secondary">
                  {c.agentName?.slice(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-primary">
                    {c.agentName ?? "Unknown"}
                  </span>
                  <span
                    className="text-xs text-primary0"
                    title={c.createdAt != null ? new Date(c.createdAt).toLocaleString() : undefined}
                  >
                    {c.createdAt != null ? formatDistanceToNow(c.createdAt, { addSuffix: true }) : ""}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-sm text-secondary prose prose-invert prose-sm max-w-none",
                    "break-words [&_a]:text-blue-400 [&_code]:bg-surface-4 [&_code]:px-1 [&_pre]:bg-surface-1 [&_pre]:p-2 [&_pre]:rounded"
                  )}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="m-0">{children}</p>,
                      text: ({ children }) => <TextWithMentions>{children}</TextWithMentions>,
                    }}
                  >
                    {c.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {/* AGT-230: Hide comment form in demo mode */}
      {!isViewerMode && (
        <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 min-h-[80px] rounded border border-border-default bg-surface-1 px-3 py-2 text-sm text-primary placeholder:text-primary0 focus:outline-none focus:ring-1 focus:ring-gray-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 self-end rounded border border-border-default bg-surface-4 px-3 py-2 text-xs font-medium text-primary hover:bg-gray-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            Add comment
          </button>
        </form>
      )}
    </div>
  );
}
