import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PlanTier } from "@prisma/client";

import prisma from "@/lib/prisma";
import { assertStripeClient } from "@/lib/stripe";
import { grantCredits } from "@/lib/credits";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function resolvePlanFromPrice(priceId?: string | null): PlanTier | null {
  if (!priceId) {
    return null;
  }

  if (priceId === process.env.STRIPE_PRICE_PRO) {
    return PlanTier.PRO;
  }

  if (priceId === process.env.STRIPE_PRICE_STARTER) {
    return PlanTier.STARTER;
  }

  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const customerId = (session.customer as string | null) ?? undefined;
  const userId = metadata.userId;

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : customerId
    ? await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
    : null;

  if (!user) {
    return;
  }

  if (customerId && user.stripeCustomerId !== customerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  if (metadata.type === "plan") {
    const planKey = String(metadata.plan ?? "").toUpperCase();
    const plan = planKey === "PRO" ? PlanTier.PRO : PlanTier.STARTER;
    const subscriptionId = (session.subscription as string | null) ?? undefined;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        stripeSubscriptionId: subscriptionId ?? user.stripeSubscriptionId ?? undefined,
      },
    });

    return;
  }

  if (metadata.type === "credits") {
    const credits = Number(metadata.credits ?? 0);

    if (Number.isFinite(credits) && credits > 0) {
      await grantCredits({
        userId: user.id,
        amount: credits,
        reason: "stripe_checkout_credit_purchase",
        metadata: {
          checkoutSessionId: session.id,
        },
      });
    }
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string | undefined;
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = resolvePlanFromPrice(priceId) ?? PlanTier.STARTER;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        { stripeSubscriptionId: subscription.id },
      ],
    },
  });

  if (!user) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan,
      stripeCustomerId: customerId ?? user.stripeCustomerId ?? undefined,
      stripeSubscriptionId: subscription.id,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.user.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      plan: PlanTier.STARTER,
      stripeSubscriptionId: null,
    },
  });
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = assertStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
