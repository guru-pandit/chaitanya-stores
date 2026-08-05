import type { Metadata, Viewport } from "next";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { siteConfig } from "@/lib/site-config";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialogHost } from "@/components/ui/ConfirmDialogHost";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-worksans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "Chaitanya Stores — Incense & Pooja Essentials",
    template: "%s | Chaitanya Stores",
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: "Chaitanya Stores — Incense & Pooja Essentials",
    description: siteConfig.description,
    url: siteConfig.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Chaitanya Stores — Incense & Pooja Essentials",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  // Referenced separately from the icon.png/apple-icon.png/favicon.ico file
  // conventions (auto-linked by Next) — browserconfig.xml only covers the
  // legacy Windows/IE pinned-tile icons, which Next has no convention for.
  other: {
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#4a1418",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${workSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased bg-cream text-charcoal">
        {children}
        <Toaster />
        <ConfirmDialogHost />
      </body>
    </html>
  );
}
