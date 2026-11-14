import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { kv } from "./kv";
import { newToken } from "./data";

const COOKIE = "m10_session";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 días

/** Contraseña del panel (guardada cifrada). sv sube al cambiarla y cierra las otras sesiones. */
export type Auth = { hash: string; sv: number };
export const getAuth = () => kv.get<Auth>("auth");

let cached: Uint8Array | null = null;
/** Clave para firmar sesiones: AUTH_SECRET si existe; si no, se genera sola y queda guardada en la base. */
async function secret() {
  if (cached) return cached;
  let s: string | null = process.env.AUTH_SECRET ?? null;
  if (!s) {
    s = await kv.get<string>("secret");
    if (!s) {
      await kv.set("secret", "s_" + newToken() + newToken(), { nx: true });
      s = await kv.get<string>("secret");
    }
  }
  cached = new TextEncoder().encode(String(s));
  return cached;
}

export async function createSession(sv: number) {
  const token = await new SignJWT({ sv }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(await secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Devuelve la versión de sesión si la cookie es válida */
export async function getSession(): Promise<{ sv: number } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return { sv: Number(payload.sv ?? 0) };
  } catch {
    return null;
  }
}

/** Sesión válida y con la contraseña actual */
export async function isAdmin() {
  const s = await getSession();
  if (!s) return false;
  const a = await getAuth();
  return !!a && a.sv === s.sv;
}
