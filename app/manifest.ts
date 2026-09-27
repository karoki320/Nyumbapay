import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NyumbaPay", short_name: "NyumbaPay", start_url: "/dashboard", display: "standalone",
    background_color: "#ffffff", theme_color: "#0f5132",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
