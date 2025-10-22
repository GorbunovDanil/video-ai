import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // Filter by IMAGE, VIDEO_PREVIEW, VIDEO_FINAL
  const status = searchParams.get("status") || "SUCCEEDED"; // Default to successful renders
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const where: any = {
      userId: session.user.id,
    };

    // Add type filter if specified
    if (type && ["IMAGE", "VIDEO_PREVIEW", "VIDEO_FINAL"].includes(type)) {
      where.type = type;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Fetch renders with pagination
    const [renders, totalCount] = await Promise.all([
      prisma.render.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          prompt: true,
          outputAssetUrl: true,
          watermarkUrl: true,
          costInCredits: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.render.count({ where }),
    ]);

    return NextResponse.json({
      renders,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch renders:", error);
    return NextResponse.json(
      { error: "Failed to fetch renders" },
      { status: 500 }
    );
  }
}
