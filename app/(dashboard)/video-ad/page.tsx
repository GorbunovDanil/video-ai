import { CreativeBriefForm } from "@/components/forms/creative-brief-form";
import { ExportPresetSelector } from "@/components/export-preset-selector";
import { PromptTemplates } from "@/components/prompt-templates";
import { VariantGrid } from "@/components/variant-grid";
import { VideoPlayer } from "@/components/media/video-player";

const sampleVideo = {
  src: "https://cdn.coverr.co/videos/coverr-waves-at-sunset-6540/1080p.mp4",
  poster: "https://images.pexels.com/photos/7232402/pexels-photo-7232402.jpeg",
};

export default function VideoAdPage() {
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
      />
      <PromptTemplates />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <VideoPlayer src={sampleVideo.src} poster={sampleVideo.poster} caption="15s vertical preview" />
        <VariantGrid enablePlayback />
      </div>
      <ExportPresetSelector />
    </main>
  );
}
