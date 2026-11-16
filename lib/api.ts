import { NextResponse } from "next/server";
import { getRole } from "./auth";
import { BookingError } from "./data";
import type { Role } from "./types";

export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/**
 * Devuelve una respuesta de error si quien llama no tiene permiso.
 * Por defecto exige al dueño; con "staff" también deja pasar al empleado.
 */
export async function denied(min: Role = "admin") {
  const role = await getRole();
  if (!role) return fail("Tenés que iniciar sesión.", 401);
  if (min === "admin" && role !== "admin") return fail("Eso solo lo puede hacer el dueño.", 403);
  return null;
}

export function handle(e: unknown) {
  if (e instanceof BookingError) return fail(e.message, 409);
  console.error(e);
  return fail("Algo salió mal. Probá de nuevo en un momento.", 500);
}

export const cleanPhone = (s: unknown) => String(s ?? "").replace(/\D/g, "").slice(0, 15);
export const str = (s: unknown, max = 120) => String(s ?? "").trim().slice(0, max);
export const int = (n: unknown, min: number, max: number, def: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
};

/**
 * Límite simple por IP para frenar bots: como mucho `max` pedidos cada `seconds`.
 * Se lleva en la memoria del servidor (no gasta comandos de la base). Devuelve true si hay que rechazar.
 * El freno de fondo sigue siendo el máximo de 2 turnos por teléfono por día, que sí se controla en la base.
 */
const hits = new Map<string, { n: number; until: number }>();
export function tooMany(req: Request, bucket: string, max: number, seconds: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sin-ip";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  if (hits.size > 5000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
  const h = hits.get(key);
  if (!h || h.until < now) {
    hits.set(key, { n: 1, until: now + seconds * 1000 });
    return false;
  }
  h.n++;
  return h.n > max;
}
