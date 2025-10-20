import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const requiredEnv = ['AWS_REGION', 'ASSETS_BUCKET', 'CLOUDFRONT_URL'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[storage] Missing environment variable ${key}. Storage operations may fail.`);
  }
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      }
    : undefined,
});

export interface StoreAssetOptions {
  key: string;
  contentType: string;
  buffer: Buffer;
  metadata?: Record<string, string>;
}

export async function storeAsset({ key, contentType, buffer, metadata }: StoreAssetOptions) {
  const bucket = process.env.ASSETS_BUCKET;
  if (!bucket) {
    throw new Error('ASSETS_BUCKET is not configured');
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    }),
  );

  return key;
}

export async function getSignedAssetUrl(key: string, expiresIn = 60 * 60) {
  const bucket = process.env.ASSETS_BUCKET;
  if (!bucket) {
    throw new Error('ASSETS_BUCKET is not configured');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}

export function getCdnUrl(key: string) {
  const cdnBase = process.env.CLOUDFRONT_URL;
  if (!cdnBase) {
    throw new Error('CLOUDFRONT_URL is not configured');
  }
  return `${cdnBase.replace(/\/$/, '')}/${key}`;
}
