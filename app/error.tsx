'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
          <AlertTriangleIcon className="h-8 w-8 text-rose-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            We encountered an error. Our team has been notified.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-500/80 bg-brand-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30"
          >
            <RefreshCwIcon className="h-4 w-4" />
            Try again
          </button>
          
          
          <a href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-600"
          >
            <HomeIcon className="h-4 w-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}