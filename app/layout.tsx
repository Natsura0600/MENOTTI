import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { getSiteCached, indexable, siteUrl } from "@/lib/site";
import { TIPOS } from "@/lib/types";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], style: ["italic"], variable: "--font-display", display: "swap" });

/** Título y descripción salen de lo que el dueño carga en el panel: el SEO se mantiene solo */
export async function generateMetadata(): Promise<Metadata> {
  const { config, courts } = await getSiteCached();
  const tipos = TIPOS.filter((t) => courts.some((c) => c.active && c.tipo === t));
  const formatos = tipos.length ? `fútbol ${tipos.join(", ").replace(/, (\d+)$/, " y $1")}` : "fútbol";
  const title = `${config.name} · Alquiler de canchas de ${formatos}`;
  const base = config.description || `Alquiler de canchas de ${formatos}.`;
  const description = [base, config.address ? `Estamos en ${config.address}.` : "", /reserv/i.test(base) ? "" : "Reservá online en 1 minuto."].filter(Boolean).join(" ").slice(0, 300);
  const ok = indexable();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s · ${config.name}` },
    description,
    applicationName: config.name,
    keywords: ["alquiler de canchas", "canchas de fútbol", ...tipos.map((t) => `cancha de fútbol ${t}`), "reservar cancha online", "turnos de fútbol", config.name],
    robots: ok ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } } : { index: false, follow: false },
    openGraph: { title, description, url: "/", siteName: config.name, type: "website", locale: "es_AR" },
    twitter: { card: "summary_large_image", title, description },
    formatDetection: { telephone: false },
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}
export const viewport: Viewport = { themeColor: "#07090a", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a href="#contenido" className="skip">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
