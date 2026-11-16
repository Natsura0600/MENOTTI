import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { bust, cached, TAG } from "./cache";
import { kv } from "./kv";
import { newToken } from "./data";
import type { Role } from "./types";

const COOKIE = "m10_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 días

/**
 * Contraseñas del panel (guardadas cifradas). sv sube al cambiarlas y cierra las otras sesiones.
 * hash/sv son del dueño (ve todo); staff es el empleado (solo turnos y caja de cada turno).
 */
export type Auth = { hash: string; sv: number; staff?: { hash: string; sv: number } };
/** Directo de la base: para iniciar sesión y cambiar contraseñas */
export const getAuthFresh = () => kv.get<Auth>("auth");
/** Desde la caché: para verificar la sesión en cada pedido sin gastar comandos */
export const getAuth = () => cached(["auth"], [TAG.auth], 86400, async () => (await getAuthFresh()) ?? null);
export async function saveAuth(a: Auth, opts?: { nx?: boolean }) {
  const done = await kv.set("auth", a, opts);
  bust(TAG.auth);
  return done;
}

let secretBytes: Uint8Array | null = null;
/** Clave para firmar sesiones: AUTH_SECRET si existe; si no, se genera sola y queda guardada en la base. */
async function secret() {
  if (secretBytes) return secretBytes;
  let s: string | null = process.env.AUTH_SECRET ?? null;
  if (!s) {
    s = await cached(["secret"], [TAG.secret], 86400 * 30, async () => {
      let v = await kv.get<string>("secret");
      if (!v) {
        await kv.set("secret", "s_" + newToken() + newToken(), { nx: true });
        v = await kv.get<string>("secret");
      }
      return v;
    });
  }
  secretBytes = new TextEncoder().encode(String(s));
  return secretBytes;
}

export async function createSession(sv: number, role: Role = "admin") {
  const token = await new SignJWT({ sv, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(await secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Devuelve la versión de sesión si la cookie es válida */
export async function getSession(): Promise<{ sv: number; role: Role } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    // Las sesiones anteriores a los dos usuarios no traen rol: eran todas del dueño
    return { sv: Number(payload.sv ?? 0), role: payload.role === "staff" ? "staff" : "admin" };
  } catch {
    return null;
  }
}

/** Rol de quien está usando el panel, o null si no hay sesión válida con la contraseña actual */
export async function getRole(): Promise<Role | null> {
  const s = await getSession();
  if (!s) return null;
  const a = await getAuth();
  if (!a) return null;
  if (s.role === "staff") return a.staff && a.staff.sv === s.sv ? "staff" : null;
  return a.sv === s.sv ? "admin" : null;
}
export const isAdmin = async () => (await getRole()) === "admin";
