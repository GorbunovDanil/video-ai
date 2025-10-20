import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16">
      <div className="w-full max-w-xl space-y-10 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 shadow-xl">
        {children}
      </div>
    </main>
  );
}
