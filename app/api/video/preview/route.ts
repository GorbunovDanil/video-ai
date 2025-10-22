import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as Sentry from "@sentry/nextjs";
import { UsageEventType } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import {
  CREDIT_RESERVES,
  InsufficientCreditsError,
  adjustRenderReservation,
  releaseRenderCredits,
  reserveRenderCredits,
} from "@/lib/credits";
import prisma from "@/lib/prisma";
import { enqueueJob } from "@/lib/queues";
import { createVeoJob } from "@/lib/veo";
import { logUsageEvent } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit/middleware";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { performAbuseChecks } from "@/lib/abuse-prevention";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting check
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.VIDEO_GENERATION);
  if (rateLimitResult.success !== true) {
    return rateLimitResult;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    prompt,
    projectId,
    brandSettings,
    assets,
    aspectRatio,
    durationSeconds,
    stylePreset,
    quality = "fast",
    watermarkEnabled,
  } = body;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Abuse prevention checks
  const abuseCheck = await performAbuseChecks(userId, prompt);
  if (!abuseCheck.allowed) {
    return NextResponse.json(
      { error: abuseCheck.reason || "Request blocked" },
      { status: 403 }
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { brandKit: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const brandKitSnapshot = project.brandKit
    ? {
        brandKitId: project.brandKit.id,
        primaryColor: project.brandKit.primaryColor,
        secondaryColor: project.brandKit.secondaryColor,
        accentColor: project.brandKit.accentColor,
        logoUrl: project.brandKit.logoUrl,
        watermarkEnabled: project.brandKit.watermarkEnabled,
        typography: project.brandKit.typography,
      }
    : undefined;

  const appliedBrandSettings = {
    ...(brandKitSnapshot ?? {}),
    ...(brandSettings ?? {}),
  };

  const render = await prisma.render.create({
    data: {
      projectId,
      userId,
      type: "VIDEO_PREVIEW",
      status: "QUEUED",
      prompt,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : null,
      inputAssets: assets ?? null,
      instructions: body.instructions ?? null,
    },
  });

  await logUsageEvent(
    userId,
    UsageEventType.RENDER_REQUESTED,
    {
      projectId,
      type: "VIDEO_PREVIEW",
      prompt,
    },
    { renderId: render.id }
  );

  try {
    await reserveRenderCredits({
      userId,
      renderId: render.id,
      amount: CREDIT_RESERVES.videoPreview,
      reason: "video_preview_reservation",
      metadata: { projectId },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      await prisma.render.update({
        where: { id: render.id },
        data: {
          status: "FAILED",
          error: "Insufficient credits",
        },
      });

      await logUsageEvent(
        userId,
        UsageEventType.RENDER_FAILED,
        {
          projectId,
          type: "VIDEO_PREVIEW",
          reason: "INSUFFICIENT_CREDITS",
        },
        { renderId: render.id }
      );

      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    throw error;
  }

  try {
    const job = await createVeoJob({
      prompt,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : undefined,
      assets,
      aspectRatio,
      durationSeconds,
      stylePreset,
      quality,
      watermarkEnabled: watermarkEnabled ?? project.brandKit?.watermarkEnabled ?? true,
      projectId,
      renderId: render.id,
      finalize: false,
    });

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "PROCESSING",
        providerJobId: job.jobId,
        costInCredits: job.estimatedCredits,
      },
    });

    if (typeof job.estimatedCredits === "number") {
      try {
        await adjustRenderReservation({
          userId,
          renderId: render.id,
          amount: job.estimatedCredits,
          reason: "video_preview_reservation_adjustment",
          metadata: { projectId, estimatedCredits: job.estimatedCredits },
        });
      } catch (error) {
        if (error instanceof InsufficientCreditsError) {
          await prisma.render.update({
            where: { id: render.id },
            data: {
              status: "FAILED",
              error: "Insufficient credits",
            },
          });

          await releaseRenderCredits({
            userId,
            renderId: render.id,
            reason: "video_preview_release",
            metadata: { projectId },
          });

          await logUsageEvent(
            userId,
            UsageEventType.RENDER_FAILED,
            {
              projectId,
              type: "VIDEO_PREVIEW",
              reason: "INSUFFICIENT_CREDITS",
            },
            { renderId: render.id }
          );

          return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
        }

        throw error;
      }
    }

    await enqueueJob("video-preview-jobs", {
      id: render.id,
      jobId: job.jobId,
      projectId,
      type: "preview",
    });

    return NextResponse.json({
      renderId: render.id,
      jobId: job.jobId,
      estimatedCredits: job.estimatedCredits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "FAILED",
        error: message,
      },
    });

    await releaseRenderCredits({
      userId,
      renderId: render.id,
      reason: "video_preview_release",
      metadata: { projectId },
    });

    await logUsageEvent(
      userId,
      UsageEventType.RENDER_FAILED,
      {
        projectId,
        type: "VIDEO_PREVIEW",
        error: message,
      },
      { renderId: render.id }
    );

    Sentry.withScope((scope) => {
      scope.setUser({ id: userId, email: session.user?.email ?? undefined });
      scope.setContext("render", {
        renderId: render.id,
        projectId,
        type: "VIDEO_PREVIEW",
      });
      scope.setExtra("prompt", prompt);
      Sentry.captureException(error);
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
