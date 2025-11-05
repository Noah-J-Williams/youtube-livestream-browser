import type { Metadata } from "next";
import "@/styles/globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "YouTube Livestream Browser",
    template: "%s | YouTube Livestream Browser",
  },
  description:
    "Discover and watch live YouTube streams with a Twitch-style multiview, smart audio controls, and Supabase-powered accounts.",
  metadataBase: new URL("https://youtube-livestream-browser.example.com"),
  openGraph: {
    title: "YouTube Livestream Browser",
    description:
      "Browse, combine, and follow live YouTube streams with smart audio balancing and personalized layouts.",
    url: "https://youtube-livestream-browser.example.com",
    siteName: "YouTube Livestream Browser",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "YouTube Livestream Browser",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YouTube Livestream Browser",
    description:
      "Twitch-style browsing for YouTube Live with multiview, alerts, and Pro subscriptions.",
    creator: "@ytlivebrowser",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-[radial-gradient(circle_at_top,#1f2937,rgba(15,23,42,0.95))] pb-16">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
