"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { DownloadIcon, PlayIcon } from "lucide-react";

export type Variant = {
  id: string;
  title: string;
  description: string;
  type?: "image" | "video";
  aspect?: string;
  url?: string;
};

const fallbackVariants: Variant[] = Array.from({ length: 6 }).map((_, index) => ({
  id: `variant-${index + 1}`,
  title: `Variant ${index + 1}`,
  description: "High-converting creative with optimized copy and layout.",
  type: index % 2 === 0 ? "image" : "video",
  aspect: index % 2 === 0 ? "4:5" : "9:16",
}));

export function VariantGrid({
  variants = fallbackVariants,
  onSelect,
  selectedId,
  enablePlayback = false,
  onDownload,
}: {
  variants?: Variant[];
  onSelect?: (variant: Variant) => void;
  selectedId?: string;
  enablePlayback?: boolean;
  onDownload?: (variant: Variant) => void;
}) {
  const [activeId, setActiveId] = useState<string>(selectedId ?? variants[0]?.id ?? "");

  const activeVariant = useMemo(
    () => variants.find((variant) => variant.id === activeId),
    [activeId, variants]
  );

  const handleSelect = (variant: Variant) => {
    setActiveId(variant.id);
    onSelect?.(variant);
  };

  const handleDownload = async () => {
    if (!activeVariant?.url) return;

    if (onDownload) {
      onDownload(activeVariant);
      return;
    }

    // Default download behavior
    try {
      const response = await fetch(activeVariant.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeVariant.title.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Variant explorer</h3>
          <p className="text-sm text-slate-400">
            Compare outputs and mark the best options for exporting.
          </p>
        </div>
        {activeVariant?.url ? (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/20"
          >
            <DownloadIcon className="h-4 w-4" />
            Download selection
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => handleSelect(variant)}
            className={clsx(
              "group relative flex flex-col overflow-hidden rounded-2xl border p-4 text-left transition",
              activeId === variant.id
                ? "border-brand-500 bg-brand-500/15 shadow-glow"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
            )}
          >
            <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
              {variant.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={variant.url}
                    alt={variant.title}
                    className="h-full w-full object-cover"
                  />
                  {enablePlayback && variant.type === "video" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition group-hover:opacity-100">
                      <PlayIcon className="h-10 w-10 text-white" />
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-slate-400">{variant.aspect ?? "4:5"}</span>
              )}
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                {variant.title}
              </p>
              <p className="text-xs text-slate-400">{variant.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
