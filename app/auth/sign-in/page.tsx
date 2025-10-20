"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { MailIcon, Loader2Icon, ShieldCheckIcon, LogInIcon } from "lucide-react";

const callbackUrl = "/image-ad";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setMessage(result.error);
      } else {
        setMessage("Check your inbox for a magic link to finish signing in.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 text-slate-200">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Secure access</p>
        <h1 className="text-3xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">
          Authenticate with email or Google to unlock your workspace, credit balance, and render history.
        </p>
      </header>
      <div className="grid gap-4">
        <button
          type="button"
          onClick={() => void signIn("google", { callbackUrl })}
          className="inline-flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-brand-500 hover:text-white"
        >
          <LogInIcon className="h-4 w-4" />
          Continue with Google
        </button>
        <div className="relative flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span className="h-px flex-1 bg-slate-800" aria-hidden />
          Or use email
          <span className="h-px flex-1 bg-slate-800" aria-hidden />
        </div>
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <label className="block text-sm text-slate-300">
            Email
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 focus-within:border-brand-500">
              <MailIcon className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@brand.com"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/80 bg-brand-500/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
            Send magic link
          </button>
        </form>
        {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      </div>
    </div>
  );
}
