import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/blog"], disallow: ["/admin", "/invite/", "/dashboard", "/units", "/invoices", "/payments", "/settings", "/onboarding", "/pay/", "/api/", "/auth/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
