import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assertStripeClient } from "@/lib/stripe";

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
};

const CREDIT_PRICE_ID = process.env.STRIPE_PRICE_VIDEO_CREDITS;
const CREDIT_PACKAGE_SIZE = Number(process.env.STRIPE_CREDIT_PACKAGE_SIZE ?? 20);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const stripe = assertStripeClient();

  const { product, quantity = 1, callbackUrl } = body as {
    product?: string;
    quantity?: number;
    callbackUrl?: string;
  };

  if (!product || typeof product !== "string") {
    return NextResponse.json({ error: "product is required" }, { status: 400 });
  }

  const origin = callbackUrl || request.headers.get("origin") || process.env.APP_URL || "http://localhost:3000";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customerId = user.stripeCustomerId ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });

    customerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  if (product === "video_credits") {
    if (!CREDIT_PRICE_ID) {
      return NextResponse.json({ error: "Credit price is not configured" }, { status: 500 });
    }

    const creditsPerPack = Number.isFinite(CREDIT_PACKAGE_SIZE) && CREDIT_PACKAGE_SIZE > 0 ? CREDIT_PACKAGE_SIZE : 20;
    const quantityInt = Number.isFinite(Number(quantity)) && Number(quantity) > 0 ? Math.floor(Number(quantity)) : 1;

    const sessionCheckout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price: CREDIT_PRICE_ID,
          quantity: quantityInt,
        },
      ],
      success_url: `${origin}/account?checkout=success`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        type: "credits",
        credits: String(creditsPerPack * quantityInt),
        userId: user.id,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: sessionCheckout.url });
  }

  const priceId = PLAN_PRICE_MAP[product];

  if (!priceId) {
    return NextResponse.json({ error: "Unsupported product" }, { status: 400 });
  }

  const sessionCheckout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/pricing`,
    metadata: {
      type: "plan",
      plan: product.toUpperCase(),
      userId: user.id,
    },
    subscription_data: {
      metadata: {
        plan: product.toUpperCase(),
        userId: user.id,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: sessionCheckout.url });
}
