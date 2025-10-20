import { ExportPresetSelector } from "@/components/export-preset-selector";
import { VariantGrid } from "@/components/variant-grid";

const galleryVariants = [
  {
    id: "hydration-lifestyle",
    title: "Lifestyle hydration",
    description: "Vibrant outdoor shoot highlighting refreshing hydration moments.",
    type: "image" as const,
    aspect: "4:5",
  },
  {
    id: "product-detail",
    title: "Product detail",
    description: "Macro glass bottle shot with animated sparkle overlay.",
    type: "image" as const,
    aspect: "1:1",
  },
  {
    id: "creator-testimonial",
    title: "Creator testimonial",
    description: "Creator-led breakdown of benefits with captions and CTA bumper.",
    type: "video" as const,
    aspect: "9:16",
  },
  {
    id: "retail-loop",
    title: "Retail loop",
    description: "In-store shelf loop with price callout and promo badge.",
    type: "video" as const,
    aspect: "16:9",
  },
];

export default function GalleryPage() {
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
      <VariantGrid variants={galleryVariants} enablePlayback />
      <ExportPresetSelector />
    </main>
  );
}
