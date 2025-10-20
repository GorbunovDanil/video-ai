import Stripe from "stripe";

const apiKey = process.env.STRIPE_API_KEY;

export const stripe = apiKey
  ? new Stripe(apiKey, {
      apiVersion: "2024-06-20",
    })
  : null;

export function assertStripeClient(): Stripe {
  if (!stripe) {
    throw new Error("Stripe API key is not configured");
  }

  return stripe;
}
