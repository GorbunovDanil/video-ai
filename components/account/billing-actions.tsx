"use client";

import { useState } from "react";
import { CreditCardIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";

interface BillingActionsProps {
  plan: string;
  hasSubscription: boolean;
}

type ActionKey = "upgrade" | "credits" | "portal";

async function startCheckout(product: string, quantity?: number) {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, quantity }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Unable to start checkout");
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error("Checkout session missing redirect URL");
  }

  window.location.href = payload.url;
}

async function openPortal() {
  const response = await fetch("/api/stripe/portal", {
    method: "POST",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Unable to open billing portal");
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error("Billing portal response missing URL");
  }

  window.location.href = payload.url;
}

export function BillingActions({ plan, hasSubscription }: BillingActionsProps) {
  const [active, setActive] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: ActionKey, executor: () => Promise<void>) {
    setActive(action);
    setError(null);

    try {
      await executor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setActive(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {plan !== "PRO" ? (
          <button
            type="button"
            onClick={() => void handle("upgrade", () => startCheckout("pro"))}
            disabled={active !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/80 bg-brand-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {active === "upgrade" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
            Upgrade to Pro
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handle("credits", () => startCheckout("video_credits"))}
          disabled={active !== null}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {active === "credits" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CreditCardIcon className="h-4 w-4" />}
          Buy credits
        </button>
        {hasSubscription ? (
          <button
            type="button"
            onClick={() => void handle("portal", openPortal)}
            disabled={active !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {active === "portal" ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
            Manage billing
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
