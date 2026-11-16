import type { MetadataRoute } from "next";
import { getSite } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Permite "instalar" el sitio en el celular como si fuera una app */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { config } = await getSite();
  return {
    name: config.name,
    short_name: config.name.split(" ")[0] || config.name,
    description: config.description,
    start_url: "/",
    display: "standalone",
    background_color: "#07090a",
    theme_color: "#07090a",
    lang: "es-AR",
    icons: [{ src: "/icon.png", sizes: "320x320", type: "image/png", purpose: "any" }],
  };
}
