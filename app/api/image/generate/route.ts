import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as Sentry from "@sentry/nextjs";
import { UsageEventType } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import {
  CREDIT_RESERVES,
  InsufficientCreditsError,
  finalizeRenderCharge,
  releaseRenderCredits,
  reserveRenderCredits,
} from "@/lib/credits";
import { generateImageWithGemini } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import { getCdnUrl, getSignedAssetUrl, storeAsset } from "@/lib/storage";
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
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.IMAGE_GENERATION);
  if (rateLimitResult.success !== true) {
    return rateLimitResult; // Returns 429 response
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { prompt, negativePrompt, projectId, brandSettings, assets, aspectRatio, safetySettings } = body;

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
      type: "IMAGE",
      status: "PROCESSING",
      prompt,
      instructions: body.instructions ?? null,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : null,
      inputAssets: assets ?? null,
    },
  });

  await logUsageEvent(
    userId,
    UsageEventType.RENDER_REQUESTED,
    {
      projectId,
      type: "IMAGE",
      prompt,
    },
    { renderId: render.id }
  );

  try {
    await reserveRenderCredits({
      userId,
      renderId: render.id,
      amount: CREDIT_RESERVES.image,
      reason: "image_render_reservation",
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
          type: "IMAGE",
          reason: "INSUFFICIENT_CREDITS",
        },
        { renderId: render.id }
      );

      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    throw error;
  }

  try {
    const result = await generateImageWithGemini({
      prompt,
      negativePrompt,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : undefined,
      aspectRatio,
      safetySettings,
      assets,
    });

    const key = `projects/${projectId}/renders/${render.id}/image`;
    const extension = result.mimeType.split("/")[1] ?? "png";
    const assetKey = `${key}.${extension}`;

    await storeAsset({
      key: assetKey,
      buffer: result.buffer,
      contentType: result.mimeType,
      metadata: {
        projectId,
        renderId: render.id,
        responseId: result.responseId ?? "",
      },
    });

    const signedUrl = await getSignedAssetUrl(assetKey);
    const cdnUrl = getCdnUrl(assetKey);

    const rate = parseFloat(process.env.GEMINI_IMAGE_COST_PER_1K_TOKENS ?? "0");
    const totalTokens = result.usage?.totalTokenCount ?? 0;
    const costInCredits = rate > 0 ? (totalTokens / 1000) * rate : undefined;

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "SUCCEEDED",
        outputAssetUrl: cdnUrl,
        costInCredits,
        usageMetadata: result.usage,
      },
    });

    const finalCharge = typeof costInCredits === "number" ? costInCredits : CREDIT_RESERVES.image;

    await finalizeRenderCharge({
      userId,
      renderId: render.id,
      amount: finalCharge,
      reason: "image_render_finalization",
      metadata: {
        projectId,
        totalTokens,
      },
    });

    await logUsageEvent(
      userId,
      UsageEventType.RENDER_COMPLETED,
      {
        projectId,
        type: "IMAGE",
        costInCredits: finalCharge,
      },
      { renderId: render.id }
    );

    return NextResponse.json({
      renderId: render.id,
      signedUrl,
      cdnUrl,
      costInCredits,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errorCode = (error as Error & { code?: string }).code;

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
      reason: "image_render_release",
      metadata: { projectId },
    });

    if (errorCode === "SAFETY_BLOCK") {
      await logUsageEvent(
        userId,
        UsageEventType.PROMPT_FILTERED,
        {
          projectId,
          type: "IMAGE",
          prompt,
        },
        { renderId: render.id }
      );
    } else {
      await logUsageEvent(
        userId,
        UsageEventType.RENDER_FAILED,
        {
          projectId,
          type: "IMAGE",
          error: message,
        },
        { renderId: render.id }
      );
    }

    Sentry.withScope((scope) => {
      scope.setUser({ id: userId, email: session.user?.email ?? undefined });
      scope.setContext("render", {
        renderId: render.id,
        projectId,
        type: "IMAGE",
      });
      scope.setExtra("prompt", prompt);
      Sentry.captureException(error);
    });

    const status = errorCode === "SAFETY_BLOCK" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
