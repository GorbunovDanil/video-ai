import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/aws";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// GET: List assets for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const type = searchParams.get("type"); // Optional filter by type

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch assets
    const assets = await prisma.asset.findMany({
      where: {
        projectId,
        ...(type && { type: type as any }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        cdnUrl: true,
        width: true,
        height: true,
        duration: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Asset listing error:", error);
    return NextResponse.json(
      { error: "Failed to list assets" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an asset
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("id");

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    // Find asset and verify ownership
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, userId: session.user.id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Delete from S3
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: asset.s3Key,
      });
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      console.error("S3 deletion error:", s3Error);
      // Continue even if S3 deletion fails
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Asset deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    );
  }
}
