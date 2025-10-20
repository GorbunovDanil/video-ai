"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckIcon, DownloadIcon, Share2Icon } from "lucide-react";

export type ExportPreset = {
  id: string;
  label: string;
  description: string;
  dimensions: string;
  format: "mp4" | "mov" | "png" | "jpg" | "gif";
};

const defaultPresets: ExportPreset[] = [
  {
    id: "meta-feed",
    label: "Meta Feed",
    description: "Optimized for Facebook & Instagram feed placements.",
    dimensions: "1080 x 1350",
    format: "mp4",
  },
  {
    id: "tiktok-spark",
    label: "TikTok Spark",
    description: "9:16 ratio with baked-in captions for Spark Ads.",
    dimensions: "1080 x 1920",
    format: "mp4",
  },
  {
    id: "pinterest-idea",
    label: "Pinterest Idea Pin",
    description: "Split-frame design with motion poster export.",
    dimensions: "1080 x 1920",
    format: "gif",
  },
  {
    id: "youtube-bumper",
    label: "YouTube Bumper",
    description: "6-second bumper at 24fps with alpha-safe margins.",
    dimensions: "1920 x 1080",
    format: "mov",
  },
];

export function ExportPresetSelector({
  presets = defaultPresets,
  onExport,
}: {
  presets?: ExportPreset[];
  onExport?: (preset: ExportPreset) => void;
}) {
  const [activePresetId, setActivePresetId] = useState<string>(presets[0]?.id ?? "");

  const handleExport = (preset: ExportPreset) => {
    setActivePresetId(preset.id);
    onExport?.(preset);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Export presets</h2>
          <p className="text-sm text-slate-400">
            Package the selected variant in the right dimensions and format.
          </p>
        </div>
        <Share2Icon className="h-5 w-5 text-brand-500" />
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleExport(preset)}
            className={clsx(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition",
              preset.id === activePresetId
                ? "border-brand-500 bg-brand-500/15 text-white"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
            )}
          >
            <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
              <span>{preset.label}</span>
              {preset.id === activePresetId ? <CheckIcon className="h-4 w-4" /> : null}
            </div>
            <p className="text-xs text-slate-400">{preset.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{preset.dimensions}</span>
              <span className="uppercase">{preset.format}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
        <span>Selected preset: {activePresetId}</span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-brand-500/60 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/20"
          onClick={() => {
            const preset = presets.find((entry) => entry.id === activePresetId);
            if (preset) {
              onExport?.(preset);
            }
          }}
        >
          <DownloadIcon className="h-4 w-4" /> Download asset
        </button>
      </div>
    </section>
  );
}
