import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

const sections = [
  { href: "/image-ad", label: "Image Ad Generator" },
  { href: "/video-ad", label: "Video Ad Builder" },
  { href: "/gallery", label: "Asset Gallery" },
  { href: "/account", label: "Account" },
  { href: "/auth", label: "Auth" },
  { href: "/pricing", label: "Pricing" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16">
      <section className="space-y-6 text-center">
        <p className="text-sm uppercase tracking-wide text-slate-400">
          Welcome to Video AI Studio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Launch campaign-ready creative in minutes.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-300">
          Configure prompts, upload product assets, and generate cohesive visuals with
          export presets for every platform. Choose a workflow to get started.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-slate-800 bg-slate-900/30 p-6 transition hover:border-blue-500 hover:bg-slate-900/60"
          >
            <div className="flex items-center justify-between text-lg font-medium text-white">
              {section.label}
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-1" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              Explore the {section.label.toLowerCase()} workflow with guided prompts and
              instant exports.
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
