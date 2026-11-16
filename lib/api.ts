import { NextResponse } from "next/server";
import { getRole } from "./auth";
import { BookingError } from "./data";
import { kv } from "./kv";
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
 * Devuelve true si hay que rechazar el pedido.
 */
export async function tooMany(req: Request, bucket: string, max: number, seconds: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sin-ip";
  const key = `rl:${bucket}:${ip}:${Math.floor(Date.now() / (seconds * 1000))}`;
  const n = Number((await kv.get<number>(key)) ?? 0);
  if (n >= max) return true;
  await kv.set(key, n + 1, { ex: seconds });
  return false;
}
