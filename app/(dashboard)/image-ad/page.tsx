import { CreativeBriefForm } from "@/components/forms/creative-brief-form";
import { ExportPresetSelector } from "@/components/export-preset-selector";
import { PromptTemplates } from "@/components/prompt-templates";
import { VariantGrid } from "@/components/variant-grid";

export default function ImageAdPage() {
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
      <CreativeBriefForm />
      <PromptTemplates />
      <VariantGrid />
      <ExportPresetSelector />
    </main>
  );
}
