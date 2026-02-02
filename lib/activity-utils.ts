/**
 * AGT-140/AGT-141: Normalize activity items so ActivityFeed never crashes on malformed/shape mismatch.
 * Shared by /activity and /dashboard.
 */
export function normalizeActivities(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => ({
      _id: typeof item._id === "string" ? item._id : String(item._id ?? ""),
      agentId: item.agentId,
      agentName: typeof item.agentName === "string" ? item.agentName : "unknown",
      agent: item.agent ?? null,
      category: item.category ?? "task",
      eventType: typeof item.eventType === "string" ? item.eventType : "updated",
      title: typeof item.title === "string" ? item.title : "",
      description: item.description,
      taskId: item.taskId,
      linearIdentifier: item.linearIdentifier,
      projectId: item.projectId,
      metadata: item.metadata ?? undefined,
      timestamp:
        typeof item.timestamp === "number"
          ? item.timestamp
          : typeof item.createdAt === "number"
            ? item.createdAt
            : Date.now(),
    }));
}
