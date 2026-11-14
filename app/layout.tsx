import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M10 Canchas de Fútbol · Reservá tu cancha",
  description: "Alquiler de canchas de fútbol 5, 7, 9 y 11. Reservá tu turno online en un minuto.",
};
export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
