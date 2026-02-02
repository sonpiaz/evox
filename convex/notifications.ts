import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const create = mutation({
  args: {
    to: v.id("agents"),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("status_change"),
      v.literal("review_request")
    ),
    title: v.string(),
    message: v.string(),
    relatedTask: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      to: args.to,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      relatedTask: args.relatedTask,
      createdAt: Date.now(),
    });
    return notificationId;
  },
});

// READ - Get all notifications for an agent
export const getByAgent = query({
  args: { agent: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("to", args.agent))
      .order("desc")
      .collect();
  },
});

// READ - Get unread notifications
export const getUnread = query({
  args: { agent: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) => q.eq("to", args.agent).eq("read", false))
      .order("desc")
      .collect();
  },
});

// READ - Get unread count
export const getUnreadCount = query({
  args: { agent: v.id("agents") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) => q.eq("to", args.agent).eq("read", false))
      .collect();
    return unread.length;
  },
});

// READ - Get notification by ID
export const get = query({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// UPDATE - Mark as read
export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { read: true });
  },
});

// UPDATE - Mark all as read for an agent
export const markAllAsRead = mutation({
  args: { agent: v.id("agents") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_read_status", (q) => q.eq("to", args.agent).eq("read", false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }

    return unread.length;
  },
});

// DELETE
export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// DELETE - Clear old read notifications
export const clearRead = mutation({
  args: {
    agent: v.id("agents"),
    olderThan: v.optional(v.number()), // timestamp, default to 7 days ago
  },
  handler: async (ctx, args) => {
    const cutoff = args.olderThan ?? Date.now() - 7 * 24 * 60 * 60 * 1000;

    const readNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("to", args.agent))
      .collect();

    const toDelete = readNotifications.filter(
      (n) => n.read && n.createdAt < cutoff
    );

    for (const notification of toDelete) {
      await ctx.db.delete(notification._id);
    }

    return toDelete.length;
  },
});

/**
 * AGT-143: Clear ALL notifications for an agent (mark as read + delete old).
 * This is useful when user wants to dismiss all notifications.
 */
export const clearAll = mutation({
  args: { agent: v.id("agents") },
  handler: async (ctx, args) => {
    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("to", args.agent))
      .collect();

    // Delete all notifications for this agent
    for (const notification of allNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { deleted: allNotifications.length };
  },
});

/**
 * AGT-143: TTL cleanup — delete notifications older than N hours.
 * Run: npx convex run notifications:cleanup '{"hoursOld": 24}'
 */
export const cleanup = mutation({
  args: {
    hoursOld: v.optional(v.number()), // default 24 hours
  },
  handler: async (ctx, args) => {
    const hours = args.hoursOld ?? 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const allNotifications = await ctx.db.query("notifications").collect();

    const oldNotifications = allNotifications.filter(
      (n) => n.createdAt < cutoff
    );

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return {
      deleted: oldNotifications.length,
      remaining: allNotifications.length - oldNotifications.length,
      cutoffHours: hours,
    };
  },
});
