const plans = [
  {
    name: "Starter",
    price: "$49",
    cadence: "per month",
    description: "Launch quick experiments and prototype creative variations.",
    features: [
      "5 brand workspaces",
      "50 image generations",
      "10 video cuts",
      "Social export presets",
    ],
  },
  {
    name: "Growth",
    price: "$149",
    cadence: "per month",
    description: "Scale paid social operations with collaboration features.",
    features: [
      "Unlimited brand kits",
      "200 image generations",
      "50 video cuts",
      "UploadThing + S3 ingestion",
      "Team roles & approvals",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "annual partnership",
    description: "Enterprise guardrails, automation, and white-glove onboarding.",
    features: [
      "Dedicated success partner",
      "Real-time collaboration",
      "Usage-based billing",
      "Advanced analytics",
      "Security review & SSO",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pricing</p>
        <h1 className="text-3xl font-semibold text-white">Plans for every growth stage</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Choose the plan that matches your creative throughput and team collaboration needs.
        </p>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{plan.cadence}</p>
              <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-3xl font-bold text-brand-200">{plan.price}</p>
            </div>
            <p className="text-sm text-slate-400">{plan.description}</p>
            <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-300">
              {plan.features.map((feature) => (
                <li key={feature} className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                  {feature}
                </li>
              ))}
            </ul>
            <button className="rounded-xl border border-brand-500/70 bg-brand-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30">
              {plan.name === "Scale" ? "Contact sales" : "Start trial"}
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
