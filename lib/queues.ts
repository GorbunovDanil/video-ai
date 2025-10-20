import { randomUUID } from 'crypto';

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Upstash Redis environment variables are not configured.');
    }
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function enqueueJob(queue: string, payload: Record<string, unknown>) {
  const client = getRedis();
  const entry = JSON.stringify({
    id: payload.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
  });
  await client.lpush(queue, entry);
  return entry;
}
