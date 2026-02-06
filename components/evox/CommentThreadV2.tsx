"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useViewerMode } from "@/contexts/ViewerModeContext";

const MENTION_REGEX = /@(Max|Sam|Leo|Son|Ella|Quinn|all)/gi;

/** Comment type */
type TaskComment = {
  _id: string;
  agentName?: string;
  agentAvatar?: string;
  content: string;
  createdAt?: number;
  parentId?: string;
};

/** Inline text: highlight @mentions in blue */
function TextWithMentions({ children }: { children?: React.ReactNode }) {
  const s = children != null ? String(children) : "";
  const parts = s.split(MENTION_REGEX);
  if (parts.length <= 1) return <>{children}</>;

  return (
    <>
      {parts.map((p, i) =>
        /@(?:Max|Sam|Leo|Son|Ella|Quinn|all)/i.test(p) ? (
          <span key={i} className="text-blue-400 font-semibold">
            @{p}
          </span>
        ) : (
          p
        )
      )}
    </>
  );
}

interface MentionAutocompleteProps {
  query: string;
  onSelect: (name: string) => void;
  position: { top: number; left: number };
}

/** @mention autocomplete dropdown */
function MentionAutocomplete({ query, onSelect, position }: MentionAutocompleteProps) {
  const agents = useQuery(api.agents.list);

  const filtered = useMemo(() => {
    if (!agents) return [];
    const lowerQuery = query.toLowerCase();
    return agents
      .filter((a: any) => a.name.toLowerCase().startsWith(lowerQuery))
      .slice(0, 5);
  }, [agents, query]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-48 rounded-lg border border-gray-500 bg-surface-1 shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((agent: any) => (
        <button
          key={agent._id}
          type="button"
          onClick={() => onSelect(agent.name)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-surface-4 transition-colors first:rounded-t-lg last:rounded-b-lg"
        >
          <span className="text-lg">{agent.avatar || "🤖"}</span>
          <span className="font-medium uppercase">{agent.name}</span>
        </button>
      ))}
    </div>
  );
}

interface CommentItemProps {
  comment: TaskComment;
  onReply: (commentId: string, agentName: string) => void;
  isReply?: boolean;
  replyCount?: number;
  isExpanded?: boolean;
  onToggleReplies?: () => void;
}

/** Individual comment card */
function CommentItem({ comment, onReply, isReply, replyCount, isExpanded, onToggleReplies }: CommentItemProps) {
  return (
    <div className={cn(
      "flex gap-3 rounded-lg border border-border-default bg-surface-1 p-4 hover:border-gray-500 transition-colors",
      isReply && "ml-8 border-l-2 border-l-blue-500/30"
    )}>
      {/* Avatar */}
      <div className="shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-500 bg-surface-1 text-lg">
          {comment.agentAvatar || "🤖"}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase">
              {comment.agentName || "Unknown"}
            </span>
            <span className="text-xs text-tertiary">
              {comment.createdAt ? formatDistanceToNow(comment.createdAt, { addSuffix: true }) : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle replies button (only for top-level comments with replies) */}
            {!isReply && replyCount && replyCount > 0 && onToggleReplies && (
              <button
                type="button"
                onClick={onToggleReplies}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                {isExpanded ? "▼" : "▶"} {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onReply(comment._id, comment.agentName || "Unknown")}
              className="text-xs text-tertiary hover:text-blue-400 transition-colors"
            >
              Reply
            </button>
          </div>
        </div>

        {/* Comment text */}
        <div className="prose prose-invert prose-sm max-w-none text-primary">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
              text: ({ children }) => <TextWithMentions>{children}</TextWithMentions>,
            }}
          >
            {comment.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

interface CommentThreadV2Props {
  taskId: Id<"tasks">;
}

/**
 * AGT-201: Comment Thread v2 — Enhanced UI with @mentions, avatars, reply
 * - Better visual design matching EVOX aesthetic
 * - @mention autocomplete
 * - Reply button (threading backend support TBD)
 */
export function CommentThreadV2({ taskId }: CommentThreadV2Props) {
  const { isViewerMode } = useViewerMode();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [replyingTo, setReplyingTo] = useState<{ id: string; agentName: string } | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const comments = useQuery(api.taskComments.listByTask, { taskId });
  const postComment = useMutation(api.taskComments.postComment);

  // Organize comments into threads (top-level and replies)
  const { topLevel, replies } = useMemo(() => {
    if (!comments) return { topLevel: [], replies: new Map<string, TaskComment[]>() };

    const topLevel: TaskComment[] = [];
    const replies = new Map<string, TaskComment[]>();

    for (const comment of comments as TaskComment[]) {
      if (comment.parentId) {
        const existing = replies.get(comment.parentId) || [];
        existing.push(comment);
        replies.set(comment.parentId, existing);
      } else {
        topLevel.push(comment);
      }
    }

    return { topLevel, replies };
  }, [comments]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  // Detect @mentions for autocomplete
  useEffect(() => {
    const lastAtIndex = draft.lastIndexOf("@");
    if (lastAtIndex === -1) {
      setShowMentions(false);
      return;
    }

    const textAfterAt = draft.slice(lastAtIndex + 1);
    const spaceIndex = textAfterAt.indexOf(" ");
    const query = spaceIndex === -1 ? textAfterAt : textAfterAt.slice(0, spaceIndex);

    if (query.length > 0 && spaceIndex === -1) {
      setMentionQuery(query);
      setShowMentions(true);

      // Calculate position for dropdown
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.top - 200, // Above textarea
          left: rect.left,
        });
      }
    } else {
      setShowMentions(false);
    }
  }, [draft]);

  const handleMentionSelect = (name: string) => {
    const lastAtIndex = draft.lastIndexOf("@");
    const beforeAt = draft.slice(0, lastAtIndex);
    const afterAt = draft.slice(lastAtIndex + 1);
    const spaceIndex = afterAt.indexOf(" ");
    const remaining = spaceIndex === -1 ? "" : afterAt.slice(spaceIndex);

    setDraft(`${beforeAt}@${name}${remaining} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleReply = (commentId: string, agentName: string) => {
    setReplyingTo({ id: commentId, agentName });
    // Auto-expand thread when replying
    setExpandedThreads(prev => new Set(prev).add(commentId));
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;

    try {
      await postComment({
        taskId,
        agentName: "Son",
        content,
        parentId: replyingTo?.id as Id<"taskComments"> | undefined,
      });
      setDraft("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-tertiary">
          💬 Comments ({comments?.length || 0})
        </h3>
      </div>

      {/* Comments list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-3">
        {!comments || comments.length === 0 ? (
          <div className="flex items-center justify-center h-32 rounded-lg border border-border-default bg-base">
            <p className="text-sm text-tertiary">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          topLevel.map((comment) => {
            const commentReplies = replies.get(comment._id) || [];
            const replyCount = commentReplies.length;
            const isExpanded = expandedThreads.has(comment._id);

            return (
              <div key={comment._id} className="space-y-2">
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  replyCount={replyCount}
                  isExpanded={isExpanded}
                  onToggleReplies={() => toggleThread(comment._id)}
                />
                {/* Nested replies - collapsible */}
                {isExpanded && commentReplies.map((reply) => (
                  <CommentItem
                    key={reply._id}
                    comment={reply}
                    onReply={handleReply}
                    isReply
                  />
                ))}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      {!isViewerMode && (
        <form onSubmit={handleSubmit} className="relative">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
              <span className="text-xs text-blue-400">
                Replying to <span className="font-semibold uppercase">{replyingTo.agentName}</span>
              </span>
              <button
                type="button"
                onClick={cancelReply}
                className="text-xs text-tertiary hover:text-primary"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.agentName}...` : "Write a comment... (@mention to notify)"}
              className="w-full min-h-[100px] rounded-lg border border-border-default bg-surface-1 px-3 py-2 pr-20 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            {/* Mention autocomplete */}
            {showMentions && (
              <MentionAutocomplete
                query={mentionQuery}
                onSelect={handleMentionSelect}
                position={mentionPosition}
              />
            )}

            {/* Send button */}
            <button
              type="submit"
              disabled={!draft.trim()}
              className={cn(
                "absolute bottom-2 right-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
                draft.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-500"
                  : "bg-surface-4 text-tertiary cursor-not-allowed"
              )}
            >
              Send
            </button>
          </div>

          {/* Helper text */}
          <p className="mt-1 text-[10px] text-tertiary">
            ⌘ + Enter to send · @ to mention agents · Markdown supported
          </p>
        </form>
      )}
    </div>
  );
}
