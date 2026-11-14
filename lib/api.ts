import { NextResponse } from "next/server";
import { isAdmin } from "./auth";
import { BookingError } from "./data";

export const ok = (data: unknown = { ok: true }) => NextResponse.json(data);
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Devuelve una respuesta de error si no hay sesión de administrador */
export async function denied() {
  return (await isAdmin()) ? null : fail("Tenés que iniciar sesión.", 401);
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
