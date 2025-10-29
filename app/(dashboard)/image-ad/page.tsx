"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { CreativeBriefForm, type CreativeBriefValues } from "@/components/forms/creative-brief-form";
import { ExportPresetSelector } from "@/components/export-preset-selector";
import { PromptTemplates, type PromptTemplate } from "@/components/prompt-templates";
import { VariantGrid, type Variant } from "@/components/variant-grid";
import { useProject } from "@/contexts/project-context";
import { FileUpload, AssetGallery } from "@/components/assets/file-upload";

type GeneratedImage = {
  renderId: string;
  signedUrl: string;
  cdnUrl: string;
  costInCredits: number;
};

type Asset = {
  id: string;
  fileName: string;
  cdnUrl: string;
  type: string;
  fileSize: number;
  width?: number;
  height?: number;
};

export default function ImageAdPage() {
  const { data: session, update: updateSession } = useSession();
  const { currentProject, isLoading: projectLoading } = useProject();
  const [briefValues, setBriefValues] = useState<CreativeBriefValues | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch assets when project changes
  useEffect(() => {
    if (currentProject) {
      fetchAssets();
    }
  }, [currentProject]);

  const fetchAssets = async () => {
    if (!currentProject) return;

    try {
      const response = await fetch(`/api/assets?projectId=${currentProject.id}&type=IMAGE`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const handleAssetUpload = (asset: Asset) => {
    setAssets(prev => [asset, ...prev]);
    setUploadError(null);
  };

  const handleAssetRemove = (assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
    setSelectedAssetIds(prev => prev.filter(id => id !== assetId));
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAssetIds(prev => {
      if (prev.includes(asset.id)) {
        return prev.filter(id => id !== asset.id);
      } else {
        return [...prev, asset.id];
      }
    });
  };

  const handleGenerate = async () => {
    if (!currentProject || !selectedTemplate || !briefValues) {
      setError("Please fill out the creative brief and select a template");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get selected assets
      const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id));

      // Build the prompt with brand context
      let enhancedPrompt = `${selectedTemplate.prompt}

Brand Context:
- Colors: ${briefValues.brandColors.join(", ")}
- Value Proposition: ${briefValues.valueProposition}
- Target Audience: ${briefValues.targetAudience}
- Style: ${briefValues.style}
- Format: ${briefValues.format}`;

      // Add asset context if assets are selected
      if (selectedAssets.length > 0) {
        enhancedPrompt += `\n\nReference Images:\n${selectedAssets.map(a => `- ${a.fileName}: ${a.cdnUrl}`).join("\n")}`;
      }

      // Prepare assets for API
      const assetPayload = [
        ...selectedAssets.map(a => ({ type: "image", uri: a.cdnUrl })),
        ...briefValues.assetReferences
          .filter(ref => ref.trim() !== "")
          .map(uri => ({ type: "image", uri }))
      ];

      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProject.id,
          prompt: enhancedPrompt,
          brandSettings: {
            primaryColor: briefValues.brandColors[0],
            secondaryColor: briefValues.brandColors[1],
            accentColor: briefValues.brandColors[2],
          },
          assets: assetPayload.length > 0 ? assetPayload : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      // Add the generated image to the list
      setGeneratedImages(prev => [...prev, {
        renderId: data.renderId,
        signedUrl: data.signedUrl,
        cdnUrl: data.cdnUrl,
        costInCredits: data.costInCredits,
      }]);

      // Refresh session to update credits
      await updateSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert generated images to variants for the grid
  const variants: Variant[] = generatedImages.map((img, index) => ({
    id: img.renderId,
    title: `Variant ${index + 1}`,
    description: `Generated image (${img.costInCredits} credits)`,
    type: "image" as const,
    aspect: "4:5",
    url: img.signedUrl,
  }));

  // Get selected variant
  const selectedVariant = selectedVariantId
    ? variants.find(v => v.id === selectedVariantId)
    : null;

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Image workflow</p>
        <h1 className="text-3xl font-semibold text-white">Generate on-brand image ads</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Upload product assets or connect storage, choose prompt templates, and instantly
          explore AI-assisted variants before exporting to every ad platform.
        </p>
      </header>

      {/* Asset Upload Section */}
      {currentProject && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Product Assets</h2>
              <p className="text-sm text-slate-400">
                Upload images to use as references in your ad generation
                {selectedAssetIds.length > 0 && (
                  <span className="ml-2 text-brand-400">
                    ({selectedAssetIds.length} selected)
                  </span>
                )}
              </p>
            </div>
          </div>

          <FileUpload
            projectId={currentProject.id}
            type="IMAGE"
            accept="image/*"
            maxSizeMB={10}
            onUploadComplete={handleAssetUpload}
            onUploadError={setUploadError}
          />

          {uploadError && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-200">
              {uploadError}
            </div>
          )}

          {assets.length > 0 && (
            <AssetGallery
              assets={assets}
              onRemove={handleAssetRemove}
              onSelect={handleAssetSelect}
              selectedAssetIds={selectedAssetIds}
            />
          )}
        </section>
      )}

      <CreativeBriefForm onChange={setBriefValues} />

      <PromptTemplates onSelect={setSelectedTemplate} />

      {/* Generate Button */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !currentProject || !selectedTemplate || !briefValues || projectLoading}
          className="inline-flex items-center gap-3 rounded-full border border-brand-500 bg-brand-500 px-8 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2Icon className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-5 w-5" />
              Generate Image
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-red-800 bg-red-900/20 p-4 text-center">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Generated Images */}
      {variants.length > 0 && (
        <>
          <VariantGrid
            variants={variants}
            selectedId={selectedVariantId || undefined}
            onSelect={(variant) => setSelectedVariantId(variant.id)}
          />
          <ExportPresetSelector
            selectedVariant={selectedVariant ? {
              id: selectedVariant.id,
              url: selectedVariant.url,
              type: selectedVariant.type,
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
          </p>
        </div>
      )}
    </main>
  );
}
