import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { renderId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { renderId } = params;

  if (!renderId || typeof renderId !== "string") {
    return NextResponse.json({ error: "renderId is required" }, { status: 400 });
  }

  try {
    const render = await prisma.render.findUnique({
      where: { id: renderId },
      select: {
        id: true,
        type: true,
        status: true,
        prompt: true,
        outputAssetUrl: true,
        watermarkUrl: true,
        costInCredits: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
    });

    if (!render) {
      return NextResponse.json({ error: "Render not found" }, { status: 404 });
    }

    // Ensure user owns this render
    if (render.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ render });
  } catch (error) {
    console.error("Failed to fetch render:", error);
    return NextResponse.json(
      { error: "Failed to fetch render" },
      { status: 500 }
    );
  }
}
