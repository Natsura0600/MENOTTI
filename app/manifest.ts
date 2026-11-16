import type { MetadataRoute } from "next";
import { getSite } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Permite a los clientes instalar el sitio en el celular como si fuera una app */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { config } = await getSite();
  return {
    id: "/",
    name: config.name,
    short_name: config.name.split(" ")[0] || config.name,
    description: config.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
