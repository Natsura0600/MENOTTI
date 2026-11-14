/** Helpers que sirven tanto en el servidor como en el navegador */

/** Pasa un teléfono argentino como lo escribe la gente al formato de WhatsApp (54911...) */
export function toWa(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("54")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return "549" + d;
}

export function waLink(number: string, text?: string) {
  return `https://wa.me/${toWa(number)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("es-AR");

export async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Algo salió mal. Probá de nuevo.");
  return j as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal.");
