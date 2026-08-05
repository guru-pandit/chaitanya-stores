import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#fbf3e7",
    theme_color: "#4a1418",
    icons: [
      { src: "/icons/android-icon-36x36.png", sizes: "36x36", type: "image/png", purpose: "any" },
      { src: "/icons/android-icon-48x48.png", sizes: "48x48", type: "image/png", purpose: "any" },
      { src: "/icons/android-icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/android-icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/android-icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/android-icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };
}
