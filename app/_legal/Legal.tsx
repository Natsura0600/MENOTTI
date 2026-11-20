import Link from "next/link";
import type { Config } from "@/lib/types";
import { waLink } from "@/lib/util";

/** Fecha de la última revisión de los textos legales. Cambiarla cuando se modifique el contenido. */
export const LEGAL_UPDATED = "20 de noviembre de 2026";

/** Quién es el responsable, armado con los datos que el dueño carga en el panel */
export function titular(c: Config) {
  const who = c.legalName || c.name;
  return { who, cuit: c.cuit, address: c.address };
}

/** Cómo contactar al complejo: WhatsApp y/o email, lo que esté cargado */
export function Contacto({ c, motivo }: { c: Config; motivo: string }) {
  const wa = c.whatsapp ? waLink(c.whatsapp, motivo) : "";
  if (!wa && !c.email) return <>en el complejo</>;
  return (
    <>
      {wa && <a href={wa} target="_blank" rel="noopener">por WhatsApp</a>}
      {wa && c.email && " o "}
      {c.email && <a href={`mailto:${c.email}`}>por email a {c.email}</a>}
    </>
  );
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="wrap doc">
      <Link href="/" className="back">← Volver al inicio</Link>
      <h1 className="title">{title}</h1>
      <p className="upd">Última actualización: {LEGAL_UPDATED}</p>
      {children}
    </main>
  );
}
