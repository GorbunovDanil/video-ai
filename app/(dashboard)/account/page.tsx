import { CreativeBriefForm } from "@/components/forms/creative-brief-form";

const teams = [
  {
    name: "Acme Creative",
    members: 12,
    plan: "Scale",
  },
  {
    name: "Retail Launch Pod",
    members: 6,
    plan: "Growth",
  },
];

export default function AccountPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account</p>
        <h1 className="text-3xl font-semibold text-white">Workspace settings</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Manage brand kits, access, and integrations that keep your creative operations
          aligned.
        </p>
      </header>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Brand kits</h2>
            <p className="text-sm text-slate-400">
              Maintain consistent palettes, typography, and messaging for every team.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-brand-500/70 bg-brand-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30">
            Create new kit
          </button>
        </header>
        <CreativeBriefForm
          title="Default brand brief"
          description="Edit the default prompt, audience, and format preferences applied across workflows."
        />
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Teams & roles</h2>
            <p className="text-sm text-slate-400">
              Control who can launch generations, approve creatives, and export finals.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-white">
            Invite member
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.name} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">{team.name}</p>
              <p className="text-xs text-slate-400">{team.members} members • {team.plan} plan</p>
              <button className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs uppercase tracking-wide text-slate-300 transition hover:border-slate-500 hover:text-white">
                Manage permissions
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
