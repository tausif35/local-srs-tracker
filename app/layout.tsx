import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "SRS Tracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <a href="#main-content" className="sr-only z-50 rounded bg-white px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
