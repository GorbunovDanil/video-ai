"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, ImageIcon, VideoIcon, GridIcon } from "lucide-react";
import clsx from "clsx";

import { ExportPresetSelector } from "@/components/export-preset-selector";
import { VariantGrid, type Variant } from "@/components/variant-grid";

type RenderType = "IMAGE" | "VIDEO_PREVIEW" | "VIDEO_FINAL";

type Render = {
  id: string;
  type: RenderType;
  status: string;
  prompt: string;
  outputAssetUrl: string | null;
  watermarkUrl: string | null;
  costInCredits: number | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
};

type FilterType = "all" | "images" | "videos";

export default function GalleryPage() {
  const [renders, setRenders] = useState<Render[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [hasMore, setHasMore] = useState(false);

  // Fetch renders
  const fetchRenders = async (currentFilter: FilterType = filter) => {
    setIsLoading(true);
    setError(null);

    try {
      let typeParam = "";
      if (currentFilter === "images") {
        typeParam = "&type=IMAGE";
      } else if (currentFilter === "videos") {
        // Fetch both preview and final videos - we'll filter client-side
        typeParam = "";
      }

      const response = await fetch(`/api/renders?status=SUCCEEDED${typeParam}&limit=50`);

      if (!response.ok) {
        throw new Error("Failed to fetch renders");
      }

      const data = await response.json();

      // Filter videos client-side if needed
      let filteredRenders = data.renders;
      if (currentFilter === "videos") {
        filteredRenders = data.renders.filter((r: Render) =>
          r.type === "VIDEO_PREVIEW" || r.type === "VIDEO_FINAL"
        );
      }

      setRenders(filteredRenders);
      setHasMore(data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gallery");
      console.error("Gallery fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchRenders();
  }, [filter]);

  // Convert renders to variants for the grid
  const variants: Variant[] = renders
    .filter((render) => render.outputAssetUrl) // Only show renders with output
    .map((render) => {
      const isVideo = render.type === "VIDEO_PREVIEW" || render.type === "VIDEO_FINAL";
      const typeLabel = render.type === "VIDEO_PREVIEW"
        ? "Preview"
        : render.type === "VIDEO_FINAL"
        ? "Final"
        : "Image";

      return {
        id: render.id,
        title: typeLabel,
        description: `${render.project.name} • ${render.costInCredits || 0} credits`,
        type: isVideo ? "video" as const : "image" as const,
        aspect: isVideo ? "9:16" : "4:5",
        url: render.outputAssetUrl,
      };
    });

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Library</p>
        <h1 className="text-3xl font-semibold text-white">Gallery & version history</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Review generated assets, remix your favorites, and package the winning variants for
          distribution.
        </p>
      </header>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleFilterChange("all")}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
            filter === "all"
              ? "border-brand-500 bg-brand-500/20 text-brand-100"
              : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600"
          )}
        >
          <GridIcon className="h-4 w-4" />
          All Assets ({renders.length})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("images")}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
            filter === "images"
              ? "border-brand-500 bg-brand-500/20 text-brand-100"
              : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600"
          )}
        >
          <ImageIcon className="h-4 w-4" />
          Images
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("videos")}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
            filter === "videos"
              ? "border-brand-500 bg-brand-500/20 text-brand-100"
              : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600"
          )}
        >
          <VideoIcon className="h-4 w-4" />
          Videos
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-slate-400" />
            <p className="mt-2 text-sm text-slate-400">Loading your gallery...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => fetchRenders()}
            className="mt-3 text-xs text-red-300 underline hover:text-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && variants.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="mx-auto max-w-md space-y-3">
            {filter === "all" && (
              <>
                <GridIcon className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">No renders yet</h3>
                <p className="text-sm text-slate-400">
                  Start creating! Generate your first image or video to see it here.
                </p>
                <div className="flex justify-center gap-3 pt-3">
                  <a
                    href="/image-ad"
                    className="rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Create Image
                  </a>
                  <a
                    href="/video-ad"
                    className="rounded-full border border-purple-500 bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600"
                  >
                    Create Video
                  </a>
                </div>
              </>
            )}
            {filter === "images" && (
              <>
                <ImageIcon className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">No images yet</h3>
                <p className="text-sm text-slate-400">
                  Generate your first image ad to see it here.
                </p>
                <a
                  href="/image-ad"
                  className="inline-block rounded-full border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Create Image
                </a>
              </>
            )}
            {filter === "videos" && (
              <>
                <VideoIcon className="mx-auto h-12 w-12 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">No videos yet</h3>
                <p className="text-sm text-slate-400">
                  Generate your first video ad to see it here.
                </p>
                <a
                  href="/video-ad"
                  className="inline-block rounded-full border border-purple-500 bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-600"
                >
                  Create Video
                </a>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {!isLoading && !error && variants.length > 0 && (
        <>
          <VariantGrid variants={variants} enablePlayback />

          {/* Show export selector if there are assets */}
          <ExportPresetSelector />

          {/* Load More (if needed in future) */}
          {hasMore && (
            <div className="text-center">
              <p className="text-sm text-slate-400">
                Showing {variants.length} renders. Pagination coming soon.
              </p>
            </div>
          )}
        </>
      )}

      {/* Stats Footer */}
      {!isLoading && !error && variants.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-sm text-slate-400">
            {variants.length} {variants.length === 1 ? "asset" : "assets"} in gallery
            {filter !== "all" && (
              <span className="ml-2">
                • <button
                    onClick={() => setFilter("all")}
                    className="text-brand-400 hover:text-brand-300"
                  >
                    View all
                  </button>
              </span>
            )}
          </p>
        </div>
      )}
    </main>
  );
}
