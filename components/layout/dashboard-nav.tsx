"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  GalleryVerticalEndIcon,
  ImageIcon,
  LogInIcon,
  PlayIcon,
  SettingsIcon,
  SparklesIcon,
  TagsIcon,
} from "lucide-react";

const items = [
  { href: "/image-ad", label: "Image Ad", icon: ImageIcon },
  { href: "/video-ad", label: "Video Ad", icon: PlayIcon },
  { href: "/gallery", label: "Gallery", icon: GalleryVerticalEndIcon },
  { href: "/account", label: "Account", icon: SettingsIcon },
  { href: "/auth", label: "Auth", icon: LogInIcon },
  { href: "/pricing", label: "Pricing", icon: TagsIcon },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-200">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Video AI</p>
          <p className="text-base font-semibold text-white">Creative Studio</p>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "border-brand-500 bg-brand-500/20 text-brand-100"
                  : "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="rounded-2xl border border-dashed border-brand-500/60 bg-brand-500/10 p-4 text-sm text-brand-100">
        <p className="font-semibold">Need inspiration?</p>
        <p className="mt-1 text-xs">
          Explore curated prompts, campaign blueprints, and channel best practices to keep
          your creative pipeline flowing.
        </p>
        <Link
          href="/gallery"
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-brand-500/80 bg-brand-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/30"
        >
          Browse gallery
        </Link>
      </div>
    </aside>
  );
}
