"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import clsx from "clsx";

type ExportPreset = {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
  format: "mp4" | "png" | "jpg";
  description: string;
};

const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: "meta-feed",
    name: "Meta Feed",
    platform: "Facebook/Instagram",
    width: 1080,
    height: 1080,
    format: "mp4",
    description: "1:1 square for feeds",
  },
  {
    id: "meta-story",
    name: "Meta Story",
    platform: "Facebook/Instagram",
    width: 1080,
    height: 1920,
    format: "mp4",
    description: "9:16 vertical for stories",
  },
  {
    id: "tiktok-spark",
    name: "TikTok Spark",
    platform: "TikTok",
    width: 1080,
    height: 1920,
    format: "mp4",
    description: "9:16 vertical (max 60s)",
  },
  {
    id: "pinterest-pin",
    name: "Pinterest Pin",
    platform: "Pinterest",
    width: 1000,
    height: 1500,
    format: "png",
    description: "2:3 portrait for pins",
  },
  {
    id: "youtube-bumper",
    name: "YouTube Bumper",
    platform: "YouTube",
    width: 1920,
    height: 1080,
    format: "mp4",
    description: "16:9 landscape (6s bumper)",
  },
  {
    id: "linkedin-feed",
    name: "LinkedIn Feed",
    platform: "LinkedIn",
    width: 1200,
    height: 627,
    format: "jpg",
    description: "1.91:1 horizontal",
  },
];

export function ExportPresetSelector({
  selectedVariant,
  onExport,
}: {
  selectedVariant?: { id: string; url?: string; type?: "image" | "video" };
  onExport?: (preset: ExportPreset, variantUrl: string) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (preset: ExportPreset) => {
    if (!selectedVariant?.url) {
      setExportError("No variant selected. Please select an image or video to export.");
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setSelectedPreset(preset.id);

    try {
      if (onExport) {
        // Use custom export handler if provided
        onExport(preset, selectedVariant.url);
      } else {
        // Default export: download the file
        // In a real implementation, you would resize/convert the file here
        const response = await fetch(selectedVariant.url);
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `export-${preset.id}-${Date.now()}.${preset.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Export failed:", error);
      setExportError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setSelectedPreset(null), 1000);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <header>
        <h2 className="text-xl font-semibold text-white">Export presets</h2>
        <p className="mt-1 text-sm text-slate-400">
          Export optimized for each advertising platform.
        </p>
      </header>

      {/* Error Display */}
      {exportError && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-200">
          {exportError}
        </div>
      )}

      {/* Presets Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          const isCurrentlyExporting = isExporting && isSelected;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleExport(preset)}
              disabled={isExporting || !selectedVariant?.url}
              className={clsx(
                "group relative flex flex-col rounded-xl border p-4 text-left transition",
                isSelected && !isExporting
                  ? "border-green-500 bg-green-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80",
                (!selectedVariant?.url || isExporting) && "cursor-not-allowed opacity-50"
              )}
            >
              {/* Platform Badge */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-xs text-slate-300">
                  {preset.platform}
                </span>
                {isCurrentlyExporting ? (
                  <Loader2Icon className="h-4 w-4 animate-spin text-brand-400" />
                ) : isSelected ? (
                  <DownloadIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <DownloadIcon className="h-4 w-4 text-slate-500 transition group-hover:text-slate-400" />
                )}
              </div>

              {/* Preset Info */}
              <h3 className="text-sm font-semibold text-white">{preset.name}</h3>
              <p className="mt-1 text-xs text-slate-400">{preset.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {preset.width}×{preset.height} • {preset.format.toUpperCase()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      {!selectedVariant?.url && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center text-sm text-slate-400">
          Select a variant above to enable exporting
        </div>
      )}

      {selectedVariant?.url && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center text-sm text-slate-400">
          Click a preset to export your selected {selectedVariant.type || "asset"}
        </div>
      )}
    </section>
  );
}
