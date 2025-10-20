import Link from "next/link";

const providers = [
  { name: "Google", description: "SSO with company managed Google Workspace" },
  { name: "Azure AD", description: "Enterprise identity provider" },
  { name: "Magic link", description: "Email-based passwordless login" },
];

export default function AuthPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Authentication</p>
        <h1 className="text-3xl font-semibold text-white">Access & identity</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Configure login methods, session policies, and account recovery for the creative
          workspace.
        </p>
      </header>
      <section className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Sign in</h2>
          <p className="text-sm text-slate-400">
            Authenticate with your workspace email to access generation tools.
          </p>
          <label className="space-y-2 text-sm text-slate-300">
            Email
            <input
              type="email"
              required
              placeholder="you@brand.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Password
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
            />
          </label>
          <button className="w-full rounded-xl border border-brand-500/70 bg-brand-500/20 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30">
            Sign in
          </button>
          <p className="text-xs text-slate-500">
            Forgot password? <Link href="/auth/sign-in">Send a magic link.</Link>
          </p>
        </form>
        <form className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white">Create workspace</h2>
          <p className="text-sm text-slate-400">
            Spin up a new environment for your team with brand guidelines baked in.
          </p>
          <label className="space-y-2 text-sm text-slate-300">
            Workspace name
            <input
              type="text"
              required
              placeholder="Acme Beverage Co"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            Primary brand color
            <input
              type="color"
              defaultValue="#2563EB"
              className="h-12 w-full rounded-xl border border-slate-800 bg-slate-950/60"
            />
          </label>
          <button className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-500 hover:text-white">
            Continue
          </button>
          <p className="text-xs text-slate-500">
            Already have an account? <Link href="/auth/sign-in">Sign in here.</Link>
          </p>
        </form>
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Connected providers</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider.name} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-sm font-semibold text-white">{provider.name}</p>
              <p className="text-xs text-slate-400">{provider.description}</p>
              <button className="mt-4 inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs uppercase tracking-wide text-slate-300 transition hover:border-slate-500 hover:text-white">
                Configure
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
