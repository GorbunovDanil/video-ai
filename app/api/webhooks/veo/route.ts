import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

const statusMap: Record<string, 'PROCESSING' | 'SUCCEEDED' | 'FAILED'> = {
  queued: 'PROCESSING',
  processing: 'PROCESSING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
};

export async function POST(request: Request) {
  const secret = process.env.VEO_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get('x-webhook-secret');
    if (signature !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { jobId, renderId, status, assetUrl, watermarkUrl, costInCredits, usageMetadata, error } = body;

  if ((!jobId && !renderId) || !status) {
    return NextResponse.json({ error: 'jobId/renderId and status are required' }, { status: 400 });
  }

  const prismaStatus = statusMap[String(status).toLowerCase()];
  if (!prismaStatus) {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
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
  });

  if (!render) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  await prisma.render.update({
    where: { id: render.id },
    data: {
      status: prismaStatus,
      outputAssetUrl: assetUrl ?? render.outputAssetUrl,
      watermarkUrl: watermarkUrl ?? render.watermarkUrl,
      costInCredits: costInCredits ?? render.costInCredits,
      usageMetadata: usageMetadata ?? render.usageMetadata,
      error: error ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
