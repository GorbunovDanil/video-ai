import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

import { Providers } from "./providers";
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
  const sessionPromise = getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <Providers session={await sessionPromise}>{children}</Providers>
      </body>
    </html>
  );
}
