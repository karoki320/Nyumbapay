import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Flash } from "@/components/flash";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "NyumbaPay", template: "%s · NyumbaPay" },
  description: "Rent collection and M-Pesa reconciliation for Kenyan landlords.",
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
