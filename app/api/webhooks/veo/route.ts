import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { UsageEventType } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";

import {
  CREDIT_RESERVES,
  finalizeRenderCharge,
  releaseRenderCredits,
} from "@/lib/credits";
import prisma from "@/lib/prisma";
import { logUsageEvent } from "@/lib/usage";

const statusMap: Record<string, "PROCESSING" | "SUCCEEDED" | "FAILED"> = {
  queued: "PROCESSING",
  processing: "PROCESSING",
  succeeded: "SUCCEEDED",
  failed: "FAILED",
};

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

function verifyWebhookTimestamp(timestamp: string | null): boolean {
  if (!timestamp) {
    return false;
  }

  try {
    const webhookTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return Math.abs(currentTime - webhookTime) < fiveMinutes;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.VEO_WEBHOOK_SECRET;

  if (!secret) {
    console.error("VEO_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn("Invalid webhook signature received");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!verifyWebhookTimestamp(timestamp)) {
    console.warn("Webhook timestamp verification failed");
    return NextResponse.json(
      { error: "Invalid or expired timestamp" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    jobId,
    renderId,
    status,
    assetUrl,
    watermarkUrl,
    costInCredits,
    usageMetadata,
    error,
  } = body as Record<string, unknown>;

  if ((!jobId && !renderId) || !status) {
    return NextResponse.json(
      { error: "jobId/renderId and status are required" },
      { status: 400 }
    );
  }

  const prismaStatus = statusMap[String(status).toLowerCase()];
  if (!prismaStatus) {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }

  const conditions = [] as Array<{ id?: string; providerJobId?: string }>;
  if (typeof renderId === "string") {
    conditions.push({ id: renderId });
  }
  if (typeof jobId === "string") {
    conditions.push({ providerJobId: jobId });
  }

  const render = await prisma.render.findFirst({
    where: {
      OR: conditions,
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      reservedCredits: true,
      creditsDeducted: true,
      costInCredits: true,
      type: true,
    },
  });

  if (!render) {
    return NextResponse.json({ error: "Render not found" }, { status: 404 });
  }

  await prisma.render.update({
    where: { id: render.id },
    data: {
      status: prismaStatus,
      outputAssetUrl: typeof assetUrl === "string" ? assetUrl : undefined,
      watermarkUrl: typeof watermarkUrl === "string" ? watermarkUrl : undefined,
      costInCredits: typeof costInCredits === "number" ? costInCredits : undefined,
      usageMetadata: usageMetadata ?? undefined,
      error: typeof error === "string" ? error : null,
    },
  });

  if (prismaStatus === "SUCCEEDED") {
    const fallback =
      render.type === "VIDEO_FINAL"
        ? CREDIT_RESERVES.videoFinal
        : render.type === "VIDEO_PREVIEW"
        ? CREDIT_RESERVES.videoPreview
        : CREDIT_RESERVES.image;

    const finalCost =
      typeof costInCredits === "number"
        ? costInCredits
        : render.costInCredits ?? render.reservedCredits ?? fallback;

    await finalizeRenderCharge({
      userId: render.userId,
      renderId: render.id,
      amount: finalCost,
      reason: "veo_render_finalization",
      metadata: {
        jobId,
        assetUrl,
      },
    });

    await logUsageEvent(
      render.userId,
      UsageEventType.RENDER_COMPLETED,
      {
        projectId: render.projectId,
        type: render.type,
        costInCredits: finalCost,
        jobId,
      },
      { renderId: render.id }
    );
  } else if (prismaStatus === "FAILED") {
    await releaseRenderCredits({
      userId: render.userId,
      renderId: render.id,
      reason: "veo_render_failure",
      metadata: {
        jobId,
        error,
      },
    });

    await logUsageEvent(
      render.userId,
      UsageEventType.RENDER_FAILED,
      {
        projectId: render.projectId,
        type: render.type,
        error: typeof error === "string" ? error : "Render failed",
        jobId,
      },
      { renderId: render.id }
    );

    Sentry.withScope((scope) => {
      scope.setUser({ id: render.userId });
      scope.setContext("render", {
        renderId: render.id,
        projectId: render.projectId,
        jobId,
      });
      scope.setExtra("error", error);
      Sentry.captureMessage("Veo render failed", "warning");
    });
  }

  return NextResponse.json({ ok: true });
}