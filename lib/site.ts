import { cache } from "react";
import { getSite } from "./data";
import { hm } from "./time";
import { toWa } from "./util";
import type { Config, Court } from "./types";

/** Configuración y canchas, leídas una sola vez por pedido (metadatos + página comparten la lectura) */
export const getSiteCached = cache(getSite);

/** Dirección pública del sitio. Se puede fijar con SITE_URL (ej: https://www.midominio.com.ar) */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Solo el sitio real se indexa: las previews y el desarrollo local quedan fuera de Google */
export const indexable = () => !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";

export type Faq = { q: string; a: string };

export function buildFaqs(config: Config): Faq[] {
  const out: Faq[] = [
    { q: "¿Cómo reservo una cancha?", a: "Elegís el tamaño de la cancha, el día y el horario, dejás tu nombre y tu WhatsApp, y listo: la reserva queda confirmada en el momento." },
  ];
  if (config.bookingNote) out.push({ q: "¿Cómo se paga el turno?", a: config.bookingNote });
  out.push(
    {
      q: "¿Puedo cancelar mi reserva?",
      a: `Sí. Desde la página de tu reserva podés cancelar hasta ${config.cancelHours} ${config.cancelHours === 1 ? "hora" : "horas"} antes del turno. Con menos tiempo, escribinos por WhatsApp.`,
    },
    { q: "¿Con cuánta anticipación puedo reservar?", a: `Podés reservar desde hoy y hasta ${config.daysAhead} días para adelante.` },
    { q: "¿Cuántos turnos puedo reservar por día?", a: "Hasta 2 turnos por día desde la web. Si necesitás más (torneos, eventos), escribinos por WhatsApp." },
  );
  return out;
}

/** Datos estructurados para Google (negocio local deportivo + preguntas frecuentes) */
export function buildJsonLd(config: Config, courts: Court[], faqs: Faq[]) {
  const url = siteUrl();
  const active = courts.filter((c) => c.active);
  const prices = active.flatMap((c) => [c.priceDay, c.priceNight]).filter((p) => p > 0);
  const open = active.length ? Math.min(...active.map((c) => c.open)) : null;
  const close = active.length ? Math.max(...active.map((c) => c.close)) : null;
  const business: Record<string, unknown> = {
    "@type": "SportsActivityLocation",
    "@id": `${url}/#negocio`,
    name: config.name,
    description: config.description || undefined,
    url,
    image: `${url}/opengraph-image`,
    logo: config.logoV ? `${url}/api/img/logo?v=${config.logoV}` : `${url}/logo.png`,
    sport: "Fútbol",
    currenciesAccepted: "ARS",
  };
  if (config.whatsapp) business.telephone = "+" + toWa(config.whatsapp);
  if (config.address) {
    business.address = { "@type": "PostalAddress", streetAddress: config.address, addressCountry: "AR" };
    business.hasMap = config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`;
  }
  if (config.instagram) business.sameAs = [`https://instagram.com/${config.instagram}`];
  if (prices.length) business.priceRange = `$${Math.min(...prices).toLocaleString("es-AR")} - $${Math.max(...prices).toLocaleString("es-AR")}`;
  if (open !== null && close !== null) {
    business.openingHoursSpecification = {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: hm(open),
      closes: close >= 1440 ? "23:59" : hm(close),
    };
  }
  if (config.open) {
    business.potentialAction = { "@type": "ReserveAction", target: `${url}/#reservar`, name: "Reservar cancha" };
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      business,
      { "@type": "WebSite", "@id": `${url}/#web`, url, name: config.name, inLanguage: "es-AR" },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
}
