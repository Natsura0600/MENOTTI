import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = siteUrl();
  return [
    { url: u + "/", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: u + "/terminos", changeFrequency: "yearly", priority: 0.2 },
    { url: u + "/privacidad", changeFrequency: "yearly", priority: 0.2 },
  ];
}
