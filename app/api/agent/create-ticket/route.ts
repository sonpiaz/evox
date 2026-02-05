/**
 * POST /api/agent/create-ticket
 * 
 * Allows agents (especially MAX) to create tickets in Linear.
 * 
 * Request body:
 * {
 *   "title": "Ticket title",
 *   "description": "Detailed description",
 *   "priority": "urgent" | "high" | "medium" | "low",
 *   "assignee": "sam" | "leo" | "max" | "quinn",
 *   "from": "max" // Agent creating the ticket
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "ticket": {
 *     "id": "...",
 *     "identifier": "AGT-XXX",
 *     "url": "https://linear.app/affitorai/issue/AGT-XXX",
 *     "title": "..."
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createLinearIssue } from "@/lib/evox/linear-client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Get Convex client for logging
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
  }
  return new ConvexHttpClient(url);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, assignee, from } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "title is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "LINEAR_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Create the ticket in Linear
    const ticket = await createLinearIssue(apiKey, {
      title,
      description,
      priority: priority || "medium",
      assigneeName: assignee,
    });

    console.log(`[create-ticket] ${from || "unknown"} created ${ticket.identifier}: ${title}`);

    // Log to Convex messages (optional)
    try {
      const convex = getConvexClient();
      await convex.mutation(api.messages.send, {
        from: from || "system",
        channel: "dev",
        message: `📝 Created ${ticket.identifier}: ${title}${assignee ? ` → @${assignee}` : ""}`,
      });
    } catch (e) {
      // Non-fatal: just log
      console.warn("[create-ticket] Failed to log to Convex:", e);
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error("[create-ticket] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/agent/create-ticket",
    description: "Create tickets in Linear via POST request",
    usage: {
      method: "POST",
      body: {
        title: "string (required)",
        description: "string (optional)",
        priority: "urgent|high|medium|low (default: medium)",
        assignee: "sam|leo|max|quinn (optional)",
        from: "agent name creating the ticket",
      },
    },
  });
}
