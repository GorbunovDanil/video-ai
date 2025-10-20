import { Prisma, UsageEventType } from "@prisma/client";

import prisma from "./prisma";

type PrismaLikeClient = Prisma.TransactionClient | typeof prisma;

interface UsageLogOptions {
  renderId?: string;
  client?: PrismaLikeClient;
}

export async function logUsageEvent(
  userId: string,
  type: UsageEventType,
  metadata?: Record<string, unknown>,
  options: UsageLogOptions = {}
) {
  const client = options.client ?? prisma;

  await client.usageLog.create({
    data: {
      userId,
      type,
      renderId: options.renderId,
      metadata: metadata as any,
    },
  });
}