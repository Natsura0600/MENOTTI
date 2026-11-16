import { ImageResponse } from "next/og";
import { getSite } from "@/lib/data";
import { TIPOS } from "@/lib/types";

export const dynamic = "force-dynamic";
export const alt = "Reservá tu cancha online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen que se ve al compartir el sitio por WhatsApp, Instagram, etc. */
export default async function Image() {
  const { config, courts } = await getSite();
  const tipos = TIPOS.filter((t) => courts.some((c) => c.active && c.tipo === t));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #07090a 0%, #0b2416 60%, #0f3a22 100%)", color: "#f3f6f4", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#22c55e", marginRight: 16 }} />
          {config.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1.02, textTransform: "uppercase", maxWidth: 980 }}>{config.slogan || "Reservá tu cancha online"}</div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 34, color: "#b7c7be" }}>{`${tipos.length ? `Fútbol ${tipos.join(" · ")}` : "Canchas de fútbol"} — reservá online en 1 minuto`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", background: "#22c55e", color: "#03140a", fontSize: 30, fontWeight: 800, padding: "18px 34px", borderRadius: 16, textTransform: "uppercase" }}>Reservar cancha</div>
          {config.address ? <div style={{ display: "flex", fontSize: 28, color: "#b7c7be" }}>{config.address}</div> : null}
        </div>
      </div>
    ),
    size,
  );
}
