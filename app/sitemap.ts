import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pathproof.in";
  const now = new Date();
  return [
    { url: base + "/", lastModified: now },
    { url: base + "/colleges", lastModified: now },
    { url: base + "/methodology", lastModified: now },
    { url: base + "/data", lastModified: now },
    { url: base + "/start", lastModified: now },
  ];
}
