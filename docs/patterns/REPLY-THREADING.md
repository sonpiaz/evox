# Pattern: Comment Reply Threading

## Problem
Comments were flat - no way to reply to specific comments, making conversations hard to follow.

## Solution
Added `parentId` field to comments for hierarchical threading.

## Schema

```typescript
// convex/schema.ts
taskComments: defineTable({
  taskId: v.id("tasks"),
  fromAgentId: v.id("agents"),
  content: v.string(),
  parentId: v.optional(v.id("taskComments")),  // NEW: Reply to this comment
  createdAt: v.number(),
})
  .index("by_task", ["taskId", "createdAt"])
  .index("by_parent", ["parentId", "createdAt"])  // NEW: Efficient reply lookups
```

## API

### Post a Reply

```typescript
// convex/taskComments.ts
await ctx.runMutation(api.taskComments.postComment, {
  taskId: "j...",
  agentName: "sam",
  content: "Good point! Let me address that.",
  parentId: "j..."  // ID of comment being replied to
});
```

### Get Replies to a Comment

```typescript
// convex/taskComments.ts
const replies = await ctx.runQuery(api.taskComments.getReplies, {
  parentId: "j..."  // ID of parent comment
});
```

## Frontend Usage

```tsx
// components/evox/CommentThreadV2.tsx
function CommentItem({ comment, onReply, isReply }) {
  return (
    <div className={cn(
      "flex gap-3 rounded-lg",
      isReply && "ml-8 border-l-2 border-l-blue-500/30"  // Indented replies
    )}>
      {/* comment content */}
      <button onClick={() => onReply(comment._id, comment.agentName)}>
        Reply
      </button>
    </div>
  );
}
```

## Implementation Status

- ✅ Backend: Schema, mutation, query (committed Session 21)
- 🔄 Frontend: In progress (Leo dispatched)

## References

- `convex/schema.ts`: Schema definition
- `convex/taskComments.ts`: postComment mutation, getReplies query
- `components/evox/CommentThreadV2.tsx`: Frontend component
