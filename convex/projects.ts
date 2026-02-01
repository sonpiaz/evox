import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all projects (never throw — layout depends on this)
export const list = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await ctx.db.query("projects").order("desc").collect();
    } catch {
      return [];
    }
  },
});

// Get a single project
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      createdAt: Date.now(),
    });
    return projectId;
  },
});

// Update a project
export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

// Delete a project
export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
