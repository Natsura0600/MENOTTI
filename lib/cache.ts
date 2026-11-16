import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Caché de lecturas. Lo que casi no cambia (configuración, canchas, turnos de un día, etc.) se guarda
 * en la caché de Vercel y solo se vuelve a leer de Upstash cuando alguien lo modifica.
 * Así la web pública y el sondeo del panel prácticamente no gastan comandos.
 *
 * Importante: las escrituras (reservar, cancelar, guardar) SIEMPRE leen directo de la base.
 */
/** Si cambia, toda la caché anterior queda sin uso (se usa al cambiar el formato de lo guardado) */
const NS = "c3";

export const TAG = {
  all: "todo",
  site: "site",
  fijos: "fijos",
  live: "live",
  auth: "auth",
  products: "products",
  push: "push",
  last: "last",
  secret: "secret",
  day: (date: string) => `day-${date}`,
  caja: (date: string) => `caja-${date}`,
};

/** Lee con caché. `seconds` es solo una red de seguridad: lo normal es que se invalide con bust(). */
export function cached<T>(key: string[], tags: string[], seconds: number, fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, [NS, ...key], { tags: [TAG.all, ...tags], revalidate: seconds })();
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

/** Descarta TODA la caché: lo próximo que se muestre sale directo de la base */
export const bustAll = () => bust(TAG.all);
