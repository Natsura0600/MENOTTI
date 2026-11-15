import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "M10 Canchas de Fútbol · Reservá tu cancha",
  description: "Alquiler de canchas de fútbol 5, 7, 9 y 11. Reservá tu turno online en un minuto.",
  openGraph: {
    title: "M10 Canchas de Fútbol",
    description: "Reservá tu cancha online en un minuto. Fútbol 5, 7, 9 y 11.",
    type: "website",
    locale: "es_AR",
  },
};
export const viewport: Viewport = { themeColor: "#07090a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
