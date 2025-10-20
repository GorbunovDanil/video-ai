"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import clsx from "clsx";

export type PromptTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

const defaultTemplates: PromptTemplate[] = [
  {
    id: "product-spotlight",
    title: "Product spotlight",
    description: "Hero shot with macro textures and bold typography overlay.",
    prompt:
      "Close-up hero shot of the product on a reflective surface with soft rim lighting and macro details, brand palette overlay, include bold tagline in top third.",
  },
  {
    id: "ugc-story",
    title: "UGC Story",
    description: "Scripted creator narration with quick jump cuts and captions.",
    prompt:
      "First-person creator talking about the product benefits in a bright apartment, handheld camera, energetic pacing, captions with highlighted keywords in brand colors.",
  },
  {
    id: "lifestyle-loop",
    title: "Lifestyle loop",
    description: "Seamless loop featuring product-in-use moments for paid social.",
    prompt:
      "Looping montage of diverse people using the product outdoors during golden hour, gentle camera dolly, brand gradients in background bokeh, end with animated logo lockup.",
  },
];

export function PromptTemplates({
  templates = defaultTemplates,
  onSelect,
}: {
  templates?: PromptTemplate[];
  onSelect?: (template: PromptTemplate) => void;
}) {
  const [activeId, setActiveId] = useState<string>(templates[0]?.id ?? "");

  const activeTemplate = templates.find((template) => template.id === activeId);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Prompt templates</h2>
          <p className="text-sm text-slate-400">Starter language to accelerate generations.</p>
        </div>
        <SparklesIcon className="h-5 w-5 text-brand-500" />
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => {
              setActiveId(template.id);
              onSelect?.(template);
            }}
            className={clsx(
              "rounded-xl border p-4 text-left transition",
              activeId === template.id
                ? "border-brand-500 bg-brand-500/15 text-white"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
            )}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              {template.title}
            </p>
            <p className="mt-2 text-xs text-slate-400">{template.description}</p>
          </button>
        ))}
      </div>
      {activeTemplate ? (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active prompt
            </p>
            <p className="text-sm leading-relaxed text-slate-200">
              {activeTemplate.prompt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect?.(activeTemplate)}
            className="inline-flex items-center gap-2 rounded-full border border-brand-500/70 bg-brand-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-100 transition hover:bg-brand-500/20"
          >
            <SparklesIcon className="h-4 w-4" /> Generate with template
          </button>
        </div>
      ) : null}
    </section>
  );
}
