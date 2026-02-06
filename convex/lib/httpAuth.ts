/**
 * CORE-208: HTTP API Key Authentication Middleware
 *
 * Wraps httpAction handlers to require `x-api-key` header.
 * Webhooks (GitHub, Linear, Vercel) should NOT use this — they have their own auth.
 *
 * Usage:
 *   handler: withAuth(async (ctx, request) => { ... })
 */

import { httpAction } from "../_generated/server";
import type { ActionCtx } from "../_generated/server";

type HttpHandler = (ctx: ActionCtx, request: Request) => Promise<Response>;

/**
 * Wrap an HTTP handler to require API key authentication.
 * Checks `x-api-key` header against EVOX_API_KEY env var.
 * Returns 401 if missing or invalid.
 */
export function withAuth(handler: HttpHandler) {
  return httpAction(async (ctx: ActionCtx, request: Request) => {
    const apiKey = request.headers.get("x-api-key");
    const expected = process.env.EVOX_API_KEY;

    if (!expected) {
      console.error("EVOX_API_KEY not set in environment");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!apiKey || apiKey !== expected) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return handler(ctx, request);
  });
}
