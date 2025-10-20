import { Loader2Icon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20">
          <Loader2Icon className="h-8 w-8 animate-spin text-brand-400" />
        </div>
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}