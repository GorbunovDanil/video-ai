import type { DefaultSession } from "next-auth";
import type { PlanTier } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      plan: PlanTier;
      credits: number;
    };
  }

  interface User {
    plan: PlanTier;
    credits: number;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: PlanTier;
    credits?: number;
  }
}
