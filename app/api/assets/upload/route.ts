import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { s3Client } from "@/lib/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    // Use sharp if available, otherwise return null
    const sharp = require("sharp");
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch (error) {
    console.warn("Could not get image dimensions:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const assetType = formData.get("type") as string; // "IMAGE" | "VIDEO" | "LOGO"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, MP4, MOV, WebM" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique S3 key
    const fileExtension = file.name.split(".").pop();
    const s3Key = `assets/${session.user.id}/${projectId}/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const bucket = process.env.ASSETS_BUCKET || process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: "Storage not configured" },
        { status: 500 }
      );
    }

    const uploadCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(uploadCommand);

    // Generate CDN URL
    const cdnBase = process.env.CLOUDFRONT_URL || process.env.CLOUDFRONT_DOMAIN;
    if (!cdnBase) {
      return NextResponse.json(
        { error: "CDN not configured" },
        { status: 500 }
      );
    }
    const cdnUrl = `${cdnBase.replace(/\/$/, '')}/${s3Key}`;

    // Get image dimensions if it's an image
    let dimensions = null;
    if (isImage) {
      dimensions = await getImageDimensions(buffer);
    }

    // Create asset record in database
    const asset = await prisma.asset.create({
      data: {
        projectId,
        userId: session.user.id,
        type: assetType || (isImage ? "IMAGE" : "VIDEO"),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        s3Key,
        cdnUrl,
        width: dimensions?.width,
        height: dimensions?.height,
      },
    });

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        fileName: asset.fileName,
        cdnUrl: asset.cdnUrl,
        type: asset.type,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      },
    });
  } catch (error) {
    console.error("Asset upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload asset" },
      { status: 500 }
    );
  }
}
