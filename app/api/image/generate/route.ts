import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { generateImageWithGemini } from '@/lib/gemini';
import { getCdnUrl, getSignedAssetUrl, storeAsset } from '@/lib/storage';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { prompt, negativePrompt, projectId, brandSettings, assets, userId, aspectRatio, safetySettings } = body;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: { brandKit: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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
      type: 'IMAGE',
      status: 'PROCESSING',
      prompt,
      instructions: body.instructions ?? null,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : null,
      inputAssets: assets ?? null,
    },
  });

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
    const extension = result.mimeType.split('/')[1] ?? 'png';
    const assetKey = `${key}.${extension}`;

    await storeAsset({
      key: assetKey,
      buffer: result.buffer,
      contentType: result.mimeType,
      metadata: {
        projectId,
        renderId: render.id,
        responseId: result.responseId ?? '',
      },
    });

    const signedUrl = await getSignedAssetUrl(assetKey);
    const cdnUrl = getCdnUrl(assetKey);

    const rate = parseFloat(process.env.GEMINI_IMAGE_COST_PER_1K_TOKENS ?? '0');
    const totalTokens = result.usage?.totalTokenCount ?? 0;
    const costInCredits = rate > 0 ? (totalTokens / 1000) * rate : undefined;

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: 'SUCCEEDED',
        outputAssetUrl: cdnUrl,
        costInCredits,
        usageMetadata: result.usage,
      },
    });

    return NextResponse.json({
      renderId: render.id,
      signedUrl,
      cdnUrl,
      costInCredits,
      usage: result.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: 'FAILED',
        error: message,
      },
    });

    const status = (error as Error & { code?: string })?.code === 'SAFETY_BLOCK' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
