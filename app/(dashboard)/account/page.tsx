import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CreditTransactionType, PlanTier } from "@prisma/client";

import { BillingActions } from "@/components/account/billing-actions";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toMetadata(record: unknown) {
  if (record && typeof record === "object" && !Array.isArray(record)) {
    return record as Record<string, unknown>;
  }
  return {} as Record<string, unknown>;
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const account = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      usageLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!account) {
    redirect("/auth/sign-in");
  }

  const usageLogs = account.usageLogs.map((log) => ({
    id: log.id,
    type: log.type,
    metadata: toMetadata(log.metadata),
    createdAt: log.createdAt,
    renderId: log.renderId,
  }));

  const creditTransactions = account.creditTransactions.map((transaction) => ({
    id: transaction.id,
    amount: transaction.amount,
    type: transaction.type,
    reason: transaction.reason,
    createdAt: transaction.createdAt,
  }));

  const planLabel = account.plan === PlanTier.PRO ? "Pro" : "Starter";
  const hasSubscription = Boolean(account.stripeSubscriptionId);

  return (
    <main className="space-y-8">
      <header className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Account</p>
            <h1 className="text-3xl font-semibold text-white">Workspace settings</h1>
            <p className="max-w-2xl text-sm text-slate-400">
              Monitor plan entitlements, remaining credits, and recent generation activity for your creative team.
            </p>
          </div>
          <div className="flex gap-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Plan</p>
              <p className="mt-1 text-xl font-semibold text-white">{planLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-3 text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Credits</p>
              <p className="mt-1 text-xl font-semibold text-white">{formatNumber(account.credits)}</p>
            </div>
          </div>
        </div>
        <BillingActions plan={account.plan} hasSubscription={hasSubscription} />
      </header>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Usage activity</h2>
            <p className="text-sm text-slate-400">Recent renders, credit captures, and moderation events.</p>
          </div>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
              {usageLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No usage recorded yet.
                  </td>
                </tr>
              ) : (
                usageLogs.map((log) => {
                  const meta = log.metadata;
                  const projectId = meta.projectId as string | undefined;
                  const cost = typeof meta.costInCredits === "number" ? meta.costInCredits : undefined;
                  const reason = meta.reason as string | undefined;
                  const prompt = meta.prompt as string | undefined;

                  return (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-medium">{log.type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-slate-400">
                          {projectId ? <p>Project: {projectId}</p> : null}
                          {cost ? <p>Credits: {formatNumber(cost)}</p> : null}
                          {reason ? <p>Reason: {reason}</p> : null}
                          {!cost && !reason && prompt ? <p className="truncate">Prompt: {prompt}</p> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{dateFormatter.format(log.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Credit ledger</h2>
            <p className="text-sm text-slate-400">Track how credits were reserved, captured, or refunded.</p>
          </div>
        </header>
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
              {creditTransactions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No credit transactions yet.
                  </td>
                </tr>
              ) : (
                creditTransactions.map((transaction) => {
                  const sign = transaction.type === CreditTransactionType.DEBIT ? -1 : 1;
                  const amountDisplay = sign * transaction.amount;

                  return (
                    <tr key={transaction.id}>
                      <td className="px-4 py-3 font-medium text-white">
                        {amountDisplay > 0 ? "+" : ""}
                        {formatNumber(amountDisplay)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{transaction.reason}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{dateFormatter.format(transaction.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
