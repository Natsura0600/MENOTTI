import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Caché de lecturas. Lo que casi no cambia (configuración, canchas, turnos de un día, etc.) se guarda
 * en la caché de Vercel y solo se vuelve a leer de Upstash cuando alguien lo modifica.
 * Así la web pública y el sondeo del panel prácticamente no gastan comandos.
 *
 * Importante: las escrituras (reservar, cancelar, guardar) SIEMPRE leen directo de la base.
 */
export const TAG = {
  site: "site",
  fijos: "fijos",
  live: "live",
  auth: "auth",
  products: "products",
  day: (date: string) => `day-${date}`,
};

/** Lee con caché. `seconds` es solo una red de seguridad: lo normal es que se invalide con bust(). */
export function cached<T>(key: string[], tags: string[], seconds: number, fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, key, { tags, revalidate: seconds })();
}

/** Marca como viejo lo guardado con esas etiquetas: la próxima lectura va a la base */
export function bust(...tags: string[]) {
  for (const t of tags) {
    try {
      revalidateTag(t);
    } catch {
      // fuera de un pedido (ej: durante el build) no hay nada que invalidar
    }
  }
}
