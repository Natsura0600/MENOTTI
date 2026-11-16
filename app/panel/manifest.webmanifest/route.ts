import { getSite } from "@/lib/data";

export const dynamic = "force-dynamic";

/** App del complejo: al instalarla desde /panel abre directo la agenda y recibe los avisos de reservas */
export async function GET() {
  const { config } = await getSite();
  const short = config.name.split(" ")[0] || "Panel";
  return Response.json(
    {
      id: "/panel",
      name: `${short} · Turnos`,
      short_name: `${short} Turnos`,
      description: `Agenda y caja de ${config.name}`,
      start_url: "/panel",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0a0a0a",
      theme_color: "#0a0a0a",
      lang: "es-AR",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
