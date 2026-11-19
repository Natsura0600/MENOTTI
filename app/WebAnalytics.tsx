"use client";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Estadísticas de visitas (Vercel Web Analytics). Sin cookies ni datos personales.
 * - El panel del complejo no se cuenta: así las visitas son solo de clientes.
 * - De los comprobantes se manda solo "/reserva": la dirección real lleva el código secreto de la reserva.
 */
function clean(e: BeforeSendEvent): BeforeSendEvent | null {
  const u = new URL(e.url);
  if (u.pathname.startsWith("/panel")) return null;
  if (u.pathname.startsWith("/reserva/")) return { ...e, url: `${u.origin}/reserva` };
  return e;
}

export default function WebAnalytics() {
  return <Analytics beforeSend={clean} />;
}
