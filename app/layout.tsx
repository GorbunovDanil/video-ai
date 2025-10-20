import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video AI Studio",
  description:
    "Generate on-brand image and video ads with reusable templates and export presets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
