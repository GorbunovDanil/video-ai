import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queues';
import { createVeoJob } from '@/lib/veo';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    prompt,
    projectId,
    userId,
    brandSettings,
    assets,
    aspectRatio,
    durationSeconds,
    stylePreset,
    quality = 'standard',
    watermarkEnabled,
    previewRenderId,
  } = body;

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

  const inputAssetPayload = {
    assets: assets ?? null,
    previewRenderId: previewRenderId ?? null,
  };

  const render = await prisma.render.create({
    data: {
      projectId,
      type: 'VIDEO_FINAL',
      status: 'QUEUED',
      prompt,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : null,
      inputAssets: inputAssetPayload,
      instructions: body.instructions ?? null,
    },
  });

  try {
    const job = await createVeoJob({
      prompt,
      brandSettings: Object.keys(appliedBrandSettings).length ? appliedBrandSettings : undefined,
      assets,
      aspectRatio,
      durationSeconds,
      stylePreset,
      quality,
      watermarkEnabled: watermarkEnabled ?? project.brandKit?.watermarkEnabled ?? false,
      projectId,
      renderId: render.id,
      finalize: true,
    });

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: 'PROCESSING',
        providerJobId: job.jobId,
        costInCredits: job.estimatedCredits,
        inputAssets: inputAssetPayload,
      },
    });

    await enqueueJob('video-final-jobs', {
      id: render.id,
      jobId: job.jobId,
      projectId,
      previewRenderId,
      type: 'final',
    });

    return NextResponse.json({
      renderId: render.id,
      jobId: job.jobId,
      estimatedCredits: job.estimatedCredits,
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
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
