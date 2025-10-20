import { CreditTransactionType, UsageEventType } from "@prisma/client";

import prisma from "./prisma";
import { logUsageEvent } from "./usage";

export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits available") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

function parseReserve(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

export const CREDIT_RESERVES = {
  image: parseReserve(process.env.CREDIT_RESERVE_IMAGE, 1),
  videoPreview: parseReserve(process.env.CREDIT_RESERVE_VIDEO_PREVIEW, 3),
  videoFinal: parseReserve(process.env.CREDIT_RESERVE_VIDEO_FINAL, 6),
};

interface CreditEventMetadata extends Record<string, unknown> {}

interface CreditReservationOptions {
  userId: string;
  renderId: string;
  amount: number;
  metadata?: CreditEventMetadata;
  reason: string;
}

export async function reserveRenderCredits(options: CreditReservationOptions) {
  const amount = Math.max(options.amount, 0);
  if (amount === 0) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: options.userId },
        select: { credits: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.credits < amount) {
        throw new InsufficientCreditsError();
      }

      await tx.user.update({
        where: { id: options.userId },
        data: { credits: { decrement: amount } },
      });

      await tx.render.update({
        where: { id: options.renderId },
        data: {
          reservedCredits: amount,
          creditsDeducted: false,
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount,
          type: CreditTransactionType.DEBIT,
          reason: options.reason,
          renderId: options.renderId,
          metadata: options.metadata ?? undefined,
        },
      });

      await logUsageEvent(
        options.userId,
        UsageEventType.CREDIT_RESERVED,
        {
          amount,
          reason: options.reason,
          ...(options.metadata ?? {}),
        },
        { renderId: options.renderId, client: tx }
      );
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      throw error;
    }
    throw error;
  }
}

interface ReservationAdjustmentOptions {
  renderId: string;
  userId: string;
  amount: number;
  metadata?: CreditEventMetadata;
  reason: string;
}

export async function adjustRenderReservation(options: ReservationAdjustmentOptions) {
  const nextAmount = Math.max(options.amount, 0);

  await prisma.$transaction(async (tx) => {
    const render = await tx.render.findUnique({
      where: { id: options.renderId },
      select: { reservedCredits: true, creditsDeducted: true },
    });

    if (!render) {
      throw new Error("Render not found");
    }

    if (render.creditsDeducted) {
      return;
    }

    const delta = nextAmount - render.reservedCredits;

    if (Math.abs(delta) < 0.0001) {
      return;
    }

    if (delta > 0) {
      await tx.user.update({
        where: { id: options.userId },
        data: { credits: { decrement: delta } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount: delta,
          type: CreditTransactionType.DEBIT,
          reason: options.reason,
          renderId: options.renderId,
          metadata: options.metadata ?? undefined,
        },
      });

      await logUsageEvent(
        options.userId,
        UsageEventType.CREDIT_RESERVED,
        {
          amount: delta,
          reason: options.reason,
          ...(options.metadata ?? {}),
        },
        { renderId: options.renderId, client: tx }
      );
    } else {
      const refund = Math.abs(delta);
      await tx.user.update({
        where: { id: options.userId },
        data: { credits: { increment: refund } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount: refund,
          type: CreditTransactionType.CREDIT,
          reason: options.reason,
          renderId: options.renderId,
          metadata: options.metadata ?? undefined,
        },
      });

      await logUsageEvent(
        options.userId,
        UsageEventType.CREDIT_REFUNDED,
        {
          amount: refund,
          reason: options.reason,
          ...(options.metadata ?? {}),
        },
        { renderId: options.renderId, client: tx }
      );
    }

    await tx.render.update({
      where: { id: options.renderId },
      data: { reservedCredits: nextAmount },
    });
  });
}

interface FinalizeOptions {
  renderId: string;
  userId: string;
  amount: number;
  metadata?: CreditEventMetadata;
  reason: string;
}

export async function finalizeRenderCharge(options: FinalizeOptions) {
  const finalAmount = Math.max(options.amount, 0);

  await prisma.$transaction(async (tx) => {
    const render = await tx.render.findUnique({
      where: { id: options.renderId },
      select: { reservedCredits: true, creditsDeducted: true },
    });

    if (!render) {
      throw new Error("Render not found");
    }

    if (render.creditsDeducted) {
      return;
    }

    const delta = finalAmount - render.reservedCredits;

    if (delta > 0) {
      await tx.user.update({
        where: { id: options.userId },
        data: { credits: { decrement: delta } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount: delta,
          type: CreditTransactionType.DEBIT,
          reason: options.reason,
          renderId: options.renderId,
          metadata: options.metadata ?? undefined,
        },
      });
    } else if (delta < 0) {
      const refund = Math.abs(delta);
      await tx.user.update({
        where: { id: options.userId },
        data: { credits: { increment: refund } },
      });

      await tx.creditTransaction.create({
        data: {
          userId: options.userId,
          amount: refund,
          type: CreditTransactionType.CREDIT,
          reason: options.reason,
          renderId: options.renderId,
          metadata: options.metadata ?? undefined,
        },
      });
    }

    await tx.render.update({
      where: { id: options.renderId },
      data: {
        reservedCredits: finalAmount,
        creditsDeducted: true,
      },
    });

    await logUsageEvent(
      options.userId,
      UsageEventType.CREDIT_CAPTURED,
      {
        amount: finalAmount,
        delta,
        reason: options.reason,
        ...(options.metadata ?? {}),
      },
      { renderId: options.renderId, client: tx }
    );
  });
}

interface ReleaseOptions {
  renderId: string;
  userId: string;
  metadata?: CreditEventMetadata;
  reason: string;
}

export async function releaseRenderCredits(options: ReleaseOptions) {
  await prisma.$transaction(async (tx) => {
    const render = await tx.render.findUnique({
      where: { id: options.renderId },
      select: { reservedCredits: true, creditsDeducted: true },
    });

    if (!render) {
      throw new Error("Render not found");
    }

    if (render.creditsDeducted || render.reservedCredits === 0) {
      return;
    }

    await tx.user.update({
      where: { id: options.userId },
      data: { credits: { increment: render.reservedCredits } },
    });

    await tx.render.update({
      where: { id: options.renderId },
      data: { reservedCredits: 0 },
    });

    await tx.creditTransaction.create({
      data: {
        userId: options.userId,
        amount: render.reservedCredits,
        type: CreditTransactionType.CREDIT,
        reason: options.reason,
        renderId: options.renderId,
        metadata: options.metadata ?? undefined,
      },
    });

    await logUsageEvent(
      options.userId,
      UsageEventType.CREDIT_RELEASED,
      {
        amount: render.reservedCredits,
        reason: options.reason,
        ...(options.metadata ?? {}),
      },
      { renderId: options.renderId, client: tx }
    );
  });
}

interface PurchaseOptions {
  userId: string;
  amount: number;
  metadata?: CreditEventMetadata;
  reason: string;
}

export async function grantCredits(options: PurchaseOptions) {
  const amount = Math.max(options.amount, 0);
  if (amount === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: options.userId },
      data: { credits: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId: options.userId,
        amount,
        type: CreditTransactionType.CREDIT,
        reason: options.reason,
        metadata: options.metadata ?? undefined,
      },
    });

    await logUsageEvent(
      options.userId,
      UsageEventType.CREDIT_PURCHASED,
      {
        amount,
        reason: options.reason,
        ...(options.metadata ?? {}),
      },
      { client: tx }
    );
  });
}
