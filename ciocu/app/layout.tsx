import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Bricolage Grotesque — warm, characterful display face for the wordmark and Ciocu's voice.
// Deliberately off the AI-slop default list (no Inter/Poppins/Playfair).
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION = "An emotionally present AI whose face is her eyes, and whose memory is yours.";

export const metadata: Metadata = {
  // Absolute base for OG/Twitter image URLs — without it Next can't turn the generated
  // opengraph-image path into the absolute URL crawlers require, and the card silently has no image.
  metadataBase: new URL("https://ciocu.app"),
  title: "Ciocu",
  description: DESCRIPTION,
  openGraph: {
    title: "Ciocu — an AI that feels present",
    description: DESCRIPTION,
    url: "https://ciocu.app",
    siteName: "Ciocu",
    type: "website",
    // og:image is supplied automatically by app/opengraph-image.tsx.
  },
  twitter: {
    // Without an explicit card type X shows the small summary card (or nothing) — this is what
    // makes it the big image card. Image is inherited from opengraph-image.tsx (X falls back to
    // og:image when twitter:image isn't set).
    card: "summary_large_image",
    title: "Ciocu — an AI that feels present",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
