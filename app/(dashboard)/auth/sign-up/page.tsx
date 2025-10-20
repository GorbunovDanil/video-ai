import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Authentication</p>
        <h1 className="text-3xl font-semibold text-white">Create your workspace</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Launch a collaborative studio with brand guardrails, prompt templates, and export
          automation built in.
        </p>
      </header>
      <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <label className="space-y-2 text-sm text-slate-300">
          Full name
          <input
            type="text"
            required
            placeholder="Taylor Jordan"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Company email
          <input
            type="email"
            required
            placeholder="you@brand.com"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Preferred color palette
          <input
            type="text"
            placeholder="#2563EB, #0EA5E9, #38BDF8"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
          />
        </label>
        <button className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-white">
          Create workspace
        </button>
        <p className="text-xs text-slate-500">
          Already collaborating? <Link href="/auth/sign-in">Return to sign in</Link>.
        </p>
      </form>
    </main>
  );
}
