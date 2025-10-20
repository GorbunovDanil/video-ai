import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { UsageEventType } from "@prisma/client";

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

export async function POST(request: Request) {
  const secret = process.env.VEO_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("x-webhook-secret");
    if (signature !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { jobId, renderId, status, assetUrl, watermarkUrl, costInCredits, usageMetadata, error } = body;

  if ((!jobId && !renderId) || !status) {
    return NextResponse.json({ error: "jobId/renderId and status are required" }, { status: 400 });
  }

  const prismaStatus = statusMap[String(status).toLowerCase()];
  if (!prismaStatus) {
    return NextResponse.json({ error: "Unsupported status" }, { status: 400 });
  }

  const conditions = [] as Array<{ id?: string; providerJobId?: string }>;
  if (renderId) {
    conditions.push({ id: renderId });
  }
  if (jobId) {
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
      outputAssetUrl: assetUrl ?? undefined,
      watermarkUrl: watermarkUrl ?? undefined,
      costInCredits: costInCredits ?? undefined,
      usageMetadata: usageMetadata ?? undefined,
      error: error ?? null,
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
      typeof costInCredits === "number" ? costInCredits : render.costInCredits ?? render.reservedCredits ?? fallback;

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
        error: error ?? "Render failed",
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
