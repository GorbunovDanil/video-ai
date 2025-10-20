import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Authentication</p>
        <h1 className="text-3xl font-semibold text-white">Sign in</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Enter your workspace email address and we&apos;ll send a secure magic link to
          continue.
        </p>
      </header>
      <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <label className="space-y-2 text-sm text-slate-300">
          Email address
          <input
            type="email"
            required
            placeholder="you@brand.com"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
          />
        </label>
        <button className="w-full rounded-xl border border-brand-500/70 bg-brand-500/20 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30">
          Send magic link
        </button>
        <p className="text-xs text-slate-500">
          Prefer a password? <Link href="/auth">Manage login options</Link>.
        </p>
      </form>
    </main>
  );
}
