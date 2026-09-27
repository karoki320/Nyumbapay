import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Flash } from "@/components/flash";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "NyumbaPay", template: "%s · NyumbaPay" },
  description: SITE.description,
  openGraph: { siteName: "NyumbaPay", locale: "en_KE", type: "website" },
  twitter: { card: "summary_large_image" },
  applicationName: "NyumbaPay",
  appleWebApp: { capable: true, title: "NyumbaPay", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0f5132", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Suspense><Flash /></Suspense>
      </body>
    </html>
  );
}
