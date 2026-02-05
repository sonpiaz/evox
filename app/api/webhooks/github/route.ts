/**
 * GitHub Webhook Endpoint (AGT-159: Fix sync chain)
 *
 * POST /api/webhooks/github
 *
 * Receives push events from GitHub and forwards to Convex for processing.
 * - Parses commit messages for AGT-XX references
 * - Posts comments to Linear tickets
 * - Tracks "closes AGT-XX" for skill completion
 *
 * Setup in GitHub:
 * 1. Go to repo Settings → Webhooks
 * 2. Add webhook URL: https://evox-ten.vercel.app/api/webhooks/github
 * 3. Content type: application/json
 * 4. Select events: Push
 * 5. Copy the Secret to EVOX env as GITHUB_WEBHOOK_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

// Lazily initialize Convex client
function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
  }
  return new ConvexHttpClient(url);
}

// Verify GitHub webhook signature
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) {
    console.warn("GITHUB_WEBHOOK_SECRET not set, skipping signature verification");
    return true;
  }
  if (!signature) {
    console.error("No signature provided in webhook request");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const expectedSignature = "sha256=" + hmac.update(body).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const eventType = request.headers.get("x-github-event");
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Verify signature
    if (!verifyWebhookSignature(bodyText, signature, secret)) {
      console.error("Invalid GitHub webhook signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(bodyText);

    // Only process push events
    if (eventType !== "push") {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Ignoring ${eventType} event`,
      });
    }

    // Call Convex action to process the push
    const convex = getConvexClient();
    const result = await convex.action(api.webhooks.processGitHubPush, {
      payload,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("GitHub webhook error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

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
    endpoint: "/api/webhooks/github",
    description: "GitHub webhook endpoint for push event processing",
    setup: {
      step1: "Go to GitHub repo Settings → Webhooks",
      step2: "Add webhook URL: https://evox-ten.vercel.app/api/webhooks/github",
      step3: "Content type: application/json",
      step4: "Select events: Push",
      step5: "Copy Secret to env as GITHUB_WEBHOOK_SECRET",
    },
  });
}
