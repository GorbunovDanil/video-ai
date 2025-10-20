import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
  }

  const brandKit = await prisma.brandKit.findFirst({
    where: {
      projectId: params.projectId,
      userId,
    },
  });

  if (!brandKit) {
    return NextResponse.json({ brandKit: null });
  }

  return NextResponse.json({ brandKit });
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { userId, ...updates } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      userId,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const brandKit = await prisma.brandKit.upsert({
    where: { projectId: params.projectId },
    create: {
      projectId: params.projectId,
      userId,
      primaryColor: updates.primaryColor ?? null,
      secondaryColor: updates.secondaryColor ?? null,
      accentColor: updates.accentColor ?? null,
      logoUrl: updates.logoUrl ?? null,
      watermarkEnabled: updates.watermarkEnabled ?? true,
      typography: updates.typography ?? null,
    },
    update: {
      primaryColor: updates.primaryColor ?? undefined,
      secondaryColor: updates.secondaryColor ?? undefined,
      accentColor: updates.accentColor ?? undefined,
      logoUrl: updates.logoUrl ?? undefined,
      watermarkEnabled:
        typeof updates.watermarkEnabled === 'boolean' ? updates.watermarkEnabled : undefined,
      typography: updates.typography ?? undefined,
    },
  });

  return NextResponse.json({ brandKit });
}
