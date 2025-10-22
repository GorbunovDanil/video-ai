"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Loader2Icon, SparklesIcon, VideoIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { CreativeBriefForm, type CreativeBriefValues } from "@/components/forms/creative-brief-form";
import { ExportPresetSelector } from "@/components/export-preset-selector";
import { PromptTemplates, type PromptTemplate } from "@/components/prompt-templates";
import { VariantGrid } from "@/components/variant-grid";
import { VideoPlayer } from "@/components/media/video-player";
import { useProject } from "@/contexts/project-context";

type RenderStatus = "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";

type VideoRender = {
  renderId: string;
  jobId: string;
  status: RenderStatus;
  outputAssetUrl?: string;
  costInCredits?: number;
  error?: string;
  type: "preview" | "final";
};

export default function VideoAdPage() {
  const { data: session, update: updateSession } = useSession();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [briefValues, setBriefValues] = useState<CreativeBriefValues | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingFinal, setIsGeneratingFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRender, setPreviewRender] = useState<VideoRender | null>(null);
  const [finalRender, setFinalRender] = useState<VideoRender | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for render status
  const pollRenderStatus = async (renderId: string, type: "preview" | "final") => {
    try {
      const response = await fetch(`/api/renders/${renderId}`);
      if (!response.ok) return;

      const data = await response.json();
      const render = data.render;

      const videoRender: VideoRender = {
        renderId: render.id,
        jobId: render.providerJobId || "",
        status: render.status,
        outputAssetUrl: render.outputAssetUrl,
        costInCredits: render.costInCredits,
        error: render.error,
        type,
      };

      if (type === "preview") {
        setPreviewRender(videoRender);
      } else {
        setFinalRender(videoRender);
      }

      // Stop polling if completed or failed
      if (render.status === "SUCCEEDED" || render.status === "FAILED") {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        // Refresh credits
        await updateSession();

        if (render.status === "FAILED") {
          setError(`Video generation failed: ${render.error || "Unknown error"}`);
        }
      }
    } catch (err) {
      console.error("Failed to poll render status:", err);
    }
  };

  // Start polling when a render is created
  useEffect(() => {
    const activeRender = finalRender || previewRender;

    if (activeRender && (activeRender.status === "QUEUED" || activeRender.status === "PROCESSING")) {
      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        pollRenderStatus(activeRender.renderId, activeRender.type);
      }, 5000);

      // Initial poll
      pollRenderStatus(activeRender.renderId, activeRender.type);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [previewRender?.renderId, finalRender?.renderId, previewRender?.status, finalRender?.status]);

  const handleGeneratePreview = async () => {
    if (!currentProject || !selectedTemplate || !briefValues) {
      setError("Please fill out the video brief and select a template");
      return;
    }

    setIsGeneratingPreview(true);
    setError(null);

    try {
      const enhancedPrompt = `${selectedTemplate.prompt}

Brand Context:
- Colors: ${briefValues.brandColors.join(", ")}
- Value Proposition: ${briefValues.valueProposition}
- Target Audience: ${briefValues.targetAudience}
- Style: ${briefValues.style}
- Format: ${briefValues.format}`;

      const assets = briefValues.assetReferences
        .filter(ref => ref.trim() !== "")
        .map(uri => ({ type: "image", uri }));

      const response = await fetch("/api/video/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          prompt: enhancedPrompt,
          quality: "fast",
          brandSettings: {
            primaryColor: briefValues.brandColors[0],
            secondaryColor: briefValues.brandColors[1],
            accentColor: briefValues.brandColors[2],
          },
          assets: assets.length > 0 ? assets : undefined,
          durationSeconds: 15,
          aspectRatio: "9:16",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video preview");
      }

      setPreviewRender({
        renderId: data.renderId,
        jobId: data.jobId,
        status: "PROCESSING",
        type: "preview",
        costInCredits: data.estimatedCredits,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video preview");
      console.error("Preview generation error:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleGenerateFinal = async () => {
    if (!currentProject || !selectedTemplate || !briefValues || !previewRender) {
      setError("Please generate a preview first");
      return;
    }

    setIsGeneratingFinal(true);
    setError(null);

    try {
      const enhancedPrompt = `${selectedTemplate.prompt}

Brand Context:
- Colors: ${briefValues.brandColors.join(", ")}
- Value Proposition: ${briefValues.valueProposition}
- Target Audience: ${briefValues.targetAudience}
- Style: ${briefValues.style}
- Format: ${briefValues.format}`;

      const assets = briefValues.assetReferences
        .filter(ref => ref.trim() !== "")
        .map(uri => ({ type: "image", uri }));

      const response = await fetch("/api/video/final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          prompt: enhancedPrompt,
          quality: "standard",
          previewRenderId: previewRender.renderId,
          brandSettings: {
            primaryColor: briefValues.brandColors[0],
            secondaryColor: briefValues.brandColors[1],
            accentColor: briefValues.brandColors[2],
          },
          assets: assets.length > 0 ? assets : undefined,
          durationSeconds: 15,
          aspectRatio: "9:16",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate final video");
      }

      setFinalRender({
        renderId: data.renderId,
        jobId: data.jobId,
        status: "PROCESSING",
        type: "final",
        costInCredits: data.estimatedCredits,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate final video");
      console.error("Final generation error:", err);
    } finally {
      setIsGeneratingFinal(false);
    }
  };

  const renderStatusBadge = (render: VideoRender | null) => {
    if (!render) return null;

    const statusConfig = {
      QUEUED: { icon: Loader2Icon, text: "Queued", class: "text-yellow-400" },
      PROCESSING: { icon: Loader2Icon, text: "Processing", class: "text-blue-400 animate-spin" },
      SUCCEEDED: { icon: CheckCircle2Icon, text: "Ready", class: "text-green-400" },
      FAILED: { icon: XCircleIcon, text: "Failed", class: "text-red-400" },
    };

    const config = statusConfig[render.status];
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-2 text-sm">
        <Icon className={`h-4 w-4 ${config.class}`} />
        <span className={config.class}>{config.text}</span>
        {render.costInCredits && (
          <span className="text-slate-400">({render.costInCredits} credits)</span>
        )}
      </div>
    );
  };

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Video workflow</p>
        <h1 className="text-3xl font-semibold text-white">Produce ready-to-ship video ads</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Assemble scripts, footage, and voice guidance in one place. Experiment with
          different narrative styles, review generated cuts, and export platform-ready
          deliverables.
        </p>
      </header>

      <CreativeBriefForm
        title="Video brief"
        description="Define the tone, structure, and visuals your motion assets should reflect."
        onChange={setBriefValues}
      />

      <PromptTemplates onSelect={setSelectedTemplate} />

      {/* Generate Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleGeneratePreview}
          disabled={isGeneratingPreview || !currentProject || !selectedTemplate || !briefValues || projectLoading || (previewRender?.status === "PROCESSING" || previewRender?.status === "QUEUED")}
          className="inline-flex items-center gap-3 rounded-full border border-brand-500 bg-brand-500 px-8 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGeneratingPreview || previewRender?.status === "PROCESSING" || previewRender?.status === "QUEUED" ? (
            <>
              <Loader2Icon className="h-5 w-5 animate-spin" />
              Generating Preview...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5" />
              Generate Preview (Fast)
            </>
          )}
        </button>

        {previewRender?.status === "SUCCEEDED" && (
          <button
            type="button"
            onClick={handleGenerateFinal}
            disabled={isGeneratingFinal || (finalRender?.status === "PROCESSING" || finalRender?.status === "QUEUED")}
            className="inline-flex items-center gap-3 rounded-full border border-purple-500 bg-purple-500 px-8 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingFinal || finalRender?.status === "PROCESSING" || finalRender?.status === "QUEUED" ? (
              <>
                <Loader2Icon className="h-5 w-5 animate-spin" />
                Generating Final...
              </>
            ) : (
              <>
                <VideoIcon className="h-5 w-5" />
                Generate Final (High Quality)
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Video Display */}
      {(previewRender || finalRender) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preview Video */}
          {previewRender && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Preview (Fast)</h3>
                {renderStatusBadge(previewRender)}
              </div>
              {previewRender.status === "SUCCEEDED" && previewRender.outputAssetUrl ? (
                <VideoPlayer
                  src={previewRender.outputAssetUrl}
                  caption="Preview render"
                />
              ) : (
                <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="text-center">
                    <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm text-slate-400">
                      {previewRender.status === "PROCESSING" ? "Processing video..." : "Queued"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      This may take 2-3 minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Final Video */}
          {finalRender && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Final (High Quality)</h3>
                {renderStatusBadge(finalRender)}
              </div>
              {finalRender.status === "SUCCEEDED" && finalRender.outputAssetUrl ? (
                <VideoPlayer
                  src={finalRender.outputAssetUrl}
                  caption="Final render"
                />
              ) : (
                <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
                  <div className="text-center">
                    <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm text-slate-400">
                      {finalRender.status === "PROCESSING" ? "Processing high-quality video..." : "Queued"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      This may take 5-10 minutes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Variants for completed videos */}
      {(previewRender?.status === "SUCCEEDED" || finalRender?.status === "SUCCEEDED") && (
        <>
          <VariantGrid
            variants={[
              ...(previewRender?.status === "SUCCEEDED" && previewRender.outputAssetUrl
                ? [{
                    id: previewRender.renderId,
                    title: "Preview",
                    description: `Fast preview (${previewRender.costInCredits || 3} credits)`,
                    type: "video" as const,
                    aspect: "9:16",
                    url: previewRender.outputAssetUrl,
                  }]
                : []),
              ...(finalRender?.status === "SUCCEEDED" && finalRender.outputAssetUrl
                ? [{
                    id: finalRender.renderId,
                    title: "Final",
                    description: `High quality (${finalRender.costInCredits || 6} credits)`,
                    type: "video" as const,
                    aspect: "9:16",
                    url: finalRender.outputAssetUrl,
                  }]
                : []),
            ]}
            selectedId={selectedVariantId || undefined}
            onSelect={(variant) => setSelectedVariantId(variant.id)}
            enablePlayback
          />
          <ExportPresetSelector
            selectedVariant={selectedVariantId ? {
              id: selectedVariantId,
              url: previewRender?.renderId === selectedVariantId ? previewRender.outputAssetUrl : finalRender?.outputAssetUrl,
              type: "video",
            } : undefined}
          />
        </>
      )}

      {/* Loading Project State */}
      {projectLoading && !error && (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Credits Display */}
      {session?.user && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-center">
          <p className="text-sm text-slate-400">
            Available credits: <span className="font-semibold text-white">{session.user.credits ?? 0}</span>
            <span className="ml-3 text-xs text-slate-500">
              Preview: ~3 credits | Final: ~6 credits
            </span>
          </p>
        </div>
      )}
    </main>
  );
}
