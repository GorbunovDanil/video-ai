"use client";

import { useState } from "react";
import { PlusIcon, UploadIcon } from "lucide-react";
import clsx from "clsx";

export type CreativeBriefValues = {
  brandColors: string[];
  valueProposition: string;
  targetAudience: string;
  style: string;
  format: string;
  assetSource: "uploadthing" | "s3";
  assetReferences: string[];
};

const DEFAULT_VALUES: CreativeBriefValues = {
  brandColors: ["#2563EB", "#0EA5E9"],
  valueProposition: "Crystal-clear hydration for active lifestyles.",
  targetAudience: "Health-conscious millennials and Gen Z fitness enthusiasts",
  style: "Vibrant lifestyle photography",
  format: "1080x1350 portrait",
  assetSource: "uploadthing",
  assetReferences: [""],
};

export function CreativeBriefForm({
  initialValues = DEFAULT_VALUES,
  onChange,
  title = "Creative Brief",
  description = "Capture your brand identity and campaign requirements to prime the generators.",
}: {
  initialValues?: CreativeBriefValues;
  onChange?: (values: CreativeBriefValues) => void;
  title?: string;
  description?: string;
}) {
  const [values, setValues] = useState<CreativeBriefValues>(initialValues);

  const updateValues = (partial: Partial<CreativeBriefValues>) => {
    const next = { ...values, ...partial };
    setValues(next);
    onChange?.(next);
  };

  const updateBrandColor = (index: number, color: string) => {
    const brandColors = values.brandColors.map((c, i) => (i === index ? color : c));
    updateValues({ brandColors });
  };

  const addBrandColor = () => {
    updateValues({ brandColors: [...values.brandColors, "#ffffff"] });
  };

  const updateAssetReference = (index: number, ref: string) => {
    const assetReferences = values.assetReferences.map((r, i) => (i === index ? ref : r));
    updateValues({ assetReferences });
  };

  const addAssetReference = () => {
    updateValues({ assetReferences: [...values.assetReferences, ""] });
  };

  return (
    <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner shadow-slate-950">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">Brand colors</label>
          <p className="text-xs text-slate-400">
            Add the primary hex codes that should persist across every asset.
          </p>
          <div className="flex flex-col gap-3">
            {values.brandColors.map((color, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => updateBrandColor(index, event.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-700 bg-transparent"
                  aria-label={`Brand color ${index + 1}`}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(event) => updateBrandColor(index, event.target.value)}
                  className="flex-1 rounded-lg border border-slate-800 px-3 py-2 text-sm uppercase tracking-wide"
                  placeholder="#2563EB"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addBrandColor}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-800 px-3 py-2 text-xs uppercase tracking-wide text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <PlusIcon className="h-4 w-4" /> Add color
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">Value proposition</label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              value={values.valueProposition}
              onChange={(event) => updateValues({ valueProposition: event.target.value })}
              placeholder="Highlight the product benefit that should headline the creative."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">Target audience</label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              value={values.targetAudience}
              onChange={(event) => updateValues({ targetAudience: event.target.value })}
              placeholder="Demographics, psychographics, or intents to align messaging with."
            />
          </div>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">Style direction</label>
          <select
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
            value={values.style}
            onChange={(event) => updateValues({ style: event.target.value })}
          >
            <option>Vibrant lifestyle photography</option>
            <option>Minimal product render</option>
            <option>Moody cinematic lighting</option>
            <option>Playful collage</option>
            <option>UGC storyteller</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">Output format</label>
          <select
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
            value={values.format}
            onChange={(event) => updateValues({ format: event.target.value })}
          >
            <option>1080x1350 portrait</option>
            <option>1920x1080 landscape</option>
            <option>1080x1080 square</option>
            <option>9:16 vertical video</option>
            <option>15s story clip</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        <span className="block text-sm font-medium text-slate-200">Product assets</span>
        <div className="flex flex-wrap gap-3 text-sm">
          {(["uploadthing", "s3"] as const).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => updateValues({ assetSource: source })}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 capitalize transition",
                values.assetSource === source
                  ? "border-brand-500 bg-brand-500/20 text-brand-100"
                  : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600"
              )}
            >
              <UploadIcon className="h-4 w-4" />
              {source === "s3" ? "Link S3 bucket" : "UploadThing"}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Paste URLs from your asset storage or trigger a direct upload flow.
        </p>
        <div className="flex flex-col gap-3">
          {values.assetReferences.map((reference, index) => (
            <input
              key={index}
              type="url"
              value={reference}
              onChange={(event) => updateAssetReference(index, event.target.value)}
              placeholder="https://cdn.yourbrand.com/products/hero.png"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
            />
          ))}
          <button
            type="button"
            onClick={addAssetReference}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs uppercase tracking-wide text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <PlusIcon className="h-4 w-4" /> Add asset reference
          </button>
        </div>
      </div>
    </section>
  );
}
