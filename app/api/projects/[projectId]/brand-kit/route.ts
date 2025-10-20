import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const brandKit = await prisma.brandKit.findFirst({
    where: {
      projectId: params.projectId,
      userId: session.user.id,
    },
  });

  if (!brandKit) {
    return NextResponse.json({ brandKit: null });
  }

  return NextResponse.json({ brandKit });
}

export async function PUT(request: Request, { params }: { params: { projectId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      userId: session.user.id,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const brandKit = await prisma.brandKit.upsert({
    where: { projectId: params.projectId },
    create: {
      projectId: params.projectId,
      userId: session.user.id,
      primaryColor: body.primaryColor ?? null,
      secondaryColor: body.secondaryColor ?? null,
      accentColor: body.accentColor ?? null,
      logoUrl: body.logoUrl ?? null,
      watermarkEnabled: typeof body.watermarkEnabled === "boolean" ? body.watermarkEnabled : true,
      typography: body.typography ?? null,
    },
    update: {
      primaryColor: body.primaryColor ?? undefined,
      secondaryColor: body.secondaryColor ?? undefined,
      accentColor: body.accentColor ?? undefined,
      logoUrl: body.logoUrl ?? undefined,
      watermarkEnabled: typeof body.watermarkEnabled === "boolean" ? body.watermarkEnabled : undefined,
      typography: body.typography ?? undefined,
    },
  });

  return NextResponse.json({ brandKit });
}
