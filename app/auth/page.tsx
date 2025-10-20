import Link from "next/link";

export default function AuthIndexPage() {
  return (
    <div className="space-y-6 text-slate-200">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Authentication</p>
        <h1 className="text-3xl font-semibold text-white">Sign in to Video AI Studio</h1>
        <p className="text-sm text-slate-400">
          Use your workspace email or connect Google SSO to access your dashboards, credits, and render history.
        </p>
      </header>
      <div className="space-y-4">
        <Link
          href="/auth/sign-in"
          className="inline-flex w-full items-center justify-center rounded-xl border border-brand-500/80 bg-brand-500/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30"
        >
          Continue to sign in
        </Link>
        <p className="text-xs text-slate-500">
          Looking for billing? Visit your <Link href="/account" className="text-brand-200 underline">account dashboard</Link> once signed in.
        </p>
      </div>
    </div>
  );
}
